/*
  ==========================================================================
  UGCW - TURN BASED BATTLE ENGINE  (easy-api.ts 1.2.0)
  ==========================================================================
  Route : GET /ugcw/battle-turn

  Every call resolves ONE exchange of the fight: the fighter whose turn it is
  performs one move, damage is calculated, the health points are written to
  the database and the turn is handed over to the roleplay module. The answer
  of the ai is then read as the move of the rival and calculated a second
  time, the rival attacking and the caller defending, see AI TURN. The state
  after both halves, the answer of the opponent and the turn the opponent
  played are returned as JSON.

  QUERY PARAMETERS
  ----------------
  userid            REQUIRED  battle/save id, all state is stored under it
  self_height       REQUIRED  your height in centimeters      (50 - 300)
  self_weight       REQUIRED  your weight in kilograms        (20 - 400)
  opponent_height   OPTIONAL  rival height in centimeters     (50 - 300). The
                              rival size is normally read from the <userid>-oh
                              and <userid>-ow keys that move.js writes for the
                              opponent of the encounter, these two are only a
                              fallback for when those keys are missing, so a
                              battle can be played without move.js. A stored
                              rival always wins over a sent one
  opponent_weight   OPTIONAL  rival weight in kilograms       (20 - 400)
  move              OPTIONAL  the move used this turn (see MOVES). When it is
                              one of the listed words it wins and the turn is
                              played with it, so send it whenever the client
                              knows what it meant. When it is missing, empty or
                              a word that is not in the table, the message is
                              scanned for a move word instead (see MOVE SCAN)
                              and when the message has none either the turn is
                              played as the narrative move "none" and the damage
                              calculation is skipped. Nothing is answered with a
                              400 any more, "move_source" says which of the three
                              it was. Send none / action / react / backoff /
                              taunt for a turn that only says something
  message           REQUIRED  what you did this turn in your own words, it is
                              handed to the roleplay module as its "message"
                              and answers what the opponent replies. It is also
                              the fallback the move is read from when "move" is
                              not a known word, see MOVE SCAN for how far that
                              reading goes and where it guesses wrong
  side              OPTIONAL  self | opponent - defaults to the fighter
                              whose turn it is, sending the wrong side
                              returns 409 "out of turn"
  reset             OPTIONAL  1 | true - wipes the saved battle and starts
                              a new one at full health
  humanize          OPTIONAL  true | false - forwarded to the roleplay module
  system_p          OPTIONAL  custom persona prompt forwarded to the roleplay
                              module (system_prompt is accepted as an alias)

  MOVES - BASIC
  -------------
  move       type      style   power  acc  scaling                  recoil
  jab        swift     basic    10    95   speed difference          -
  punch      strike    basic    16    90   none, always reliable     -
  kick       strike    basic    24    82   reach (height gap)        -
  headbutt   strike    basic    20    85   toughness gap             20%
  tackle     charge    basic    30    78   momentum (weight share)   15%
  throw      grapple   basic    28    70   weight ratio              -
  guard      support   basic     0   100   cuts the next hit 55%     -
  recover    support   basic     0   100   heals 22% of max hp       -

  MOVES - PRO WRESTLING
  ---------------------
  move         type     style  power  acc  scaling                  recoil
  clothesline  charge   pro     26    80   momentum (weight share)  10%
  dropkick     swift    pro     22    76   speed difference x1.5    20%
  bodyslam     grapple  pro     30    74   weight ratio (the lift)  15%
  suplex       grapple  pro     34    70   weight ratio (the lift)  20%
  piledriver   grapple  pro     42    60   weight ratio (the lift)  30%
  pin          grapple  pro      0    55   ends the fight if the
                                          rival is at 35% hp or less

  MOVES - SUBMISSION WRESTLING
  ----------------------------
  move       type      style  power  acc  scaling                  notes
  armbar     grapple   sub     18    70   toughness gap            locks
  leglock    grapple   sub     20    68   weight ratio             locks
  choke      grapple   sub     22    66   reach (height gap)       locks
  sleeper    grapple   sub     24    64   weight ratio             locks
  escape     support   sub      0   contest none                   contested,
                                          see ESCAPE CONTEST       breaks free
                                          and heals 5% of max hp

  MOVES - NARRATIVE, NOT AN ATTACK
  --------------------------------
  move       type     style   power  acc  what it does
  none       action   none      0   100   nothing at all
  action     action   none      0   100   same record as "none"
  react      action   none      0   100   same record as "none"
  backoff    action   none      0   100   same record as "none"
  taunt      action   none      0   100   same record as "none"

  The five words are one and the same move, pick the one that reads best in
  your client, and they are also what a turn falls back to when no move word is
  found anywhere (see MOVE SCAN). Use them when the turn is a reaction, a line of dialogue, a
  trapped fighter screaming in a hold or an attempt to back off: the turn is
  played, stored and handed to the roleplay module, and mechanically it does
  nothing - no damage, no recoil, no healing, no guard, no hold, no pin. The
  fighter still loses the turn, and like every move that is not "guard" it
  drops a guard the fighter was holding. A narrative turn never touches a hold,
  not even its own: a trapped fighter who only reacts stays trapped for the
  full hold. The damage calculation is skipped for them, see SKIPPED DAMAGE. There is no distance, position or
  stamina in this engine, so "backoff" does not create space and it does not
  end the fight: a battle only ends on a knockout, a pin or reset=1. The move
  word itself never reaches wrestle-ai, only "message" does, so write what the
  fighter actually says or does into "message".

  MOVES - BRAWLING
  ----------------
  move       type      style   power  acc  scaling            recoil  notes
  haymaker   strike    brawl    32    62   none               5%      wild
  stomp      strike    brawl    22    80   weight ratio       5%      wild
  lowblow    strike    brawl    13    90   none               -       sneaky
  gouge      swift     brawl    11    88   speed difference   -       sneaky

  MOVE SCAN
  ---------
  The scan only runs when "move" is missing, empty or not one of the 28 words.
  It reads the message and picks the move out of it, in two steps:

  1. the message is lowercased and every character that is not a letter becomes
     a space, with a space in front, so a move word is only found at the start
     of a word. "I pinned him" finds pin and "I suplexed him" finds suplex,
     while "hopping", "helping" and "sleeping" do not find pin, and "dropkick"
     is never read as kick.
  2. everything in front of the FIRST move word is cut away and that one word is
     resolved, so the first move of the sentence wins and not the first move of
     a fixed list: "I escape the sleeper hold" escapes, "I taunt him and then
     suplex him" taunts, "I punch him then guard" punches.

  The words it looks for are the whole table, the 23 attacks and support moves
  plus the five narrative ones. When nothing is found the turn is played as
  "none" and the damage is skipped.

  Where the scan guesses wrong, and it will: it matches the first letters of a
  word, so "I throw a punch" throws, "I have none of your tricks" is a narrative
  turn and, worst of all, naming the move that is being done TO you reads as
  doing it yourself - "I fight the sleeper hold" attacks with a sleeper instead
  of struggling out of one. Send "move" whenever the client knows the answer,
  the query word always wins.

  STYLE RULES
  -----------
  basic   steady damage, damage variance 0.85 - 1.15
  pro     spectacle slams, big power, the user eats recoil for all of them
          except the pin, variance 0.85 - 1.15
  sub     joint locks and chokes:
            - they ignore "guard", you cannot block a lock
            - a landed lock leaves the rival in a hold for two of their
              turns, and while a fighter is held their damage is x0.75
            - hitting a rival who is already held cranks the hold, x1.35
            - "escape" is contested: it breaks the hold and heals 5% only
              when the roll beats the escape chance, on a failure the hold
              is not broken and just ticks one turn down like any other move
  brawl   wild swings, damage variance 0.70 - 1.30, the two sneaky shots
          ignore "guard" as well
  none    the narrative moves: no style rules at all, they never damage,
          never heal, never guard, never hold and never tick a hold down

  HOW HEIGHT / WEIGHT BECOME STATS
  --------------------------------
  max_hp    = 60 + weight * 1.4 + height * 0.35
  power     = weight * 0.75 + height * 0.20
  toughness = weight * 0.55 + height * 0.15
  speed     = height * 0.55 - weight * 0.25
  bmi       = weight * 10000 / (height * height)
  build     = light (bmi < 20) | balanced | heavy (bmi > 26)

  DAMAGE
  ------
  damage = power * move_scale * attack_ratio * variance * effectiveness
                 * guard_multiplier * critical * crank * hold_penalty
  attack_ratio  = 0.5 + 0.5 * (attacker.power / defender.toughness), 0.6 - 1.6
  move_scale    = the per move scaling above,                    0.7 - 1.5
  variance      = random, 0.85 - 1.15, brawling 0.70 - 1.30
  critical      = x1.6 on a 10% roll
  guard_multiplier = 0.45 when the defender guarded, 1 when the move
                     pierces the guard
  effectiveness = move type vs defender build, e.g. grapple vs light x1.25
  crank         = x1.35 for a submission on a rival who is already held
  hold_penalty  = x0.75 while the attacker is stuck in a hold

  ESCAPE CONTEST
  --------------
  "escape" is the only move that rolls against the rival instead of against a
  fixed accuracy, so a hold can actually be maintained. The escaping fighter is
  the attacker of the turn, the fighter holding the lock is the defender:

  escape_ratio = (self.weight + self.toughness) / (holder.weight + holder.toughness)
  escape_chance = 10 + 45 * escape_ratio + (self.speed - holder.speed) / 10,
                  kept inside 15 - 90

  Evenly matched fighters escape about 55% of the time, the bigger and faster
  fighter escapes more often, the smaller one less, and nobody ever escapes
  automatically or is held forever. A d100 under escape_chance breaks the hold
  and heals 5% of max hp, "outcome" is "escape" and "escape_success" is 1. On a
  failure the hold stays, ticks one turn down like it does after any other move,
  nothing is healed, "outcome" is "held" and "escape_success" is 0. The chance
  used for the roll is reported as "hit_chance" and the roll as "hit_roll".

  A hold only lasts two of the held fighter's turns, so struggling on its last
  turn frees the fighter either way: a failure there still ticks the hold down to
  zero and only the 5% healing is lost. The contest decides whether the hold is
  broken early, not whether it expires.

  Escaping while not held has nothing to break: it cannot fail, it heals the 5%
  and the turn is simply spent regrouping.

  SKIPPED DAMAGE
  --------------
  When the resolved move is one of the five narrative words the turn is not an
  attack and the damage calculation is skipped: no d100, no critical roll and no
  variance roll are made, the formula is not used, damage and recoil are 0,
  nothing is healed, no hold is applied and none is ticked down, and a guard the
  rival is holding is left alone. Every factor is reported at its neutral value
  so the response reads as the non attack it is:

    hit_roll 0   hit_chance 0   critical 1   variance 1   effectiveness 1
    attack_ratio 1   move_scale 1   guard_multiplier 1   guard_pierced 0
    crank 1   pinfall 0   escape_success 0   damage 0   recoil 0   healed 0

  "hold_penalty" still reports the real 0.75 while the fighter is held and
  "outcome" is "action". The turn is stored, the turn is handed over and the
  roleplay module is called exactly as after any other move, and the rival
  still answers with a turn of its own: a narrative turn is not a pause for
  the opponent.

  STORED KEYS (database)
  ----------------------
  <userid>-battle-self-hp        <userid>-battle-opponent-hp
  <userid>-battle-turn           <userid>-battle-round
  <userid>-battle-self-guard     <userid>-battle-opponent-guard
  <userid>-battle-self-hold      <userid>-battle-opponent-hold
  <userid>-battle-status

  What is stored is the state after the whole exchange, so the rival turn of
  step 15.6 writes over the values the own turn just wrote, see AI TURN.

  ROLEPLAY MODULE
  ---------------
  Every call, right after the damage is applied and the new health points are
  stored, the turn is handed over to the roleplay module with an internal GET

    /ugcw/roleplay?userid=..&message=..&in_battle=true&self_height=..
        &self_weight=..&self_health=..&self_trapped=..
        &opponent_health=..&opponent_trapped=..

  and the reply of the wrestle-ai opponent is part of this response:

  roleplay          full payload of the roleplay route,
                    { "status": 200, "request": {...}, "response": {...} }
  roleplay_status   http status the roleplay route answered with, 0 when it
                    could not be reached
  roleplay_text     the opponent's line, response.response, null when there is
                    no line
  roleplay_meta     response.meta, what wrestle-ai reports back about the
                    opponent (health, stamina, trapped), null when there is
                    none

  A dollar sign travels through these three fields as it is. easy-api.ts reads a
  bare dollar sign as the start of a function name even inside a value, so an
  answer carrying one - "that costs $5" is enough - used to take the rest of
  the response with it and leave it unresolved. index.js therefore escapes the
  sign to @dollar on the way in ($getQuery, $getData, $getVar) and unescapes it
  on the way out ($send, $encodeURI), which keeps a "$var" in the message or a
  "$5" in the ai reply from breaking the unpack of the route. Quotes, brackets,
  semicolons and newlines all travel through as they are, and so does every
  move word the second damage calculator scans for.

  The required stats travel the way the roleplay route reads them: the self
  size comes from self_height / self_weight, the opponent size is taken from
  the <userid>-oh / <userid>-ow keys written by move.js, health is sent as a
  percent of max_hp and a hold is sent as *_trapped, so the roleplay module
  answers the turn with the same numbers this route just stored.

  humanize defaults to true. system_p, or its system_prompt alias, is
  forwarded to the roleplay module as system_p, and when both are sent
  system_p wins. An empty or missing persona travels through as "undefined",
  wrestle-ai then receives null and answers as its own default Jax Nova
  persona. Both the persona and the message ride in the query string of the
  internal call, so keep them a line or two.

  The call is synchronous: the turn takes as long as wrestle-ai needs and the
  internal GET gives up after 150 seconds, a little over the 120 the roleplay
  route gives wrestle-ai. The roleplay call never fails the turn: if
  wrestle-ai or the roleplay route cannot be reached the fight is still played
  and stored, "roleplay_status" is 0 and "roleplay" holds the error body.

  AI TURN - THE SECOND DAMAGE CALCULATOR
  --------------------------------------
  The answer of wrestle-ai is not only text, it is played. Right after the
  internal GET comes back, response.response is scanned for a move word with
  the very same scan the message goes through (see MOVE SCAN), the move record
  is read, the dice are rolled, the formula runs and the damage is applied:
  the rival is the attacker and your fighter is the defender. "ai_turn"
  reports that half of the exchange with the fields the own turn has, plus the
  three factors that come out of the answer itself.

  The base of the rival turn is the state the own turn left behind, so a guard
  put up by this call still cuts the rival hit to 45%, a submission locked by
  this call still weakens the rival to 75%, and an escape the rival tries is
  the contested escape of step 7.5. On top of that the condition wrestle-ai
  reports in response.meta.opponent is part of the formula:

    stamina_factor  0.6 + 0.4 * stamina / 100, a tired rival hits softer
    health_factor   0.7 + 0.3 * health / 100, a hurt rival hits softer
    trapped_factor  0.75 while the rival is trapped, 1 when it is not

  Stamina and health are read as numbers and clamped into 0 - 100, anything
  that is not a number counts as 100, so a missing meta plays at full
  strength. A rival turn with no move word in the answer, or with a narrative
  one, is played as "none" and skips the damage exactly the way the own turn
  does.

  ai_turn.move_source is "reply" when a move word was found in the answer,
  "none" when the answer was narrative and the damage was skipped, and
  "unavailable" when there was no rival turn at all. ai_turn.resolved says the
  same as a number and ai_turn.reply_word is the word the scan stopped at.

  The rival turn is skipped, resolved 0 and every factor neutral, when the
  roleplay module could not be reached (roleplay_status 0), when the caller is
  the rival side itself, and when the battle is already finished. A skipped
  rival turn stores the call the way it was stored before this step existed:
  the turn goes over to the other fighter and the round stays where it is.

  One call is one exchange, so when the rival turn is played the turn goes
  back to the side that called and the round counts one up. Your fighter moves
  on every call and never has to send a turn for the rival.

  Everything the rival turn changes is stored: the health points, the guards
  and the holds of both fighters, the status, the winner, the turn and the
  round. The flat fields and the "self" / "opponent" blocks describe the state
  AFTER the exchange, while "damage", "move" and "outcome" stay the ones of
  the own turn and "ai_turn.self_hp_before_ai" / "ai_turn.opponent_hp_before_ai"
  are the health points the rival turn started from. A knockout or a successful
  pin on the rival side finishes the battle the same way it does on the own
  one, "winner" is then "opponent".

  EXAMPLES
  --------
  The client knows the move and sends it, "move_source" is "query":

  GET /ugcw/battle-turn?userid=naicul&self_height=180&self_weight=80
      &opponent_height=170&opponent_weight=60&move=suplex&message=I lift you up

  {
   "battle_id": "naicul",
   "status": "fighting",
   "winner": "none",
   "round": 2,
   "turn": "self",
   "actor": "self",
   "target": "opponent",
   "move": "suplex",
   "move_source": "query",
   "move_type": "grapple",
   "style": "pro",
   "outcome": "hit",
   "damage": 44,
   "recoil": 9,
   "healed": 0,
   "hit_roll": 31,
   "hit_chance": 70,
   "critical": 1,
   "variance": 1.04,
   "effectiveness": 1,
   "attack_ratio": 1.32,
   "move_scale": 1.33,
   "guard_multiplier": 1,
   "guard_pierced": 0,
   "crank": 1,
   "hold_penalty": 1,
   "pinfall": 0,
   "escape_success": 0,
   "self":     { "height_cm": 180, "weight_kg": 80, "bmi": 24.7,
                 "build": "balanced", "max_hp": 235, "hp_before": 235,
                 "hp": 202, "power": 96, "toughness": 71, "speed": 79,
                 "guarding": 0, "hold": 0 },
   "opponent": { "height_cm": 170, "weight_kg": 60, "bmi": 20.8,
                 "build": "balanced", "max_hp": 204, "hp_before": 204,
                 "hp": 158, "power": 79, "toughness": 58.5, "speed": 78.5,
                 "guarding": 0, "hold": 0 },
   "ai_turn": {
     "resolved": 1, "move": "clothesline", "move_source": "reply",
     "move_type": "charge", "style": "pro", "outcome": "hit",
     "damage": 24, "recoil": 2, "healed": 0, "hit_roll": 44, "hit_chance": 80,
     "critical": 1, "variance": 1.03, "effectiveness": 1, "attack_ratio": 1.06,
     "move_scale": 0.86, "guard_multiplier": 1, "guard_pierced": 0,
     "crank": 1, "hold_penalty": 1, "pinfall": 0, "escape_success": 0,
     "stamina_factor": 1, "health_factor": 1, "trapped_factor": 1,
     "reply_word": " clotheslines", "self_hp_before_ai": 226,
     "opponent_hp_before_ai": 160 },
   "roleplay": {
     "status": 200,
     "request": { "user_id": "naicul", "message": "I lift you up",
                  "height": 71, "weight": 176, "in_battle": true,
                  "self_health": 96, "self_trapped": false,
                  "opponent_health": 78, "opponent_trapped": false,
                  "humanize": true },
     "response": { "response": "He eats the suplex and clotheslines you back.",
                   "meta": { "opponent": { "health": 100, "stamina": 100,
                                           "trapped": false } } }
   },
   "roleplay_text": "He eats the suplex and clotheslines you back.",
   "roleplay_meta": { "opponent": { "health": 100, "stamina": 100,
                                    "trapped": false } },
   "roleplay_status": 200
  }

  The same turn with no "move" at all, the message carries it, "move_source" is
  "message" and the numbers are the ones a suplex makes:

  GET /ugcw/battle-turn?userid=naicul&self_height=180&self_weight=80
      &message=I lift you up and suplex you

  And a turn with no move word in it, "move_source" is "none", the damage
  calculation is skipped and every factor comes back neutral:

  GET /ugcw/battle-turn?userid=naicul&self_height=180&self_weight=80
      &message=I stare at him and say nothing

  { "move": "none", "move_source": "none", "move_type": "action",
    "style": "none", "outcome": "action", "damage": 0, "recoil": 0,
    "healed": 0, "hit_roll": 0, "hit_chance": 0, "critical": 1,
    "variance": 1, "attack_ratio": 1, "move_scale": 1,
    "guard_multiplier": 1, "pinfall": 0, "escape_success": 0 }

  Send the next call without "side" and it plays for whoever's turn it is,
  which after an exchange the ai answered is your own fighter again. status
  becomes "finished" and "winner" is filled in on a knockout or a successful
  pin, on either side of the exchange.

  "move_source" says where the move came from: "query" when "move" was one of
  the known words, "message" when it was scanned out of the message and "none"
  when there was no move word anywhere and the damage was skipped.
  "ai_turn.move_source" says the same for the rival: "reply" for a move word
  found in the answer of the ai, "none" for a narrative answer and
  "unavailable" when there was no rival turn.

  "outcome" says what the turn was in one word: hit, critical, guarded or miss
  for an attack, guard, recover, escape or held for the support moves, pinfall
  for a pin that ended the fight and action for a narrative turn.

  NOTE: easy-api.ts executes route code from the BOTTOM line up, so this
  file is written in reverse order of what actually happens. Each block is
  labelled with the step it performs.
  ==========================================================================
*/

