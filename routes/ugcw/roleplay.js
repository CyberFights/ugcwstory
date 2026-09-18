/*
  ==========================================================================
  UGCW - ROLEPLAY BRIDGE  (easy-api.ts 1.2.0)
  ==========================================================================
  Route : GET /ugcw/roleplay

  Forwards the turn to the Wrestle-ai server with a JSON POST to
    https://wrestle-ai-production.up.railway.app/ugcw_rp
  (custom $httpPost function, see index.js) and returns the AI reply
  together with everything that was sent.

  QUERY PARAMETERS  (mirror the /ugcw_rp request body)
  ----------------
  userid            REQUIRED  -> user_id          conversation / memory id
  message           REQUIRED  -> message          what the opponent (user) did
  system_p          OPTIONAL  -> system_p         custom persona prompt
  in_battle         OPTIONAL  -> in_battle        true | false   (default true)
  height            OPTIONAL  -> height           self height in INCHES  (default 72)
  weight            OPTIONAL  -> weight           self weight in LBS     (default 210)
  humanize          OPTIONAL  -> humanize         true | false   (default true)
  self_health       OPTIONAL  -> self_health      0 - 100        (default 100)
  self_trapped      OPTIONAL  -> self_trapped     true | false   (default false)
  opponent_health   OPTIONAL  -> opponent_health  0 - 100        (default 100)
  opponent_trapped  OPTIONAL  -> opponent_trapped true | false   (default false)

  When height / weight / *_health are not sent, the <userid>-rp-* database
  keys are used, and *_trapped falls back to the <userid>-battle-*-hold
  keys written by /ugcw/battle-turn, so both routes can be chained.

  RESPONSE  (built with $createObject + $httpPost, sent with "safe")
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
 STEP 2 - POST the object to wrestle-ai (no inline body = use the object)
==========================================================================]

$tryIf[$get[valid]==1;@var(status;@httpPost(https://wrestle-ai-production.up.railway.app/ugcw_rp))]

$ignore[==========================================================================
 STEP 1 - BUILD the request body from the collected variables
==========================================================================]

$setObjectKey[opponent_trapped;$get[opptrapped]]
$setObjectKey[opponent_health;$get[opphp]]
$setObjectKey[self_trapped;$get[selftrapped]]
$setObjectKey[self_health;$get[selfhp]]
$setObjectKey[humanize;$get[humanize]]
$setObjectKey[weight;$get[weight]]
$setObjectKey[height;$get[height]]
$setObjectKey[in_battle;$get[inbattle]]
$tryif[$getQuery[system_p]!=undefined;@setObjectKey(system_p;@getQuery(system_p))]
$setObjectKey[message;$getQuery[message]]
$setObjectKey[user_id;$get[uid]]
$createObject

$ignore[==========================================================================
 STEP 0 - COLLECT the variables: query first, database second, defaults last
==========================================================================]

$var[opptrapped;$ternary[$getQuery[opponent_trapped]==undefined;$ternary[$getVar[$get[uid]-battle-opponent-hold]>0;true;false];$ternary[$getQuery[opponent_trapped]==true;true;$ternary[$getQuery[opponent_trapped]==1;true;false]]]]
$var[selftrapped;$ternary[$getQuery[self_trapped]==undefined;$ternary[$getVar[$get[uid]-battle-self-hold]>0;true;false];$ternary[$getQuery[self_trapped]==true;true;$ternary[$getQuery[self_trapped]==1;true;false]]]]

$var[opphp;$ternary[$isNumber[$get[opphp]]==true;$get[opphp];100]]
$var[opphp;$ternary[$getQuery[opponent_health]==undefined;$getVar[$get[uid]-rp-opponent-health];$getQuery[opponent_health]]]

$var[selfhp;$ternary[$isNumber[$get[selfhp]]==true;$get[selfhp];100]]
$var[selfhp;$ternary[$getQuery[self_health]==undefined;$getVar[$get[uid]-rp-self-health];$getQuery[self_health]]]

$var[humanize;$ternary[$getQuery[humanize]==false;false;true]]
$var[inbattle;$ternary[$getQuery[in_battle]==false;false;true]]

$var[weight;$ternary[$isNumber[$get[weight]]==true;$get[weight];210]]
$var[weight;$ternary[$getQuery[weight]==undefined;$getVar[$get[uid]-rp-weight];$getQuery[weight]]]

$var[height;$ternary[$isNumber[$get[height]]==true;$get[height];72]]
$var[height;$ternary[$getQuery[height]==undefined;$getVar[$get[uid]-rp-height];$getQuery[height]]]

$ignore[seed the database keys on the first call so $getVar never reads a missing key]
$tryIf[$hasVar[$get[uid]-battle-opponent-hold]==false;@setVar(@get(uid)-battle-opponent-hold;0)]
$tryIf[$hasVar[$get[uid]-battle-self-hold]==false;@setVar(@get(uid)-battle-self-hold;0)]
$tryIf[$hasVar[$get[uid]-rp-opponent-health]==false;@setVar(@get(uid)-rp-opponent-health;100)]
$tryIf[$hasVar[$get[uid]-rp-self-health]==false;@setVar(@get(uid)-rp-self-health;100)]
$tryIf[$hasVar[$get[uid]-rp-weight]==false;@setVar(@get(uid)-rp-weight;210)]
$tryIf[$hasVar[$get[uid]-rp-height]==false;@setVar(@get(uid)-rp-height;72)]

$var[uid;$getQuery[userid]]

$ignore[==========================================================================
 VALIDATE: wrestle-ai rejects a missing user_id / message with 400, so we
 answer 400 ourselves and skip the POST ("valid" gates every later step)
==========================================================================]

$var[valid;$ternary[$getQuery[userid]==undefined;0;$ternary[$getQuery[message]==undefined;0;1]]]
$tryIf[$getQuery[userid]!=undefined&&$getQuery[message]==undefined;@send(400;json;{"ok":0,"error":"Missing query parameter: message"})]
$tryIf[$getQuery[userid]==undefined;@send(400;json;{"ok":0,"error":"Missing query parameter: userid"})]
  `}
