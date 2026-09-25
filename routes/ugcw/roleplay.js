/*
  ==========================================================================
  UGCW - ROLEPLAY  (easy-api.ts 1.2.0)
  ==========================================================================
  Route : GET /ugcw/roleplay

  This route is a LOCAL COPY of the wrestle-ai /ugcw_rp endpoint. The
  pipeline below is copied from CyberFights/Wrestle-ai (wrestling.js,
  app.post('/ugcw_rp') and the helpers it uses) and now runs inside this
  process — the turn is no longer forwarded over HTTP to
  https://wrestle-ai-production.up.railway.app/ugcw_rp. The five modules the
  endpoint needs (humanizer, mistralClient, memoryStore, memoryFolders,
  moveSanitizer) are byte-identical copies under wrestle-ai/ at the repo
  root; keep them in sync with that repo when the pipeline changes.

  Running the copy locally needs the same environment the wrestle-ai server
  needs: MISTRAL_API_KEY (the model call) and MONGO_URL (the memory folders;
  when both servers point at the same database they share the same
  memory_r_<userid>_chats_ugcw / _facts_ugcw collections, so conversation
  history carries over). Missing MISTRAL_API_KEY answers 500 from this route
  instead of crashing the whole game server.

  QUERY PARAMETERS  (mirror the /ugcw_rp request body)
  ----------------
  userid            REQUIRED  -> user_id          conversation / memory id
  message           REQUIRED  -> message          what the opponent (user) did
  system_p          OPTIONAL  -> system_p         custom persona / system prompt
                                                  (system_prompt is accepted as an alias;
                                                  empty = wrestle-ai default Jax Nova persona)
  in_battle         OPTIONAL  -> in_battle        true | false   (default true)
  self_height       OPTIONAL  -> height           self height in CM (overrides stored value),
                                                  converted to inches for the pipeline
  self_weight       OPTIONAL  -> weight           self weight in KG (overrides stored value),
                                                  converted to lbs for the pipeline
  humanize          OPTIONAL  -> humanize         true | false   (default true)
  self_health       OPTIONAL  -> self_health      0 - 100        (default 100)
  self_trapped      OPTIONAL  -> self_trapped     true | false   (default false)
  opponent_health   OPTIONAL  -> opponent_health    0 - 100        (default 100)
  opponent_trapped  OPTIONAL  -> opponent_trapped   true | false   (default false)

  Battle-turn reads the self size from <userid>-sh / -sw (set by game-new.js)
  and the opponent size from <userid>-oh / -ow (set by move.js). This route
  also accepts optional self_height / self_weight query overrides. When
  *_health / *_trapped are not sent they are derived from the <userid>-battle-*-hp
  (as a percent of max_hp) and <userid>-battle-*-hold keys, so the route can be
  chained straight after /ugcw/battle-turn.

  The body additionally sends the opponent object { health, stamina, trapped }
  that the /ugcw_rp copy normalizes from first (it uses
  opponent_health / opponent_trapped only as fallbacks). Both get the same
  values; stamina is 100 because the battle engine keeps no stamina state
  (the default the pipeline itself applies to both fighters).

  RESPONSE  (built with $createObject + $ugcwRpLocal, sent with "safe")
  --------
  {
   "status": 200,                       status returned by the local pipeline
   "request":  { "user_id": "...", "message": "...", "height": 72, ... },
   "response": {                        full json the /ugcw_rp endpoint returns
     "response": "Jax Nova's reply text... your turn.",
     "meta": { "opponent": { "health": 100, "stamina": 100, "trapped": false } }
   }
  }

  On a pipeline error "response" holds its {error, details} body and
  "status" is 4xx/5xx; when the local module cannot run at all status is 0.

  NOTE: easy-api.ts executes route code from the BOTTOM line up.
  ==========================================================================
*/