module.exports = {
  path: "/ugcw/battle-turn",
  code: `

$ignore[==========================================================================
 STEP 16 - RESPOND: everything below has already been calculated and stored,
 the own turn, the turn the ai answered with and the state after both of them
==========================================================================]

$send[200;json;{
 "battle_id": "$get[uid]",
 "status": "$get[status]",
 "winner": "$get[winner]",
 "round": $get[roundnew],
 "turn": "$get[next]",
 "actor": "$get[side]",
 "target": "$get[target]",
 "move": "$get[mv]",
 "move_source": "$get[mvsrc]",
 "move_type": "$get[mtype]",
 "style": "$get[style]",
 "outcome": "$get[outcome]",
 "damage": $get[damage],
 "recoil": $get[recoil],
 "healed": $get[heal],
 "hit_roll": $get[rolld100],
 "hit_chance": $get[acc],
 "critical": $get[crit],
 "variance": $get[variance],
 "effectiveness": $get[eff],
 "attack_ratio": $get[atkr],
 "move_scale": $get[scale],
 "guard_multiplier": $get[gmult],
 "guard_pierced": $get[pierce],
 "crank": $get[crank],
 "hold_penalty": $get[lockpen],
 "pinfall": $get[pintry],
 "escape_success": $get[escok],
 "self": {
  "height_cm": $get[sh],
  "weight_kg": $get[sw],
  "bmi": $get[sbmi],
  "build": "$get[sbuild]",
  "max_hp": $get[smaxhp],
  "hp_before": $get[selfhp],
  "hp": $get[selfhpnew],
  "power": $get[spower],
  "toughness": $get[stough],
  "speed": $get[sspeed],
  "guarding": $get[selfguardnew],
  "hold": $get[selfholdnew]
 },
 "opponent": {
  "height_cm": $get[oh],
  "weight_kg": $get[ow],
  "bmi": $get[obmi],
  "build": "$get[obuild]",
  "max_hp": $get[omaxhp],
  "hp_before": $get[opphp],
  "hp": $get[opphpnew],
  "power": $get[opower],
  "toughness": $get[otough],
  "speed": $get[ospeed],
  "guarding": $get[oppguardnew],
  "hold": $get[oppholdnew]
 },
 "ai_turn": {
  "resolved": $get[aiok],
  "move": "$get[aimv]",
  "move_source": "$get[aimvsrc]",
  "move_type": "$get[aitype]",
  "style": "$get[aistyle]",
  "outcome": "$get[aioutcome]",
  "damage": $get[aidamage],
  "recoil": $get[airecoil],
  "healed": $get[aiheal],
  "hit_roll": $get[airolld100],
  "hit_chance": $get[aiacc],
  "critical": $get[aicrit],
  "variance": $get[aivariance],
  "effectiveness": $get[aieff],
  "attack_ratio": $get[aiatkr],
  "move_scale": $get[aiscale],
  "guard_multiplier": $get[aigmult],
  "guard_pierced": $get[aipierce],
  "crank": $get[aicrank],
  "hold_penalty": $get[ailockpen],
  "pinfall": $get[aipintry],
  "escape_success": $get[aiescok],
  "stamina_factor": $get[aistam],
  "health_factor": $get[aihpf],
  "trapped_factor": $get[aitrap],
  "reply_word": "$get[aifirstword]",
  "self_hp_before_ai": $get[preselfhp],
  "opponent_hp_before_ai": $get[preopphp]
 },
 "roleplay": $get[rpjson],
 "roleplay_text": $get[rptext],
 "roleplay_meta": $get[rpmeta],
 "roleplay_status": $get[rpstatus]
}]

$ignore[==========================================================================
 STEP 15.6 - SECOND DAMAGE CALCULATOR, THE TURN OF THE RIVAL. It runs after
 the http call of step 15.5 and it is a copy of the calculation of the own
 turn: the answer of the ai is scanned for a move word exactly the way the
 message is scanned in step 4, the move record of step 8 is read again, the
 dice of step 10, the formula of step 12 and the application of step 13 run
 again, and the damage is applied. The roles are turned around for it, the
 rival is the attacker and the own fighter is the defender, which is what the
 rebind block at the bottom does: from there on aspeed is the speed of the
 rival and dtough the toughness of the own fighter, so the tables below stay
 verbatim copies of the tables above.
 The base of the rival turn is the state the own turn left behind, so a guard
 put up this call still cuts the rival hit, and a hold locked this call still
 weakens the rival. On top of that the answer of the ai carries the condition
 of the rival in response.meta.opponent and it is used as a base too: stamina
 scales the damage between 0.6 and 1, health between 0.7 and 1, and a trapped
 rival hits at 0.75.
 No move word in the reply, or a reply that is only narrative, plays the rival
 turn as "none" and skips the damage, the same nodmg switch the own turn uses.
 When there is no ai answer at all, or the caller is the rival side, or the
 battle is already over, ai_turn.resolved is 0 and every number below is
 neutral: the turn is stored exactly as it was before this step existed.
 One call is one exchange, so when the rival turn is played the turn goes back
 to the side that called and the round counts one up.
==========================================================================]
$var[roundnew;$get[finround]]
$var[next;$get[finnext]]
$var[status;$get[finstatus]]
$var[winner;$get[finwinner]]
$var[oppholdnew;$get[finopphold]]
$var[selfholdnew;$get[finselfhold]]
$var[oppguardnew;$get[finoppguard]]
$var[selfguardnew;$get[finselfguard]]
$var[opphpnew;$get[finopphp]]
$var[selfhpnew;$get[finselfhp]]

$setVar[$get[uid]-battle-round;$get[finround]]
$setVar[$get[uid]-battle-turn;$get[finnext]]
$setVar[$get[uid]-battle-status;$get[finstatus]]
$setVar[$get[uid]-battle-opponent-hold;$get[finopphold]]
$setVar[$get[uid]-battle-self-hold;$get[finselfhold]]
$setVar[$get[uid]-battle-opponent-guard;$get[finoppguard]]
$setVar[$get[uid]-battle-self-guard;$get[finselfguard]]
$setVar[$get[uid]-battle-opponent-hp;$get[finopphp]]
$setVar[$get[uid]-battle-self-hp;$get[finselfhp]]

$ignore[15.6a  the state after both halves, what is stored and reported: the own
 turn, then the turn of the rival, then the winner, the turn and the round]
$var[finnext;$ternary[$get[aiok]==1;$ternary[$get[finstatus]==finished;none;$get[side]];$get[next]]]
$var[finround;$ternary[$get[aiok]==1;$ternary[$get[finstatus]==finished;$get[roundnew];$fixed[$math[$get[roundnew]+1];0]];$get[roundnew]]]
$var[finstatus;$ternary[$get[finwinner]==none;fighting;finished]]
$var[finwinner;$ternary[$get[finopphp]<=0;$ternary[$get[finselfhp]<=0;draw;self];$ternary[$get[finselfhp]<=0;opponent;$get[winner]]]]
$var[finopphold;$ternary[$get[aiok]==1;$get[aiopphold];$get[oppholdnew]]]
$var[finselfhold;$ternary[$get[aiok]==1;$get[aiselfhold];$get[selfholdnew]]]
$var[finoppguard;$ternary[$get[aiok]==1;$get[aioppguard];$get[oppguardnew]]]
$var[finselfguard;$ternary[$get[aiok]==1;$get[aiselfguard];$get[selfguardnew]]]
$var[finopphp;$ternary[$get[aiok]==1;$get[aiopphp];$get[opphpnew]]]
$var[finselfhp;$ternary[$get[aiok]==1;$get[aiselfhp];$get[selfhpnew]]]

$ignore[15.6b  APPLY, the mirror of step 13 and step 14 with the rival attacking]
$var[aioutcome;$ternary[$get[aistyle]==none;action;$ternary[$get[aimv]==guard;guard;$ternary[$get[aimv]==recover;recover;$ternary[$get[aimv]==escape;$ternary[$get[aiescok]==1;escape;held];$ternary[$get[aipintry]==1;pinfall;$ternary[$get[aihit]==false;miss;$ternary[$get[aicrit]>1;critical;$ternary[$get[aigmult]<1;guarded;hit]]]]]]]]]
$var[aiselfhold;$ternary[$get[aistyle]==sub;$ternary[$get[aiisattack]==1;$ternary[$get[aihit]==true;2;$get[dhold]];$get[dhold]];$get[dhold]]]
$var[aiopphold;$ternary[$get[aistyle]==none;$get[ahold];$ternary[$get[aimv]==escape;$ternary[$get[aiescok]==1;0;$get[aiholdtick]];$get[aiholdtick]]]]
$var[aiselfguard;$ternary[$get[aiisattack]==1;0;$get[dguard]]]
$var[aioppguard;$ternary[$get[aimv]==guard;1;0]]
$var[aiisattack;$ternary[$get[aistyle]==none;0;$ternary[$get[aimv]==guard;0;$ternary[$get[aimv]==recover;0;$ternary[$get[aimv]==escape;0;1]]]]]
$var[aiselfhp;$ternary[$get[aiselfhp]>$get[dmaxhp];$get[dmaxhp];$get[aiselfhp]]]
$var[aiselfhp;$ternary[$get[aiselfhp]<0;0;$get[aiselfhp]]]
$var[aiselfhp;$ternary[$get[aipintry]==1;0;$get[aiselfhp]]]
$var[aiselfhp;$fixed[$math[$get[dhp]-$get[aidamage]];0]]
$var[aiopphp;$ternary[$get[aiopphp]>$get[amaxhp];$get[amaxhp];$get[aiopphp]]]
$var[aiopphp;$ternary[$get[aiopphp]<0;0;$get[aiopphp]]]
$var[aiopphp;$fixed[$math[$get[ahp]-$get[airecoil]+$get[aiheal]];0]]
$var[aiheal;$ternary[$get[aimv]==recover;$fixed[$math[$get[amaxhp]*0.22];0];$ternary[$get[aimv]==escape;$ternary[$get[aiescok]==1;$fixed[$math[$get[amaxhp]*0.05];0];0];0]]]
$var[aiholdtick;$ternary[$get[ahold]>0;$fixed[$math[$get[ahold]-1];0];0]]
$var[aiescok;$ternary[$get[aimv]==escape;$ternary[$get[ahold]>0;$ternary[$get[aihit]==true;1;0];1];0]]
$var[airecoil;$ternary[$get[aidamage]>0;$ternary[$get[airecoilrate]>0;$ternary[$get[airecoilcalc]<1;1;$get[airecoilcalc]];0];0]]
$var[airecoilcalc;$fixed[$math[$get[aidamage]*$get[airecoilrate]];0]]

$ignore[15.6c  THE FORMULA, the mirror of step 12, times the three condition factors]
$var[aidamage;$ternary[$get[ainodmg]==1;0;$ternary[$get[aihit]==true;$get[aidmgraw];0]]]
$var[aidmgraw;$fixed[$math[$get[aibase]*$get[aiscale]*$get[aiatkr]*$get[aivariance]*$get[aieff]*$get[aigmult]*$get[aicrit]*$get[aicrank]*$get[ailockpen]*$get[aistam]*$get[aihpf]*$get[aitrap]];0]]
$var[aicrank;$ternary[$get[aistyle]==sub;$ternary[$get[dhold]>0;1.35;1];1]]
$var[ailockpen;$ternary[$get[ahold]>0;0.75;1]]
$var[aigmult;$ternary[$get[ainodmg]==1;1;$ternary[$get[aipierce]==1;1;$ternary[$get[dguard]==1;0.45;1]]]]
$var[aicrit;$ternary[$get[ainodmg]==1;1;$ternary[$get[aicritroll]<10;1.6;1]]]
$var[aivariance;$ternary[$get[ainodmg]==1;1;$fixed[$math[($get[aivarlo]+$get[airollvar])/100];2]]]
$tryIf[$get[ainodmg]==0;@var(airollvar;@randomNumber(0;@get(aivarspan)))]
$var[airollvar;0]
$var[aivarspan;$ternary[$get[aistyle]==brawl;61;31]]
$var[aivarlo;$ternary[$get[aistyle]==brawl;70;85]]
$var[aiscale;$ternary[$get[ainodmg]==1;1;$ternary[$get[aiscaleraw]>1.5;1.5;$ternary[$get[aiscaleraw]<0.7;0.7;$get[aiscaleraw]]]]]
$var[aiscaleraw;$fixed[$math[$get[aiscaleexpr]];2]]
$var[aiatkr;$ternary[$get[ainodmg]==1;1;$ternary[$get[aiatkrraw]>1.6;1.6;$ternary[$get[aiatkrraw]<0.6;0.6;$get[aiatkrraw]]]]]
$var[aiatkrraw;$fixed[$math[0.5+0.5*($get[apower]/$get[dtough])];2]]
$var[aipintry;$ternary[$get[aimv]==pin;$ternary[$get[aihit]==true;$ternary[$get[aidpct]<=35;1;0];0];0]]
$var[aidpct;$fixed[$math[100*$get[dhp]/$get[dmaxhp]]]]

$ignore[15.6d  THE DICE, the mirror of step 10, skipped when the answer is narrative]
$var[aihit;$ternary[$get[ainodmg]==1;false;$ternary[$get[airolld100]<$get[aiacc];true;false]]]
$tryIf[$get[ainodmg]==0;@var(airolld100;@randomNumber(0;101))@var(aicritroll;@randomNumber(0;101))]
$var[airolld100;0]
$var[aicritroll;100]

$ignore[15.6e  TYPE EFFECTIVENESS, the mirror of step 9 against the own body build]
$var[aieff;$ternary[$isNumber[$get[aieffraw]]==true;$get[aieffraw];1]]
$var[aieffraw;$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$get[aieffkey];grapple-light;1.25];grapple-balanced;1];grapple-heavy;0.8];charge-light;1.15];charge-balanced;1];charge-heavy;0.9];swift-light;0.9];swift-balanced;1];swift-heavy;1.2];strike-light;1.1];strike-balanced;1];strike-heavy;0.85]]
$var[aieffkey;$get[aitype]-$get[dbuild]]

$ignore[15.6f  THE MOVE RECORD, a verbatim copy of the table of step 8]
$var[airecoilrate;$getSplit[6]]
$var[aipierce;$getSplit[7]]
$var[aiscaleexpr;$getSplit[5]]
$var[aistyle;$getSplit[4]]
$var[aitype;$getSplit[3]]
$var[aiacc;$ternary[$get[ainodmg]==1;0;$ternary[$get[aimv]==escape;$get[aiescacc];$getSplit[2]]]]
$var[aibase;$getSplit[1]]
$split[$get[airecord];,]
$var[airecord;$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$get[aimvkey];/jab/;10,95,swift,basic,1+($get[aspeed]-$get[dspeed])/150,0,0];/punch/;16,90,strike,basic,1,0,0];/kick/;24,82,strike,basic,1+($get[aheight]-$get[dheight])/200,0,0];/headbutt/;20,85,strike,basic,1+($get[atough]-$get[dtough])/200,0.2,0];/tackle/;30,78,charge,basic,($get[aweight]*2)/($get[aweight]+$get[dweight]),0.15,0];/throw/;28,70,grapple,basic,$get[aweight]/$get[dweight],0,0];/guard/;0,100,support,basic,1,0,0];/recover/;0,100,support,basic,1,0,0];/dropkick/;22,76,swift,pro,1+($get[aspeed]-$get[dspeed])/100,0.2,0];/clothesline/;26,80,charge,pro,($get[aweight]*2)/($get[aweight]+$get[dweight]),0.1,0];/bodyslam/;30,74,grapple,pro,$get[aweight]/$get[dweight],0.15,0];/suplex/;34,70,grapple,pro,$get[aweight]/$get[dweight],0.2,0];/piledriver/;42,60,grapple,pro,$get[aweight]/$get[dweight],0.3,0];/pin/;0,55,grapple,pro,1,0,0];/armbar/;18,70,grapple,sub,1+($get[atough]-$get[dtough])/200,0,1];/leglock/;20,68,grapple,sub,$get[aweight]/$get[dweight],0,1];/choke/;22,66,grapple,sub,1+($get[aheight]-$get[dheight])/200,0,1];/sleeper/;24,64,grapple,sub,$get[aweight]/$get[dweight],0,1];/escape/;0,100,support,sub,1,0,0];/haymaker/;32,62,strike,brawl,1,0.05,0];/stomp/;22,80,strike,brawl,$get[aweight]/$get[dweight],0.05,0];/lowblow/;13,90,strike,brawl,1,0,1];/gouge/;11,88,swift,brawl,1+($get[aspeed]-$get[dspeed])/150,0,1];/none/;0,100,action,none,1,0,0];/action/;0,100,action,none,1,0,0];/react/;0,100,action,none,1,0,0];/backoff/;0,100,action,none,1,0,0];/taunt/;0,100,action,none,1,0,0]]
$var[aimvkey;/$get[aimv]/]

$ignore[15.6g  THE CONTESTED ESCAPE, the mirror of step 7.5 for the held rival]
$var[aiescacc;$ternary[$get[ahold]>0;$get[aiescclamp];100]]
$var[aiescclamp;$ternary[$get[aiescraw]>90;90;$ternary[$get[aiescraw]<15;15;$get[aiescraw]]]]
$var[aiescraw;$fixed[$math[10+45*$get[aiescratio]+($get[aspeed]-$get[dspeed])/10]]]
$var[aiescratio;$fixed[$math[($get[aweight]+$get[atough])/($get[dweight]+$get[dtough])];2]]

$ignore[15.6h  THE SCAN OF THE ANSWER, a verbatim copy of step 4, response.response
 takes the place of the message]
$var[aimvsrc;$ternary[$get[aiok]==1;$ternary[$get[aiscanned]==none;none;reply];unavailable]]
$var[ainodmg;$ternary[$get[aimv]==none;1;$ternary[$get[aimv]==action;1;$ternary[$get[aimv]==react;1;$ternary[$get[aimv]==backoff;1;$ternary[$get[aimv]==taunt;1;0]]]]]]
$var[aimv;$ternary[$get[aiok]==1;$get[aiscanned];none]]
$var[aiscanned;$ternary[$hasText[$get[aifirstword]; jab]==true;jab;$ternary[$hasText[$get[aifirstword]; punch]==true;punch;$ternary[$hasText[$get[aifirstword]; kick]==true;kick;$ternary[$hasText[$get[aifirstword]; headbutt]==true;headbutt;$ternary[$hasText[$get[aifirstword]; tackle]==true;tackle;$ternary[$hasText[$get[aifirstword]; throw]==true;throw;$ternary[$hasText[$get[aifirstword]; clothesline]==true;clothesline;$ternary[$hasText[$get[aifirstword]; dropkick]==true;dropkick;$ternary[$hasText[$get[aifirstword]; bodyslam]==true;bodyslam;$ternary[$hasText[$get[aifirstword]; suplex]==true;suplex;$ternary[$hasText[$get[aifirstword]; piledriver]==true;piledriver;$ternary[$hasText[$get[aifirstword]; pin]==true;pin;$ternary[$hasText[$get[aifirstword]; armbar]==true;armbar;$ternary[$hasText[$get[aifirstword]; leglock]==true;leglock;$ternary[$hasText[$get[aifirstword]; choke]==true;choke;$ternary[$hasText[$get[aifirstword]; sleeper]==true;sleeper;$ternary[$hasText[$get[aifirstword]; haymaker]==true;haymaker;$ternary[$hasText[$get[aifirstword]; stomp]==true;stomp;$ternary[$hasText[$get[aifirstword]; lowblow]==true;lowblow;$ternary[$hasText[$get[aifirstword]; gouge]==true;gouge;$ternary[$hasText[$get[aifirstword]; guard]==true;guard;$ternary[$hasText[$get[aifirstword]; recover]==true;recover;$ternary[$hasText[$get[aifirstword]; escape]==true;escape;$ternary[$hasText[$get[aifirstword]; none]==true;none;$ternary[$hasText[$get[aifirstword]; action]==true;action;$ternary[$hasText[$get[aifirstword]; react]==true;react;$ternary[$hasText[$get[aifirstword]; backoff]==true;backoff;$ternary[$hasText[$get[aifirstword]; taunt]==true;taunt;none]]]]]]]]]]]]]]]]]]]]]]]]]]]]]
$var[aifirstword; $getSplit[2]]
$split[$get[aitail]; ]
$var[aitail;$replaceRegexp[$get[aimscan];^.*?(?= (jab|punch|kick|headbutt|tackle|throw|clothesline|dropkick|bodyslam|suplex|piledriver|pin|armbar|leglock|choke|sleeper|haymaker|stomp|lowblow|gouge|guard|recover|escape|none|action|react|backoff|taunt));g;]]
$var[aimscan;$replaceRegexp[ $lowercase[$getData[response.response]];[^a-z]+;g; ]]

$ignore[15.6i  THE CONDITION OF THE RIVAL out of response.meta.opponent, and the
 switch aiok that plays or skips the whole step]
$var[aitrap;$ternary[$get[aitraptxt]==true;0.75;1]]
$var[aitraptxt;$ternary[$getData[response.meta.opponent.trapped]==undefined;false;$getData[response.meta.opponent.trapped]]]
$var[aihpf;$fixed[$math[0.7+0.3*$get[aihealth]/100];2]]
$var[aihealth;$ternary[$isNumber[$get[aihealthraw]]==true;$ternary[$get[aihealthraw]>100;100;$ternary[$get[aihealthraw]<0;0;$get[aihealthraw]]];100]]
$var[aihealthraw;$ternary[$getData[response.meta.opponent.health]==undefined;100;$getData[response.meta.opponent.health]]]
$var[aistam;$fixed[$math[0.6+0.4*$get[aistamina]/100];2]]
$var[aistamina;$ternary[$isNumber[$get[aistaminaraw]]==true;$ternary[$get[aistaminaraw]>100;100;$ternary[$get[aistaminaraw]<0;0;$get[aistaminaraw]]];100]]
$var[aistaminaraw;$ternary[$getData[response.meta.opponent.stamina]==undefined;100;$getData[response.meta.opponent.stamina]]]
$var[aiok;$ternary[$get[rpstatus]>0;$ternary[$get[side]==self;$ternary[$get[status]==fighting;1;0];0];0]]

$ignore[15.6j  TURN THE ROLES AROUND, the rival attacks and the own fighter defends]
$var[preopphp;$get[opphpnew]]
$var[preselfhp;$get[selfhpnew]]
$var[ahold;$get[oppholdnew]]
$var[dhold;$get[selfholdnew]]
$var[dguard;$get[selfguardnew]]
$var[dbuild;$get[sbuild]]
$var[dweight;$get[sw]]
$var[dheight;$get[sh]]
$var[dspeed;$get[sspeed]]
$var[dtough;$get[stough]]
$var[dpower;$get[spower]]
$var[dhp;$get[selfhpnew]]
$var[dmaxhp;$get[smaxhp]]
$var[aweight;$get[ow]]
$var[aheight;$get[oh]]
$var[aspeed;$get[ospeed]]
$var[atough;$get[otough]]
$var[apower;$get[opower]]
$var[ahp;$get[opphpnew]]
$var[amaxhp;$get[omaxhp]]

$ignore[==========================================================================
 STEP 15.5 - ROLEPLAY: hand the turn over to the roleplay module, an internal
 GET to /ugcw/roleplay carrying every stat that route reads, and keep the
 reply, the text and the meta for the response.
 The url is built first and written last, the same way the rest of the file
 runs. The reply of the ai is escaped by hand, backslashes, quotes and
 newlines (the newline pattern below is a real line break, the replacement is
 the two characters reverse slash n) because an ai line would otherwise break
 the json that step 16 builds. An unreachable roleplay route is not fatal,
 the turn is played and stored anyway and its error body is returned.
==========================================================================]

$var[rpjson;$ternary[$get[rpstatus]>0;$getData[$default];{"status": 0, "request": null, "response": null, "error": "roleplay module unreachable"}]]
$var[rpmeta;$ternary[$getData[response.meta]==undefined;null;$getData[response.meta]]]
$var[rptext;$ternary[$getData[response.response]==undefined;null;"$replaceText[$replaceText[$replaceText[$getData[response.response];\\;\\\\];";\\"];\n;\\n]"]]
$var[rpstatus;$httpGet[$get[rpurl]]]
$var[rpurl;$get[rpproto]://$get[rphost]/ugcw/roleplay?userid=$get[uidenv]&message=$get[msgenv]&in_battle=true&self_height=$get[sh]&self_weight=$get[sw]&self_health=$get[selfpct]&self_trapped=$get[selftrap]&opponent_health=$get[opppct]&opponent_trapped=$get[opptrap]&humanize=$get[rphuman]&system_p=$get[rpsyspenc]]
$var[rpsyspenc;$encodeURI[$get[rpsysp]]]
$var[rpsysp;$ternary[$getQuery[system_p]!=undefined;$getQuery[system_p];$ternary[$getQuery[system_prompt]!=undefined;$getQuery[system_prompt];undefined]]]
$var[rphuman;$ternary[$getQuery[humanize]==undefined;true;$getQuery[humanize]]]
$var[rphost;$getHeader[host]]
$var[rpproto;$ternary[$getHeader[x-forwarded-proto]==undefined;$get[proto];$getHeader[x-forwarded-proto]]]
$var[proto;$protocol]
$var[opptrap;$ternary[$get[oppholdnew]>0;true;false]]
$var[selftrap;$ternary[$get[selfholdnew]>0;true;false]]
$var[opppct;$fixed[$math[100*$get[opphpnew]/$get[omaxhp]];0]]
$var[selfpct;$fixed[$math[100*$get[selfhpnew]/$get[smaxhp]];0]]
$var[uidenv;$encodeURI[$get[uid]]]
$var[msgenv;$encodeURI[$get[msg]]]

$ignore[==========================================================================
 STEP 15 - PERSIST: save the new health points, holds and the new turn
==========================================================================]

$setVar[$get[uid]-battle-self-hp;$get[selfhpnew]]
$setVar[$get[uid]-battle-opponent-hp;$get[opphpnew]]
$setVar[$get[uid]-battle-turn;$get[next]]
$setVar[$get[uid]-battle-round;$get[roundnew]]
$setVar[$get[uid]-battle-self-guard;$get[selfguardnew]]
$setVar[$get[uid]-battle-opponent-guard;$get[oppguardnew]]
$setVar[$get[uid]-battle-self-hold;$get[selfholdnew]]
$setVar[$get[uid]-battle-opponent-hold;$get[oppholdnew]]
$setVar[$get[uid]-battle-status;$get[status]]

$ignore[==========================================================================
 STEP 14 - RESOLVE THE TURN: knock out, winner, next turn, round counter
==========================================================================]

$var[roundnew;$ternary[$get[side]==opponent;$fixed[$math[$get[round]+1];0];$get[round]]]
$var[next;$ternary[$get[status]==finished;none;$ternary[$get[side]==self;opponent;self]]]
$var[status;$ternary[$get[winner]==none;fighting;finished]]
$var[winner;$ternary[$get[opphpnew]<=0;$ternary[$get[selfhpnew]<=0;draw;self];$ternary[$get[selfhpnew]<=0;opponent;none]]]
$var[outcome;$ternary[$get[style]==none;action;$ternary[$get[mv]==guard;guard;$ternary[$get[mv]==recover;recover;$ternary[$get[mv]==escape;$ternary[$get[escok]==1;escape;held];$ternary[$get[pintry]==1;pinfall;$ternary[$get[hit]==false;miss;$ternary[$get[crit]>1;critical;$ternary[$get[gmult]<1;guarded;hit]]]]]]]]]

$ignore[==========================================================================
 STEP 13 - APPLY: damage to the defender, recoil and healing to the actor,
 plus the submission holds and the pinfall
==========================================================================]

$var[selfholdnew;$ternary[$get[isopp]==true;$get[dholdnew];$get[aholdnew]]]
$var[oppholdnew;$ternary[$get[isopp]==true;$get[aholdnew];$get[dholdnew]]]
$var[aholdnew;$ternary[$get[style]==none;$get[ahold];$ternary[$get[mv]==escape;$ternary[$get[escok]==1;0;$get[holdtick]];$get[holdtick]]]]
$var[dholdnew;$ternary[$get[style]==sub;$ternary[$get[isattack]==1;$ternary[$get[hit]==true;2;$get[dhold]];$get[dhold]];$get[dhold]]]

$var[selfguardnew;$ternary[$get[isopp]==true;$get[dguardnew];$get[aguardnew]]]
$var[oppguardnew;$ternary[$get[isopp]==true;$get[aguardnew];$get[dguardnew]]]
$var[aguardnew;$ternary[$get[mv]==guard;1;0]]
$var[dguardnew;$ternary[$get[isattack]==1;0;$get[dguard]]]
$var[isattack;$ternary[$get[style]==none;0;$ternary[$get[mv]==guard;0;$ternary[$get[mv]==recover;0;$ternary[$get[mv]==escape;0;1]]]]]

$var[selfhpnew;$ternary[$get[isopp]==true;$get[dhpnew];$get[ahpnew]]]
$var[opphpnew;$ternary[$get[isopp]==true;$get[ahpnew];$get[dhpnew]]]

$var[ahpnew;$ternary[$get[ahpnew]>$get[amaxhp];$get[amaxhp];$get[ahpnew]]]
$var[ahpnew;$ternary[$get[ahpnew]<0;0;$get[ahpnew]]]
$var[ahpnew;$fixed[$math[$get[ahp]-$get[recoil]+$get[heal]];0]]

$var[dhpnew;$ternary[$get[pintry]==1;0;$get[dhpnew]]]
$var[dhpnew;$ternary[$get[dhpnew]<0;0;$get[dhpnew]]]
$var[dhpnew;$fixed[$math[$get[dhp]-$get[damage]];0]]

$var[heal;$ternary[$get[mv]==recover;$fixed[$math[$get[amaxhp]*0.22];0];$ternary[$get[mv]==escape;$ternary[$get[escok]==1;$fixed[$math[$get[amaxhp]*0.05];0];0];0]]]

$var[recoil;$ternary[$get[damage]>0;$ternary[$get[recoilrate]>0;$ternary[$get[recoilcalc]<1;1;$get[recoilcalc]];0];0]]
$var[recoilcalc;$fixed[$math[$get[damage]*$get[recoilrate]];0]]

$ignore[the escape result and the hold timer, both are read by the lines above:
 escok    1 when an escape broke free, or when nothing was holding the fighter
          and there was nothing to break, 0 for every other turn
 holdtick the hold counter one turn lower, 0 when there is no hold. A narrative
          turn never uses it, style "none" leaves the hold exactly as it is]

$var[escok;$ternary[$get[mv]==escape;$ternary[$get[ahold]>0;$ternary[$get[hit]==true;1;0];1];0]]
$var[holdtick;$ternary[$get[ahold]>0;$fixed[$math[$get[ahold]-1]];0]]

$ignore[==========================================================================
 STEP 12 - DAMAGE FORMULA
 damage = power * move_scale * attack_ratio * variance * effectiveness
                * guard_multiplier * critical * crank * hold_penalty
 A skipped turn does not use the formula, every factor below is forced to its
 neutral value so the response reports the turn as the non attack it is
==========================================================================]

$var[damage;$ternary[$get[nodmg]==1;0;$ternary[$get[hit]==true;$get[dmgraw];0]]]
$var[dmgraw;$fixed[$math[$get[base]*$get[scale]*$get[atkr]*$get[variance]*$get[eff]*$get[gmult]*$get[crit]*$get[crank]*$get[lockpen]];0]]
$var[crank;$ternary[$get[style]==sub;$ternary[$get[dhold]>0;1.35;1];1]]
$var[lockpen;$ternary[$get[ahold]>0;0.75;1]]
$var[gmult;$ternary[$get[nodmg]==1;1;$ternary[$get[pierce]==1;1;$ternary[$get[dguard]==1;0.45;1]]]]
$var[crit;$ternary[$get[nodmg]==1;1;$ternary[$get[critroll]<10;1.6;1]]]
$var[variance;$ternary[$get[nodmg]==1;1;$fixed[$math[($get[varlo]+$get[rollvar])/100];2]]]
$tryIf[$get[nodmg]==0;@var(rollvar;@randomNumber(0;@get(varspan)))]
$var[rollvar;0]
$var[varspan;$ternary[$get[style]==brawl;61;31]]
$var[varlo;$ternary[$get[style]==brawl;70;85]]
$var[scale;$ternary[$get[nodmg]==1;1;$ternary[$get[scaleraw]>1.5;1.5;$ternary[$get[scaleraw]<0.7;0.7;$get[scaleraw]]]]]
$var[scaleraw;$fixed[$math[$get[scaleexpr]];2]]
$var[atkr;$ternary[$get[nodmg]==1;1;$ternary[$get[atkrraw]>1.6;1.6;$ternary[$get[atkrraw]<0.6;0.6;$get[atkrraw]]]]]
$var[atkrraw;$fixed[$math[0.5+0.5*($get[apower]/$get[dtough])];2]]

$ignore[==========================================================================
 STEP 11 - PIN: a pro pinfall ends the fight when the rival is low enough
==========================================================================]

$var[pintry;$ternary[$get[mv]==pin;$ternary[$get[hit]==true;$ternary[$get[dpct]<=35;1;0];0];0]]
$var[dpct;$fixed[$math[100*$get[dhp]/$get[dmaxhp]]]]

$ignore[==========================================================================
 STEP 10 - ROLL THE DICE: accuracy roll, critical roll, damage variance.
 A skipped turn rolls nothing, the two defaults below are what it reports
==========================================================================]

$var[hit;$ternary[$get[nodmg]==1;false;$ternary[$get[rolld100]<$get[acc];true;false]]]
$tryIf[$get[nodmg]==0;@var(rolld100;@randomNumber(0;101))@var(critroll;@randomNumber(0;101))]
$var[rolld100;0]
$var[critroll;100]

$ignore[==========================================================================
 STEP 9 - TYPE EFFECTIVENESS: move type against the defender body build
==========================================================================]

$var[eff;$ternary[$isNumber[$get[effraw]]==true;$get[effraw];1]]
$var[effraw;$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$get[effkey];grapple-light;1.25];grapple-balanced;1];grapple-heavy;0.8];charge-light;1.15];charge-balanced;1];charge-heavy;0.9];swift-light;0.9];swift-balanced;1];swift-heavy;1.2];strike-light;1.1];strike-balanced;1];strike-heavy;0.85]]
$var[effkey;$get[mtype]-$get[dbuild]]

$ignore[==========================================================================
 STEP 8 - MOVE DATABASE: every move is one record
 power,accuracy,type,style,scaling formula,recoil rate,pierces guard
 The scaling is plain math and is evaluated once the numbers are in place.
 The five narrative moves share one record, power 0 and the style "none", which
 is what step 13 and step 14 look for. The 100 in the "escape" record is only
 the chance used when the fighter is not held, step 7.5 replaces it with the
 contested chance as soon as there is a hold to break.
==========================================================================]

$var[recoilrate;$getSplit[6]]
$var[pierce;$getSplit[7]]
$var[scaleexpr;$getSplit[5]]
$var[style;$getSplit[4]]
$var[mtype;$getSplit[3]]
$var[acc;$ternary[$get[nodmg]==1;0;$ternary[$get[mv]==escape;$get[escacc];$getSplit[2]]]]
$var[base;$getSplit[1]]
$split[$get[record];,]
$var[record;$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$get[mvkey];/jab/;10,95,swift,basic,1+($get[aspeed]-$get[dspeed])/150,0,0];/punch/;16,90,strike,basic,1,0,0];/kick/;24,82,strike,basic,1+($get[aheight]-$get[dheight])/200,0,0];/headbutt/;20,85,strike,basic,1+($get[atough]-$get[dtough])/200,0.2,0];/tackle/;30,78,charge,basic,($get[aweight]*2)/($get[aweight]+$get[dweight]),0.15,0];/throw/;28,70,grapple,basic,$get[aweight]/$get[dweight],0,0];/guard/;0,100,support,basic,1,0,0];/recover/;0,100,support,basic,1,0,0];/dropkick/;22,76,swift,pro,1+($get[aspeed]-$get[dspeed])/100,0.2,0];/clothesline/;26,80,charge,pro,($get[aweight]*2)/($get[aweight]+$get[dweight]),0.1,0];/bodyslam/;30,74,grapple,pro,$get[aweight]/$get[dweight],0.15,0];/suplex/;34,70,grapple,pro,$get[aweight]/$get[dweight],0.2,0];/piledriver/;42,60,grapple,pro,$get[aweight]/$get[dweight],0.3,0];/pin/;0,55,grapple,pro,1,0,0];/armbar/;18,70,grapple,sub,1+($get[atough]-$get[dtough])/200,0,1];/leglock/;20,68,grapple,sub,$get[aweight]/$get[dweight],0,1];/choke/;22,66,grapple,sub,1+($get[aheight]-$get[dheight])/200,0,1];/sleeper/;24,64,grapple,sub,$get[aweight]/$get[dweight],0,1];/escape/;0,100,support,sub,1,0,0];/haymaker/;32,62,strike,brawl,1,0.05,0];/stomp/;22,80,strike,brawl,$get[aweight]/$get[dweight],0.05,0];/lowblow/;13,90,strike,brawl,1,0,1];/gouge/;11,88,swift,brawl,1+($get[aspeed]-$get[dspeed])/150,0,1];/none/;0,100,action,none,1,0,0];/action/;0,100,action,none,1,0,0];/react/;0,100,action,none,1,0,0];/backoff/;0,100,action,none,1,0,0];/taunt/;0,100,action,none,1,0,0]]
$var[mvkey;/$get[mv]/]

$ignore[==========================================================================
 STEP 7.5 - ESCAPE CONTEST: the chance "escape" rolls against when the fighter
 is held. It sits here on purpose, it needs the attacker and defender stats of
 step 7 and has to be in place before step 8 reads it into "acc". A fighter who
 is not held has nothing to break and rolls against the 100 of its own record.
 escratio = weight + toughness of the escaping fighter over the holder
 escacc   = 10 + 45 * escratio + (speed difference) / 10, kept inside 15 - 90
==========================================================================]

$var[escacc;$ternary[$get[ahold]>0;$get[escclamp];100]]
$var[escclamp;$ternary[$get[escraw]>90;90;$ternary[$get[escraw]<15;15;$get[escraw]]]]
$var[escraw;$fixed[$math[10+45*$get[escratio]+($get[aspeed]-$get[dspeed])/10]]]
$var[escratio;$fixed[$math[($get[aweight]+$get[atough])/($get[dweight]+$get[dtough])];2]]

$ignore[==========================================================================
 STEP 7 - PICK THE ACTOR AND THE TARGET FROM THE SIDE THAT IS MOVING
==========================================================================]

$var[amaxhp;$ternary[$get[isopp]==true;$get[omaxhp];$get[smaxhp]]]
$var[ahp;$ternary[$get[isopp]==true;$get[opphp];$get[selfhp]]]
$var[apower;$ternary[$get[isopp]==true;$get[opower];$get[spower]]]
$var[atough;$ternary[$get[isopp]==true;$get[otough];$get[stough]]]
$var[aspeed;$ternary[$get[isopp]==true;$get[ospeed];$get[sspeed]]]
$var[aheight;$ternary[$get[isopp]==true;$get[oh];$get[sh]]]
$var[aweight;$ternary[$get[isopp]==true;$get[ow];$get[sw]]]

$var[dmaxhp;$ternary[$get[isopp]==true;$get[smaxhp];$get[omaxhp]]]
$var[dhp;$ternary[$get[isopp]==true;$get[selfhp];$get[opphp]]]
$var[dpower;$ternary[$get[isopp]==true;$get[spower];$get[opower]]]
$var[dtough;$ternary[$get[isopp]==true;$get[stough];$get[otough]]]
$var[dspeed;$ternary[$get[isopp]==true;$get[sspeed];$get[ospeed]]]
$var[dheight;$ternary[$get[isopp]==true;$get[sh];$get[oh]]]
$var[dweight;$ternary[$get[isopp]==true;$get[sw];$get[ow]]]
$var[dbuild;$ternary[$get[isopp]==true;$get[sbuild];$get[obuild]]]
$var[dguard;$ternary[$get[isopp]==true;$get[selfguard];$get[oppguard]]]
$var[ahold;$ternary[$get[isopp]==true;$get[opphold];$get[selfhold]]]
$var[dhold;$ternary[$get[isopp]==true;$get[selfhold];$get[opphold]]]

$var[target;$ternary[$get[isopp]==true;self;opponent]]
$var[isopp;$condition[$get[side]==opponent]]

$ignore[==========================================================================
 STEP 6 - LOAD THE FIGHT: create missing keys, read the saved health points,
 start a new battle when there is none or when reset was asked for, then
 make sure the caller is not moving out of turn.
==========================================================================]

$if[$get[side]!=$get[turn];409;{"error": "Out of turn, waiting for the other fighter to move","turn": "$get[turn]"}]
$var[side;$lowercase[$switch[$getQuery[side];$get[turn]]]]
$if[$get[status]==finished;409;{"error": "This battle is over, start a new one with reset=1"}]

$tryIf[$get[newbattle]==true;
@var(selfhp;@get(smaxhp))
@var(opphp;@get(omaxhp))
@var(turn;self)
@var(round;1)
@var(selfguard;0)
@var(oppguard;0)
@var(selfhold;0)
@var(opphold;0)
@var(status;fighting)
@setVar(@get(uid)-battle-status;fighting)]

$var[newbattle;$ternary[$get[reset]==true;true;$ternary[$get[round]==0;true;false]]]

$var[opphp;$ternary[$get[opphp]<0;0;$get[opphp]]]
$var[opphp;$ternary[$get[opphp]>$get[omaxhp];$get[omaxhp];$get[opphp]]]
$var[selfhp;$ternary[$get[selfhp]<0;0;$get[selfhp]]]
$var[selfhp;$ternary[$get[selfhp]>$get[smaxhp];$get[smaxhp];$get[selfhp]]]

$var[status;$switch[$getVar[$get[uid]-battle-status];fighting]]
$var[opphold;$switch[$getVar[$get[uid]-battle-opponent-hold];0]]
$var[selfhold;$switch[$getVar[$get[uid]-battle-self-hold];0]]
$var[oppguard;$switch[$getVar[$get[uid]-battle-opponent-guard];0]]
$var[selfguard;$switch[$getVar[$get[uid]-battle-self-guard];0]]
$var[round;$switch[$getVar[$get[uid]-battle-round];0]]
$var[turn;$switch[$getVar[$get[uid]-battle-turn];self]]
$var[opphp;$switch[$getVar[$get[uid]-battle-opponent-hp];0]]
$var[selfhp;$switch[$getVar[$get[uid]-battle-self-hp];0]]

$tryIf[$hasVar[$get[uid]-battle-status]==false;@setVar(@get(uid)-battle-status;fighting)]
$tryIf[$hasVar[$get[uid]-battle-opponent-hold]==false;@setVar(@get(uid)-battle-opponent-hold;0)]
$tryIf[$hasVar[$get[uid]-battle-self-hold]==false;@setVar(@get(uid)-battle-self-hold;0)]
$tryIf[$hasVar[$get[uid]-battle-opponent-guard]==false;@setVar(@get(uid)-battle-opponent-guard;0)]
$tryIf[$hasVar[$get[uid]-battle-self-guard]==false;@setVar(@get(uid)-battle-self-guard;0)]
$tryIf[$hasVar[$get[uid]-battle-round]==false;@setVar(@get(uid)-battle-round;0)]
$tryIf[$hasVar[$get[uid]-battle-turn]==false;@setVar(@get(uid)-battle-turn;self)]
$tryIf[$hasVar[$get[uid]-battle-opponent-hp]==false;@setVar(@get(uid)-battle-opponent-hp;0)]
$tryIf[$hasVar[$get[uid]-battle-self-hp]==false;@setVar(@get(uid)-battle-self-hp;0)]

$ignore[==========================================================================
 STEP 5 - STATS FROM HEIGHT AND WEIGHT
 max hp, power, toughness, speed, bmi and body build
==========================================================================]

$var[obuild;$ternary[$get[obmi]<20;light;$ternary[$get[obmi]>26;heavy;balanced]]]
$var[ospeed;$ternary[$get[ospeedraw]<5;5;$get[ospeedraw]]]
$var[ospeedraw;$fixed[$math[$get[oh]*0.55-$get[ow]*0.25];1]]
$var[obmi;$fixed[$math[$get[ow]*10000/($get[oh]*$get[oh])];1]]
$var[otough;$fixed[$math[$get[ow]*0.55+$get[oh]*0.15];1]]
$var[opower;$fixed[$math[$get[ow]*0.75+$get[oh]*0.2];1]]
$var[omaxhp;$fixed[$math[60+$get[ow]*1.4+$get[oh]*0.35];0]]

$var[sbuild;$ternary[$get[sbmi]<20;light;$ternary[$get[sbmi]>26;heavy;balanced]]]
$var[sspeed;$ternary[$get[sspeedraw]<5;5;$get[sspeedraw]]]
$var[sspeedraw;$fixed[$math[$get[sh]*0.55-$get[sw]*0.25];1]]
$var[sbmi;$fixed[$math[$get[sw]*10000/($get[sh]*$get[sh])];1]]
$var[stough;$fixed[$math[$get[sw]*0.55+$get[sh]*0.15];1]]
$var[spower;$fixed[$math[$get[sw]*0.75+$get[sh]*0.2];1]]
$var[smaxhp;$fixed[$math[60+$get[sw]*1.4+$get[sh]*0.35];0]]

$ignore[==========================================================================
 STEP 4 - RESOLVE THE MOVE: a known word in "move" wins, otherwise the message
 is scanned for one, and when the message has none either the turn is played as
 the narrative move "none" and the damage calculation is skipped. No move word
 is rejected with a 400 any more, "move_source" says where the move came from.
 The scan is two steps. msgscan is the message in lowercase with every
 character that is not a letter turned into a space and a space in front, so a
 move word is only ever found at the start of a word: "I pinned him" finds pin,
 "hopping" and "helping" do not, and "dropkick" is never read as kick. tail then
 cuts everything in front of the FIRST move word with a lookahead, so the first
 move of the sentence wins and not the first move of the list: "I escape the
 sleeper" escapes, "I taunt him and suplex him" taunts. firstword is that one
 word and scanned resolves it, still with its leading space, so a stem like
 "pinned" or "suplexed" is read as the move it starts with. nodmg is what step
 8, 10 and 12 look at to skip the damage.
==========================================================================]

$var[mvsrc;$ternary[$get[mvok]==1;query;$ternary[$get[scanned]==none;none;message]]]
$var[nodmg;$ternary[$get[mv]==none;1;$ternary[$get[mv]==action;1;$ternary[$get[mv]==react;1;$ternary[$get[mv]==backoff;1;$ternary[$get[mv]==taunt;1;0]]]]]]
$var[mv;$ternary[$get[mvok]==1;$get[mvraw];$get[scanned]]]
$var[mvok;$ternary[$findSplitIndex[$get[mvraw]]==0;0;1]]
$split[jab/punch/kick/headbutt/tackle/throw/clothesline/dropkick/bodyslam/suplex/piledriver/pin/armbar/leglock/choke/sleeper/haymaker/stomp/lowblow/gouge/guard/recover/escape/none/action/react/backoff/taunt;/]
$var[scanned;$ternary[$hasText[$get[firstword]; jab]==true;jab;$ternary[$hasText[$get[firstword]; punch]==true;punch;$ternary[$hasText[$get[firstword]; kick]==true;kick;$ternary[$hasText[$get[firstword]; headbutt]==true;headbutt;$ternary[$hasText[$get[firstword]; tackle]==true;tackle;$ternary[$hasText[$get[firstword]; throw]==true;throw;$ternary[$hasText[$get[firstword]; clothesline]==true;clothesline;$ternary[$hasText[$get[firstword]; dropkick]==true;dropkick;$ternary[$hasText[$get[firstword]; bodyslam]==true;bodyslam;$ternary[$hasText[$get[firstword]; suplex]==true;suplex;$ternary[$hasText[$get[firstword]; piledriver]==true;piledriver;$ternary[$hasText[$get[firstword]; pin]==true;pin;$ternary[$hasText[$get[firstword]; armbar]==true;armbar;$ternary[$hasText[$get[firstword]; leglock]==true;leglock;$ternary[$hasText[$get[firstword]; choke]==true;choke;$ternary[$hasText[$get[firstword]; sleeper]==true;sleeper;$ternary[$hasText[$get[firstword]; haymaker]==true;haymaker;$ternary[$hasText[$get[firstword]; stomp]==true;stomp;$ternary[$hasText[$get[firstword]; lowblow]==true;lowblow;$ternary[$hasText[$get[firstword]; gouge]==true;gouge;$ternary[$hasText[$get[firstword]; guard]==true;guard;$ternary[$hasText[$get[firstword]; recover]==true;recover;$ternary[$hasText[$get[firstword]; escape]==true;escape;$ternary[$hasText[$get[firstword]; none]==true;none;$ternary[$hasText[$get[firstword]; action]==true;action;$ternary[$hasText[$get[firstword]; react]==true;react;$ternary[$hasText[$get[firstword]; backoff]==true;backoff;$ternary[$hasText[$get[firstword]; taunt]==true;taunt;none]]]]]]]]]]]]]]]]]]]]]]]]]]]]]
$var[firstword; $getSplit[2]]
$split[$get[tail]; ]
$var[tail;$replaceRegexp[$get[msgscan];^.*?(?= (jab|punch|kick|headbutt|tackle|throw|clothesline|dropkick|bodyslam|suplex|piledriver|pin|armbar|leglock|choke|sleeper|haymaker|stomp|lowblow|gouge|guard|recover|escape|none|action|react|backoff|taunt));g;]]
$var[msgscan;$replaceRegexp[ $lowercase[$getQuery[message]];[^a-z]+;g; ]]

$ignore[==========================================================================
 STEP 3 - CHECK HEIGHT AND WEIGHT ARE INSIDE A HUMAN RANGE
==========================================================================]

$if[$get[ow]<20;400;{"error": "'opponent_weight' out of range, send a value between 20 and 400 kg"}]
$if[$get[ow]>400;400;{"error": "'opponent_weight' out of range, send a value between 20 and 400 kg"}]
$if[$get[oh]<50;400;{"error": "'opponent_height' out of range, send a value between 50 and 300 cm"}]
$if[$get[oh]>300;400;{"error": "'opponent_height' out of range, send a value between 50 and 300 cm"}]
$if[$get[sw]<20;400;{"error": "'self_weight' out of range, send a value between 20 and 400 kg"}]
$if[$get[sw]>400;400;{"error": "'self_weight' out of range, send a value between 20 and 400 kg"}]
$if[$get[sh]<50;400;{"error": "'self_height' out of range, send a value between 50 and 300 cm"}]
$if[$get[sh]>300;400;{"error": "'self_height' out of range, send a value between 50 and 300 cm"}]

$ignore[==========================================================================
 STEP 2 - CHECK EVERYTHING WAS SENT AND IS A NUMBER
==========================================================================]

$if[$getQuery[message]==undefined;400;{"error": "Missing required query parameter: message"}]
$if[$isNumber[$get[ow]]==false;400;{"error": "'opponent_weight' must be a number in kilograms"}]
$if[$isNumber[$get[oh]]==false;400;{"error": "'opponent_height' must be a number in centimeters"}]
$if[$isNumber[$get[sw]]==false;400;{"error": "'self_weight' must be a number in kilograms"}]
$if[$isNumber[$get[sh]]==false;400;{"error": "'self_height' must be a number in centimeters"}]
$if[$get[uid]==undefined;400;{"error": "Missing required query parameter: userid"}]

$ignore[==========================================================================
 STEP 1 - READ THE INPUT. The own size comes from the query, the rival size
 from the <userid>-oh / -ow keys move.js writes, with the query as a fallback
 when those keys are not there yet
==========================================================================]

$var[uid;$replaceText[$getQuery[userid];";]]
$var[sh;$getQuery[self_height]]
$var[sw;$getQuery[self_weight]]
$setVar[$getQuery[userid]-sh;$getQuery[self_height]]
$setVar[$getQuery[userid]-sw;$getQuery[self_weight]]
$var[oh;$ternary[$isNumber[$get[ohdb]]==true;$get[ohdb];$ternary[$isNumber[$getQuery[opponent_height]]==true;$getQuery[opponent_height];$get[ohdb]]]]
$var[ow;$ternary[$isNumber[$get[owdb]]==true;$get[owdb];$ternary[$isNumber[$getQuery[opponent_weight]]==true;$getQuery[opponent_weight];$get[owdb]]]]
$var[ohdb;$getVar[$getQuery[userid]-oh]]
$var[owdb;$getVar[$getQuery[userid]-ow]]
$var[mvraw;$lowercase[$getQuery[move]]]
$var[msg;$getQuery[message]]
$var[reset;$ternary[$getQuery[reset]==1;true;$ternary[$getQuery[reset]==true;true;false]]]
  `
}
