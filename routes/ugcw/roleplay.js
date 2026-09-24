/*
  ==========================================================================
  UGCW - ROLEPLAY BRIDGE  (easy-api.ts 1.2.0)
  ==========================================================================
  Route : GET /ugcw/roleplay

  Forwards the turn to the Wrestle-ai server with a JSON POST to
    https://wrestle-ai-production.up.railway.app/ugcw_rp
  ($request[url;POST;object], see index.js) and returns the AI reply
  together with everything that was sent.

  QUERY PARAMETERS  (mirror the /ugcw_rp request body)
  ----------------
  userid            REQUIRED  -> user_id          conversation / memory id
  message           REQUIRED  -> message          what the opponent (user) did
  system_p          OPTIONAL  -> system_p         custom persona / system prompt
                                                  (system_prompt is accepted as an alias;
                                                  empty = wrestle-ai default Jax Nova persona)
  in_battle         OPTIONAL  -> in_battle        true | false   (default true)
  self_height       OPTIONAL  -> height           self height in CM (overrides stored value),
                                                  converted to inches for wrestle-ai
  self_weight       OPTIONAL  -> weight           self weight in KG (overrides stored value),
                                                  converted to lbs for wrestle-ai
  humanize          OPTIONAL  -> humanize         true | false   (default true)
  self_health       OPTIONAL  -> self_health      0 - 100        (default 100)
  self_trapped      OPTIONAL  -> self_trapped     true | false   (default false)
  opponent_health   OPTIONAL  -> opponent_health    0 - 100        (default 100)
  opponent_trapped  OPTIONAL  -> opponent_trapped   true | false   (default false)

  Battle-turn reads the self size from <userid>-sh / -sw (set by game-new.js)
  and the opponent size from <userid>-oh / -ow (set by move.js) and ignores
  self_height / self_weight / opponent_height / opponent_weight entirely,
  falling back to 183 / 95 / 180 / 80 when a value is not stored (size_source
  in its answer says which). This route
  also accepts optional self_height / self_weight query overrides. When
  *_health / *_trapped are not sent they are derived from the <userid>-battle-*-hp
  (as a percent of max_hp) and <userid>-battle-*-hold keys, so the route can be
  chained straight after /ugcw/battle-turn.

  The body additionally sends the opponent object { health, stamina, trapped }
  that wrestle-ai's /ugcw_rp normalizes from first (it uses
  opponent_health / opponent_trapped only as fallbacks). Both get the same
  values; stamina is 100 because the battle engine keeps no stamina state
  (the default wrestle-ai itself applies to both fighters).

  RESPONSE  (built with $createObject + $request, sent with "safe")
  --------
  {
   "status": 200,                       http status returned by wrestle-ai
   "request":  { "user_id": "...", "message": "...", "height": 72, ... },
   "response": {                        full json returned by wrestle-ai
     "response": "Jax Nova's reply text... your turn.",
     "meta": { "opponent": { "health": 100, "stamina": 100, "trapped": false } }
   }
  }

  On a wrestle-ai error "response" holds its {error, details} body and
  "status" is 4xx/5xx; when the server cannot be reached status is 0.

  NOTE: easy-api.ts executes route code from the BOTTOM line up.
  ==========================================================================
*/

module.exports = {
  path: "/ugcw/roleplay",
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
 STEP 2 - POST the object to wrestle-ai ($request body "object" = use the object)
==========================================================================]

$tryIf[$get[valid]==1;@var(status;@request(https://wrestle-ai-production.up.railway.app/ugcw_rp;POST;object))]

$ignore[==========================================================================
 STEP 1 - BUILD the request body from the collected variables
==========================================================================]

$ignore[opponent object: wrestle-ai's /ugcw_rp normalizes the opponent state
 from the opponent key first and uses opponent_health / opponent_trapped only
 as fallbacks, so both are sent with the same values. stamina is 100 because
 the battle engine keeps no stamina state, the default wrestle-ai applies.]
$setObjectKey[opponent;{"health": $get[opphp], "stamina": 100, "trapped": $get[opptrapped]}]
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

$ignore[wrestle-ai wants self size in inches / lbs, battle-turn works in cm / kg]
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

$ignore[system prompt: system_p (or system_prompt) query, empty = wrestle-ai default persona]
$var[sysp;$ternary[$getQuery[system_p]!=undefined;$getQuery[system_p];$ternary[$getQuery[system_prompt]!=undefined;$getQuery[system_prompt];]]]
$var[uid;$getQuery[userid]]

$ignore[==========================================================================
 VALIDATE: wrestle-ai rejects a missing user_id / message with 400, so we
 answer 400 ourselves and skip the POST ("valid" gates every later step)
==========================================================================]

$var[valid;$ternary[$getQuery[userid]==undefined;0;$ternary[$getQuery[message]==undefined;0;1]]]
$tryIf[$getQuery[userid]!=undefined&&$getQuery[message]==undefined;@send(400;json;{"ok":0,"error":"Missing query parameter: message"})]
$tryIf[$getQuery[userid]==undefined;@send(400;json;{"ok":0,"error":"Missing query parameter: userid"})]
  `}