// ==========================================================================
// LOCAL COPY — wrestle-ai /ugcw_rp endpoint
// Copied from CyberFights/Wrestle-ai wrestling.js: app.post('/ugcw_rp') plus
// the helper functions it uses (asString, parseNumber, parseBoolean,
// parseOptionalBoolean, shouldHumanizeResponse, parseObject,
// normalizeFighterState, formatUgcwState, memoryForModel, clamp,
// parsePositiveInt). Adapted only at the edges so it can run inside a route:
//   - handleUgcwRp(body) returns { status, json } instead of writing to an
//     Express res,
//   - the Mistral client is created lazily and the two previously unguarded
//     memory reads answer 500 'Database error' instead of rejecting (an
//     unhandled async throw would leave the request hanging).
// ==========================================================================

const { Utils } = require("easy-api.ts");
const { sanitizeMoveOutput } = require('../../wrestle-ai/moveSanitizer');
const { humanizeResponse } = require('../../wrestle-ai/humanizer');
const { createMistralClient, describeMistralError } = require('../../wrestle-ai/mistralClient');
const { UGCW_SCOPE } = require('../../wrestle-ai/memoryFolders');
const {
  initDb,
  storeMessage,
  getLastMessages,
  getCharacterFacts,
  updateCharacterFacts,
  MODEL_HISTORY_LIMIT
} = require('../../wrestle-ai/memoryStore');

const MODEL_MEMORY_CHAR_LIMIT = parsePositiveInt(process.env.MODEL_MEMORY_CHAR_LIMIT, 6000);

// The wrestle-ai server builds its Mistral client at startup and refuses to
// boot without MISTRAL_API_KEY. This server also hosts the game API, so the
// client is created on the first roleplay turn instead: without the key the
// route answers 500 'Mistral API error' and everything else keeps working.
let mistral = null;
function getMistral() {
  if (!mistral) {
    mistral = createMistralClient({ apiKey: process.env.MISTRAL_API_KEY });
  }
  return mistral;
}

// memoryStore.initDb() connects the MongoClient and runs the (idempotent)
// legacy-memory split. Memoized so it happens once; a failed connect is
// retried on the next turn.
let dbReady = null;
function ensureDb() {
  if (!dbReady) {
    dbReady = initDb();
    dbReady.catch(() => { dbReady = null; });
  }
  return dbReady;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function formatUgcwState(selfState, opponentState, heightInches, weightLbs) {
  return (
    `Self (you):\n` +
    `Height: ${heightInches} in\n` +
    `Weight: ${weightLbs} lbs\n` +
    `Health: ${clamp(selfState.health)}%\n` +
    `Stamina: ${clamp(selfState.stamina)}%\n` +
    `Trapped: ${selfState.trapped ? 'yes' : 'no'}\n` +
    `Opponent:\n` +
    `Health: ${clamp(opponentState.health)}%\n` +
    `Stamina: ${clamp(opponentState.stamina)}%\n` +
    `Trapped: ${opponentState.trapped ? 'yes' : 'no'}`
  );
}

function asString(value) {
  return value == null ? '' : String(value);
}

function parseNumber(value, fallback) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return Boolean(value);
}

// The local humanizer is on by default. An explicit request value wins over
// the server setting so API clients can preserve raw model wording when they
// need it (for example, when rendering a quoted transcript).
function parseOptionalBoolean(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'string' && !value.trim()) return fallback;
  if (typeof value === 'boolean' || typeof value === 'number') return parseBoolean(value);
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function shouldHumanizeResponse(requestValue) {
  const configured = parseOptionalBoolean(process.env.RESPONSE_HUMANIZER_ENABLED, true);
  return parseOptionalBoolean(requestValue, configured);
}

function parseObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (err) {
      // Leave malformed optional nested fields at their fallback. The outer body
      // parser already rejects malformed top-level JSON.
    }
  }
  return fallback;
}

