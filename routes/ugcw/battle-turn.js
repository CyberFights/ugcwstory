/*
  ==========================================================================
  UGCW - TURN BASED BATTLE ENGINE  (easy-api.ts 1.2.0)
  ==========================================================================
  Route : GET /ugcw/battle-turn

  Every call resolves ONE turn of the fight: the fighter whose turn it is
  performs one move, damage is calculated, the health points are written to
  the database and the new values are returned as JSON.

  QUERY PARAMETERS
  ----------------
  userid            REQUIRED  battle/save id, all state is stored under it
  self_height       REQUIRED  your height in centimeters      (50 - 300)
  self_weight       REQUIRED  your weight in kilograms        (20 - 400)
  opponent_height   REQUIRED  rival height in centimeters     (50 - 300)
  opponent_weight   REQUIRED  rival weight in kilograms       (20 - 400)
  move              REQUIRED  the move used this turn (see MOVES)
  side              OPTIONAL  self | opponent - defaults to the fighter
                              whose turn it is, sending the wrong side
                              returns 409 "out of turn"
  reset             OPTIONAL  1 | true - wipes the saved battle and starts
                              a new one at full health

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
  escape     support   sub      0   100   none                     breaks free
                                          and heals 5% of max hp

  MOVES - BRAWLING
  ----------------
  move       type      style   power  acc  scaling            recoil  notes
  haymaker   strike    brawl    32    62   none               5%      wild
  stomp      strike    brawl    22    80   weight ratio       5%      wild
  lowblow    strike    brawl    13    90   none               -       sneaky
  gouge      swift     brawl    11    88   speed difference   -       sneaky

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
            - "escape" breaks the hold early and heals 5%
  brawl   wild swings, damage variance 0.70 - 1.30, the two sneaky shots
          ignore "guard" as well

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

  STORED KEYS (database)
  ----------------------
  <userid>-battle-self-hp        <userid>-battle-opponent-hp
  <userid>-battle-turn           <userid>-battle-round
  <userid>-battle-self-guard     <userid>-battle-opponent-guard
  <userid>-battle-self-hold      <userid>-battle-opponent-hold
  <userid>-battle-status

  EXAMPLE
  -------
  GET /ugcw/battle-turn?userid=naicul&self_height=180&self_weight=80
      &opponent_height=170&opponent_weight=60&move=suplex

  {
   "battle_id": "naicul",
   "status": "fighting",
   "winner": "none",
   "round": 1,
   "turn": "opponent",
   "actor": "self",
   "target": "opponent",
   "move": "suplex",
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
   "self":     { "height_cm": 180, "weight_kg": 80, "bmi": 24.7,
                 "build": "balanced", "max_hp": 235, "hp_before": 235,
                 "hp": 226, "power": 96, "toughness": 71, "speed": 79,
                 "guarding": 0, "hold": 0 },
   "opponent": { "height_cm": 170, "weight_kg": 60, "bmi": 20.8,
                 "build": "balanced", "max_hp": 204, "hp_before": 204,
                 "hp": 160, "power": 79, "toughness": 58.5, "speed": 78.5,
                 "guarding": 0, "hold": 0 }
  }

  Send the next call without "side" and it plays for whoever's turn it is,
  status becomes "finished" and "winner" is filled in on a knockout or a
  successful pin.

  NOTE: easy-api.ts executes route code from the BOTTOM line up, so this
  file is written in reverse order of what actually happens. Each block is
  labelled with the step it performs.
  ==========================================================================
*/