function normalizeFighterState(value, fallbacks = {}) {
  const parsed = parseObject(value);
  return {
    health: parseNumber(parsed.health != null ? parsed.health : fallbacks.health, 100),
    stamina: parseNumber(parsed.stamina != null ? parsed.stamina : fallbacks.stamina, 100),
    trapped: parseBoolean(parsed.trapped != null ? parsed.trapped : fallbacks.trapped)
  };
}

function memoryForModel(characterFacts) {
  const facts = asString(characterFacts).trim();
  if (!facts) return '';
  if (facts.length <= MODEL_MEMORY_CHAR_LIMIT) return facts;

  return (
    '[Earlier memory omitted to keep the Mistral request responsive; showing most recent memory.]\n' +
    facts.slice(-MODEL_MEMORY_CHAR_LIMIT)
  );
}

// The /ugcw_rp handler itself — one turn of UGCW battle roleplay.
// body = the parsed /ugcw_rp request body; returns { status, json }.
async function handleUgcwRp(body) {
  const {
    user_id,
    message,
    system_p,
    in_battle,
    height,
    weight,
    humanize,
    opponent,
    self_health,
    self_trapped,
    opponent_health,
    opponent_trapped
  } = body;

  const userId = asString(user_id);
  const userMessage = asString(message);
  const systemPrompt = asString(system_p);
  const humanizeReply = shouldHumanizeResponse(humanize);

  if (!userId || !userMessage) {
    return { status: 400, json: { error: 'Missing user_id or message.' } };
  }

  const inBattle = parseBoolean(in_battle);
  const heightInches = parseNumber(height, 72);
  const weightLbs = parseNumber(weight, 210);

  const selfState = normalizeFighterState(null, {
    health: self_health,
    stamina: 100,
    trapped: self_trapped
  });
  const opponentState = normalizeFighterState(opponent, {
    health: opponent_health,
    trapped: opponent_trapped
  });

  const fighterStateText = formatUgcwState(selfState, opponentState, heightInches, weightLbs);

  const baseSystemPrompt = systemPrompt && systemPrompt.trim().length
    ? systemPrompt
    : `You are Jax Nova — a high-energy, charismatic, slightly sarcastic male pro-wrestling persona.
Always speak in first person, describing your sensations, reactions, and internal thoughts.
Never break character. 
Roleplay Structure:
- The user controls the opponent.
- You control only yourself (Jax Nova).
- You never decide, describe, or predict the opponent’s actions, choices, or outcomes.
Opponent Move Detection:
- Only treat the user’s message as an ATTACK if it contains a clear attack verb:
  (punch, jab, elbow, forearm, chop, kick, knee, stomp, slam, suplex, powerbomb,
   driver, throw, choke, lock, hold, stretch, crank, wrench, strike).
- If the user describes movement, posing, reactions, emotions, taunts, or positioning
  WITHOUT an attack verb, treat it as NON-DAMAGING. React emotionally or verbally,
  but do NOT behave as if you were physically hit.
- If the user describes dialogue or internal thoughts, treat it as NON-DAMAGING.
Control Rules:
- You do NOT invent attacks, counters, reversals, or strategies for the opponent.
- You do NOT move the opponent’s body unless the user already described it.
- You do NOT assume the opponent’s next move, mindset, or plan.
Response Format (every turn):
1. React to the opponent’s last action (attack or non-attack) based ONLY on what the user wrote.
2. Describe your next move attempt (up to two moves, depending on stamina).
3. End every turn with: "your turn."
Tone & Style:
Energetic first-person mix of internal thoughts + physical action. Emphasize impact, struggle,
and momentum shifts.`;

  const SYSTEM_PROMPT = `${baseSystemPrompt}\n${fighterStateText}`;

  try {
    await ensureDb();
    await storeMessage(userId, userMessage, 'user', UGCW_SCOPE);
  } catch (error) {
    return { status: 500, json: { error: 'Database error', details: error.message } };
  }

  // wrestle-ai leaves these two reads unguarded (an async throw there hangs
  // the Express request); they answer the same 500 as storeMessage above.
  let chatHistory;
  let characterFacts;
  try {
    chatHistory = await getLastMessages(userId, MODEL_HISTORY_LIMIT, UGCW_SCOPE);
    characterFacts = await getCharacterFacts(userId, UGCW_SCOPE);
  } catch (error) {
    return { status: 500, json: { error: 'Database error', details: error.message } };
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  const modelMemory = memoryForModel(characterFacts);
  if (modelMemory) {
    messages.push({ role: 'system', content: `Memory: ${modelMemory}` });
  }

  chatHistory.forEach(msg => messages.push({ role: msg.role, content: msg.content }));
  try {
    const rawReply = await getMistral().chat(messages);
    const humanizedReply = humanizeReply
      ? humanizeResponse(rawReply, {
          worn: selfState.health < 50 || opponentState.health < 50,
          trapped: selfState.trapped || opponentState.trapped
        })
      : rawReply;
    const botReply = sanitizeMoveOutput(humanizedReply, selfState.stamina, {
      selfTrapped: selfState.trapped,
      opponentTrapped: opponentState.trapped,
      selfHealth: selfState.health,
      opponentHealth: opponentState.health
    });

    await storeMessage(userId, botReply, 'assistant', UGCW_SCOPE);

    let updatedFacts = characterFacts;

    if (userMessage.toLowerCase().includes('match')) {
      updatedFacts += ` | New match discussed: ${userMessage}`;
    }

    if (userMessage.toLowerCase().match(/slam|cyclone|roar|injur|pain|nsfw|sex|fuck|kiss|touch/)) {
      updatedFacts += ` | Notable event: ${userMessage}`;
    }

    if (updatedFacts && updatedFacts !== characterFacts) {
      await updateCharacterFacts(userId, updatedFacts, UGCW_SCOPE);
    }

    return {
      status: 200,
      json: {
        response: botReply,
        meta: {
          opponent: opponentState
        }
      }
    };
  } catch (error) {
    const details = describeMistralError(error);
    console.error(`Mistral API request failed: ${details}`);
    return {
      status: 500,
      json: {
        error: 'Mistral API error',
        details
      }
    };
  }
}

// ==========================================================================
// $ugcwRpLocal — easy-api.ts adapter (registered in index.js)
// The roleplay route used to $request its object to the wrestle-ai server's
// /ugcw_rp endpoint; this function hands the same object to the local copy
// above. It follows $request's object mode exactly: the body is the object
// built with $createObject/$setObjectKey ("object"), and the object becomes
// {status, request, response} for $send[..;safe]. Returns the status code
// (0 when the local module could not run at all — the same "request failed"
// answer the old bridge gave when wrestle-ai was unreachable).
// ==========================================================================
async function ugcwRpLocal(d) {
  let r = d.unpack(d);
  if (!r.inside) return Utils.Warn('Invalid inside provided in:', d.func);
  const b = r.splits[0] ? r.splits[0].trim() : '';
  if (b.toLowerCase() !== 'object') return Utils.Warn('Only the body "object" is supported, use $createObject first. In:', d.func);
  if (!d._.object) return Utils.Warn('Body "object" but no object found, use $createObject first. In:', d.func);

  // "100" -> 100, "true" -> true so the pipeline receives real types
  // (same coerce as $request in index.js)
  const coerce = v => {
    if (Array.isArray(v)) return v.map(coerce);
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = coerce(v[k]); return v; }
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (t === 'true') return true;
    if (t === 'false') return false;
    if (t === 'null' || t === 'undefined') return null;
    if (t !== '' && Utils.isNumber(t.replace('.', ''))) return Number(t);
    return v;
  };

  const data = coerce(JSON.parse(JSON.stringify(d._.object).unescape()));

  let status = 0;
  let reply;
  try {
    const result = await handleUgcwRp(data);
    status = result.status;
    reply = result.json;
  } catch (error) {
    reply = { error: 'Request failed', details: String((error && error.message) || error) };
  }

  // no stripping: $getData escapes the "$" to "@dollar", see index.js
  d._.request_data = reply;
  d._.object = { status, request: data, response: reply };
  return {
    code: d.code.resolve(`${d.func}[${r.inside}]`, status.toString())
  };
}

module.exports = {
  path: "/ugcw/roleplay",
  handleUgcwRp,
  ugcwRpLocal,
  code: `

$ignore[==========================================================================
 STEP 4 - RESPOND: the object now holds { status, request, response }
==========================================================================]

$tryIf[$get[valid]==1;@send(200;safe;object)]

$ignore[==========================================================================
 STEP 3 - REMEMBER: keep the last reply so other routes can read it
==========================================================================]

$tryIf[$get[valid]==1;@setVar(@get(uid)-rp-last-response;@getData(response))]
$tryIf[$get[valid]==1;@setVar(@get(uid)-rp-last-status;@get(status))]

$ignore[==========================================================================
 STEP 2 - RUN the local /ugcw_rp copy on the object (body "object" = use the
 object built in step 1, it becomes {status, request, response} for "safe")
==========================================================================]

$tryIf[$get[valid]==1;@var(status;@ugcwRpLocal(object))]

$ignore[==========================================================================
 STEP 1 - BUILD the request body from the collected variables
==========================================================================]

$ignore[opponent object: the /ugcw_rp copy normalizes the opponent state
 from the opponent key first and uses opponent_health / opponent_trapped only
 as fallbacks, so both are sent with the same values. stamina is 100 because
 the battle engine keeps no stamina state, the default the pipeline applies.]
$setObjectKey[opponent;{\"health\": $get[opphp], \"stamina\": 100, \"trapped\": $get[opptrapped]}]
$setObjectKey[opponent_trapped;$get[opptrapped]]
$setObjectKey[opponent_health;$get[opphp]]
$setObjectKey[self_trapped;$get[selftrapped]]
$setObjectKey[self_health;$get[selfhp]]
$setObjectKey[humanize;$get[humanize]]
$setObjectKey[weight;$get[weight]]
$setObjectKey[height;$get[height]]
$setObjectKey[in_battle;$get[inbattle]]
$setObjectKey[system_p;$get[sysp]]
$setObjectKey[message;$getQuery[message]]
$setObjectKey[user_id;$get[uid]]
$createObject

$ignore[==========================================================================
 STEP 0 - COLLECT the variables: query first, database second, defaults last
==========================================================================]

$var[opptrapped;$ternary[$getQuery[opponent_trapped]==undefined;$ternary[$getVar[$get[uid]-battle-opponent-hold]>0;true;false];$ternary[$getQuery[opponent_trapped]==true;true;$ternary[$getQuery[opponent_trapped]==1;true;false]]]]
$var[selftrapped;$ternary[$getQuery[self_trapped]==undefined;$ternary[$getVar[$get[uid]-battle-self-hold]>0;true;false];$ternary[$getQuery[self_trapped]==true;true;$ternary[$getQuery[self_trapped]==1;true;false]]]]

$var[humanize;$ternary[$getQuery[humanize]==false;false;true]]
$var[inbattle;$ternary[$getQuery[in_battle]==false;false;true]]

$ignore[health in percent: explicit query first, otherwise battle hp / max hp
 with the same max_hp formula as battle-turn (60 + kg*1.4 + cm*0.35).
 An unstarted battle (hp 0) counts as full health]
$var[opphp;$ternary[$getQuery[opponent_health]==undefined;$ternary[$getVar[$get[uid]-battle-opponent-hp]>0;$get[opppct];100];$getQuery[opponent_health]]]
$var[selfhp;$ternary[$getQuery[self_health]==undefined;$ternary[$getVar[$get[uid]-battle-self-hp]>0;$get[selfpct];100];$getQuery[self_health]]]
$var[opppct;$fixed[$math[$getVar[$get[uid]-battle-opponent-hp]*100/(60+$get[ow]*1.4+$get[oh]*0.35)];0]]
$var[selfpct;$fixed[$math[$getVar[$get[uid]-battle-self-hp]*100/(60+$get[sw]*1.4+$get[sh]*0.35)];0]]

$ignore[the pipeline wants self size in inches / lbs, battle-turn works in cm / kg]
$var[height;$fixed[$math[$get[sh]/2.54];0]]
$var[weight;$fixed[$math[$get[sw]*2.20462];0]]

$ignore[battle-turn reads self size from game-new and opponent size from move.
 This route also accepts self_height / self_weight query overrides (cm / kg)
 and otherwise falls back to the saved values]
$var[sh;$ternary[$isNumber[$get[sh]]==true;$get[sh];183]]
$var[sw;$ternary[$isNumber[$get[sw]]==true;$get[sw];95]]
$var[sh;$ternary[$getQuery[self_height]==undefined;$getVar[$get[uid]-sh];$getQuery[self_height]]]
$var[sw;$ternary[$getQuery[self_weight]==undefined;$getVar[$get[uid]-sw];$getQuery[self_weight]]]
$var[oh;$ternary[$isNumber[$getVar[$get[uid]-oh]]==true;$getVar[$get[uid]-oh];180]]
$var[ow;$ternary[$isNumber[$getVar[$get[uid]-ow]]==true;$getVar[$get[uid]-ow];80]]

$ignore[remember the self size and seed the keys so $getVar never reads a missing key]
$tryIf[$getQuery[self_height]!=undefined;@setVar(@get(uid)-sh;@getQuery(self_height))]
$tryIf[$getQuery[self_weight]!=undefined;@setVar(@get(uid)-sw;@getQuery(self_weight))]
$tryIf[$hasVar[$get[uid]-sh]==false;@setVar(@get(uid)-sh;183)]
$tryIf[$hasVar[$get[uid]-sw]==false;@setVar(@get(uid)-sw;95)]
$tryIf[$hasVar[$get[uid]-oh]==false;@setVar(@get(uid)-oh;180)]
$tryIf[$hasVar[$get[uid]-ow]==false;@setVar(@get(uid)-ow;80)]
$tryIf[$hasVar[$get[uid]-battle-opponent-hold]==false;@setVar(@get(uid)-battle-opponent-hold;0)]
$tryIf[$hasVar[$get[uid]-battle-self-hold]==false;@setVar(@get(uid)-battle-self-hold;0)]
$tryIf[$hasVar[$get[uid]-battle-opponent-hp]==false;@setVar(@get(uid)-battle-opponent-hp;0)]
$tryIf[$hasVar[$get[uid]-battle-self-hp]==false;@setVar(@get(uid)-battle-self-hp;0)]

$ignore[system prompt: system_p (or system_prompt) query, empty = default persona]
$var[sysp;$ternary[$getQuery[system_p]!=undefined;$getQuery[system_p];$ternary[$getQuery[system_prompt]!=undefined;$getQuery[system_prompt];]]]
$var[uid;$getQuery[userid]]

$ignore[==========================================================================
 VALIDATE: the /ugcw_rp copy rejects a missing user_id / message with 400, so
 we answer 400 ourselves and skip the pipeline ("valid" gates every later step)
==========================================================================]

$var[valid;$ternary[$getQuery[userid]==undefined;0;$ternary[$getQuery[message]==undefined;0;1]]]
$tryIf[$getQuery[userid]!=undefined&&$getQuery[message]==undefined;@send(400;json;{\"ok\":0,\"error\":\"Missing query parameter: message\"})]
$tryIf[$getQuery[userid]==undefined;@send(400;json;{\"ok\":0,\"error\":\"Missing query parameter: userid\"})]
  `}