module.exports = {
  path: "/ugcw/battle-turn",
  code: `

$ignore[==========================================================================
 STEP 16 - RESPOND: everything below has already been calculated and stored
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
 }
}]

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
$var[outcome;$ternary[$get[mv]==guard;guard;$ternary[$get[mv]==recover;recover;$ternary[$get[mv]==escape;escape;$ternary[$get[pintry]==1;pinfall;$ternary[$get[hit]==false;miss;$ternary[$get[crit]>1;critical;$ternary[$get[gmult]<1;guarded;hit]]]]]]]]

$ignore[==========================================================================
 STEP 13 - APPLY: damage to the defender, recoil and healing to the actor,
 plus the submission holds and the pinfall
==========================================================================]

$var[selfholdnew;$ternary[$get[isopp]==true;$get[dholdnew];$get[aholdnew]]]
$var[oppholdnew;$ternary[$get[isopp]==true;$get[aholdnew];$get[dholdnew]]]
$var[aholdnew;$ternary[$get[mv]==escape;0;$ternary[$get[ahold]>0;$fixed[$math[$get[ahold]-1]];0]]]
$var[dholdnew;$ternary[$get[style]==sub;$ternary[$get[isattack]==1;$ternary[$get[hit]==true;2;$get[dhold]];$get[dhold]];$get[dhold]]]

$var[selfguardnew;$ternary[$get[isopp]==true;$get[dguardnew];$get[aguardnew]]]
$var[oppguardnew;$ternary[$get[isopp]==true;$get[aguardnew];$get[dguardnew]]]
$var[aguardnew;$ternary[$get[mv]==guard;1;0]]
$var[dguardnew;$ternary[$get[isattack]==1;0;$get[dguard]]]
$var[isattack;$ternary[$get[mv]==guard;0;$ternary[$get[mv]==recover;0;$ternary[$get[mv]==escape;0;1]]]]

$var[selfhpnew;$ternary[$get[isopp]==true;$get[dhpnew];$get[ahpnew]]]
$var[opphpnew;$ternary[$get[isopp]==true;$get[ahpnew];$get[dhpnew]]]

$var[ahpnew;$ternary[$get[ahpnew]>$get[amaxhp];$get[amaxhp];$get[ahpnew]]]
$var[ahpnew;$ternary[$get[ahpnew]<0;0;$get[ahpnew]]]
$var[ahpnew;$fixed[$math[$get[ahp]-$get[recoil]+$get[heal]];0]]

$var[dhpnew;$ternary[$get[pintry]==1;0;$get[dhpnew]]]
$var[dhpnew;$ternary[$get[dhpnew]<0;0;$get[dhpnew]]]
$var[dhpnew;$fixed[$math[$get[dhp]-$get[damage]];0]]

$var[heal;$ternary[$get[mv]==recover;$fixed[$math[$get[amaxhp]*0.22];0];$ternary[$get[mv]==escape;$fixed[$math[$get[amaxhp]*0.05];0];0]]]

$var[recoil;$ternary[$get[damage]>0;$ternary[$get[recoilrate]>0;$ternary[$get[recoilcalc]<1;1;$get[recoilcalc]];0];0]]
$var[recoilcalc;$fixed[$math[$get[damage]*$get[recoilrate]];0]]

$ignore[==========================================================================
 STEP 12 - DAMAGE FORMULA
 damage = power * move_scale * attack_ratio * variance * effectiveness
                * guard_multiplier * critical * crank * hold_penalty
==========================================================================]

$var[damage;$ternary[$get[hit]==true;$get[dmgraw];0]]
$var[dmgraw;$fixed[$math[$get[base]*$get[scale]*$get[atkr]*$get[variance]*$get[eff]*$get[gmult]*$get[crit]*$get[crank]*$get[lockpen]];0]]
$var[crank;$ternary[$get[style]==sub;$ternary[$get[dhold]>0;1.35;1];1]]
$var[lockpen;$ternary[$get[ahold]>0;0.75;1]]
$var[gmult;$ternary[$get[pierce]==1;1;$ternary[$get[dguard]==1;0.45;1]]]
$var[crit;$ternary[$get[critroll]<10;1.6;1]]
$var[variance;$fixed[$math[($get[varlo]+$get[rollvar])/100];2]]
$var[rollvar;$randomNumber[0;$get[varspan]]]
$var[varspan;$ternary[$get[style]==brawl;61;31]]
$var[varlo;$ternary[$get[style]==brawl;70;85]]
$var[scale;$ternary[$get[scaleraw]>1.5;1.5;$ternary[$get[scaleraw]<0.7;0.7;$get[scaleraw]]]]
$var[scaleraw;$fixed[$math[$get[scaleexpr]];2]]
$var[atkr;$ternary[$get[atkrraw]>1.6;1.6;$ternary[$get[atkrraw]<0.6;0.6;$get[atkrraw]]]]
$var[atkrraw;$fixed[$math[0.5+0.5*($get[apower]/$get[dtough])];2]]

$ignore[==========================================================================
 STEP 11 - PIN: a pro pinfall ends the fight when the rival is low enough
==========================================================================]

$var[pintry;$ternary[$get[mv]==pin;$ternary[$get[hit]==true;$ternary[$get[dpct]<=35;1;0];0];0]]
$var[dpct;$fixed[$math[100*$get[dhp]/$get[dmaxhp]]]]

$ignore[==========================================================================
 STEP 10 - ROLL THE DICE: accuracy roll, critical roll, damage variance
==========================================================================]

$var[hit;$ternary[$get[rolld100]<$get[acc];true;false]]
$var[rolld100;$randomNumber[0;101]]
$var[critroll;$randomNumber[0;101]]

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
==========================================================================]

$var[recoilrate;$getSplit[6]]
$var[pierce;$getSplit[7]]
$var[scaleexpr;$getSplit[5]]
$var[style;$getSplit[4]]
$var[mtype;$getSplit[3]]
$var[acc;$getSplit[2]]
$var[base;$getSplit[1]]
$split[$get[record];,]
$var[record;$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$get[mvkey];/jab/;10,95,swift,basic,1+($get[aspeed]-$get[dspeed])/150,0,0];/punch/;16,90,strike,basic,1,0,0];/kick/;24,82,strike,basic,1+($get[aheight]-$get[dheight])/200,0,0];/headbutt/;20,85,strike,basic,1+($get[atough]-$get[dtough])/200,0.2,0];/tackle/;30,78,charge,basic,($get[aweight]*2)/($get[aweight]+$get[dweight]),0.15,0];/throw/;28,70,grapple,basic,$get[aweight]/$get[dweight],0,0];/guard/;0,100,support,basic,1,0,0];/recover/;0,100,support,basic,1,0,0];/dropkick/;22,76,swift,pro,1+($get[aspeed]-$get[dspeed])/100,0.2,0];/clothesline/;26,80,charge,pro,($get[aweight]*2)/($get[aweight]+$get[dweight]),0.1,0];/bodyslam/;30,74,grapple,pro,$get[aweight]/$get[dweight],0.15,0];/suplex/;34,70,grapple,pro,$get[aweight]/$get[dweight],0.2,0];/piledriver/;42,60,grapple,pro,$get[aweight]/$get[dweight],0.3,0];/pin/;0,55,grapple,pro,1,0,0];/armbar/;18,70,grapple,sub,1+($get[atough]-$get[dtough])/200,0,1];/leglock/;20,68,grapple,sub,$get[aweight]/$get[dweight],0,1];/choke/;22,66,grapple,sub,1+($get[aheight]-$get[dheight])/200,0,1];/sleeper/;24,64,grapple,sub,$get[aweight]/$get[dweight],0,1];/escape/;0,100,support,sub,1,0,0];/haymaker/;32,62,strike,brawl,1,0.05,0];/stomp/;22,80,strike,brawl,$get[aweight]/$get[dweight],0.05,0];/lowblow/;13,90,strike,brawl,1,0,1];/gouge/;11,88,swift,brawl,1+($get[aspeed]-$get[dspeed])/150,0,1]]
$var[mvkey;/$get[mv]/]

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
 STEP 4 - CHECK THE MOVE IS ONE OF THE KNOWN MOVES
==========================================================================]

$if[$findSplitIndex[$get[mv]]==0;400;{"error": "Unknown move, valid moves are jab, punch, kick, headbutt, tackle, throw, guard, recover, clothesline, dropkick, bodyslam, suplex, piledriver, pin, armbar, leglock, choke, sleeper, escape, haymaker, stomp, lowblow, gouge"}]
$split[jab/punch/kick/headbutt/tackle/throw/guard/recover/clothesline/dropkick/bodyslam/suplex/piledriver/pin/armbar/leglock/choke/sleeper/escape/haymaker/stomp/lowblow/gouge;/]

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

$if[$getQuery[move]==undefined;400;{"error": "Missing required query parameter: move"}]
$if[$isNumber[$get[ow]]==false;400;{"error": "'opponent_weight' must be a number in kilograms"}]
$if[$isNumber[$get[oh]]==false;400;{"error": "'opponent_height' must be a number in centimeters"}]
$if[$isNumber[$get[sw]]==false;400;{"error": "'self_weight' must be a number in kilograms"}]
$if[$isNumber[$get[sh]]==false;400;{"error": "'self_height' must be a number in centimeters"}]
$if[$get[uid]==undefined;400;{"error": "Missing required query parameter: userid"}]

$ignore[==========================================================================
 STEP 1 - READ THE INPUT
==========================================================================]

$var[uid;$replaceText[$getQuery[userid];";]]
$var[sh;$getQuery[self_height]]
$var[sw;$getQuery[self_weight]]
$var[oh;$getQuery[opponent_height]]
$var[ow;$getQuery[opponent_weight]]
$var[mv;$lowercase[$getQuery[move]]]
$var[reset;$ternary[$getQuery[reset]==1;true;$ternary[$getQuery[reset]==true;true;false]]]
  `
}
