module.exports = {
  path: "/ugcw/battle-turn",
  code: `

$ignore[==========================================================================
 STEP 16 - RESPOND: everything below has already been calculated and stored,
 the own turn, the turn the ai answered with and the state after both of them
==========================================================================]

$send[200;json;
  {
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
      "size_source": "$get[shsrc]",
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
      "size_source": "$get[ohsrc]",
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
  }
]

$ignore[==========================================================================
 STEP 15.6 - SECOND DAMAGE CALCULATOR, THE TURN OF THE RIVAL
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

$ignore[15.6a  the state after both halves, what is stored and reported]
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

$ignore[15.6b  APPLY, mirror of step 13/14 with rival attacking]
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

$ignore[15.6c  THE FORMULA, mirror of step 12 + condition factors]
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

$ignore[15.6d  THE DICE, mirror of step 10]
$var[aihit;$ternary[$get[ainodmg]==1;false;$ternary[$get[airolld100]<$get[aiacc];true;false]]]
$tryIf[$get[ainodmg]==0;@var(airolld100;@randomNumber(0;101))@var(aicritroll;@randomNumber(0;101))]
$var[airolld100;0]
$var[aicritroll;100]

$ignore[15.6e  TYPE EFFECTIVENESS, mirror of step 9 vs own build]
$var[aieff;$ternary[$isNumber[$get[aieffraw]]==true;$get[aieffraw];1]]
$var[aieffraw;$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$get[aieffkey];grapple-light;1.25];grapple-balanced;1];grapple-heavy;0.8];charge-light;1.15];charge-balanced;1];charge-heavy;0.9];swift-light;0.9];swift-balanced;1];swift-heavy;1.2];strike-light;1.1];strike-balanced;1];strike-heavy;0.85]]
$var[aieffkey;$get[aitype]-$get[dbuild]]

$ignore[15.6f  THE MOVE RECORD, mirror of step 8]
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

$ignore[15.6g  THE CONTESTED ESCAPE, mirror of step 7.5]
$var[aiescacc;$ternary[$get[ahold]>0;$get[aiescclamp];100]]
$var[aiescclamp;$ternary[$get[aiescraw]>90;90;$ternary[$get[aiescraw]<15;15;$get[aiescraw]]]]
$var[aiescraw;$fixed[$math[10+45*$get[aiescratio]+($get[aspeed]-$get[dspeed])/10]]]
$var[aiescratio;$fixed[$math[($get[aweight]+$get[atough])/($get[dweight]+$get[dtough])];2]]

$ignore[15.6h  THE SCAN OF THE ANSWER, mirror of step 4]
$var[aimvsrc;$ternary[$get[aiok]==1;$ternary[$get[aiscanned]==none;none;reply];unavailable]]
$var[ainodmg;$ternary[$get[aimv]==none;1;$ternary[$get[aimv]==action;1;$ternary[$get[aimv]==react;1;$ternary[$get[aimv]==backoff;1;$ternary[$get[aimv]==taunt;1;0]]]]]]
$var[aimv;$ternary[$get[aiok]==1;$get[aiscanned];none]]
$var[aiscanned;$ternary[$hasText[$get[aifirstword]; jab]==true;jab;$ternary[$hasText[$get[aifirstword]; punch]==true;punch;$ternary[$hasText[$get[aifirstword]; kick]==true;kick;$ternary[$hasText[$get[aifirstword]; headbutt]==true;headbutt;$ternary[$hasText[$get[aifirstword]; tackle]==true;tackle;$ternary[$hasText[$get[aifirstword]; throw]==true;throw;$ternary[$hasText[$get[aifirstword]; clothesline]==true;clothesline;$ternary[$hasText[$get[aifirstword]; dropkick]==true;dropkick;$ternary[$hasText[$get[aifirstword]; bodyslam]==true;bodyslam;$ternary[$hasText[$get[aifirstword]; suplex]==true;suplex;$ternary[$hasText[$get[aifirstword]; piledriver]==true;piledriver;$ternary[$hasText[$get[aifirstword]; pin]==true;pin;$ternary[$hasText[$get[aifirstword]; armbar]==true;armbar;$ternary[$hasText[$get[aifirstword]; leglock]==true;leglock;$ternary[$hasText[$get[aifirstword]; choke]==true;choke;$ternary[$hasText[$get[aifirstword]; sleeper]==true;sleeper;$ternary[$hasText[$get[aifirstword]; haymaker]==true;haymaker;$ternary[$hasText[$get[aifirstword]; stomp]==true;stomp;$ternary[$hasText[$get[aifirstword]; lowblow]==true;lowblow;$ternary[$hasText[$get[aifirstword]; gouge]==true;gouge;$ternary[$hasText[$get[aifirstword]; guard]==true;guard;$ternary[$hasText[$get[aifirstword]; recover]==true;recover;$ternary[$hasText[$get[aifirstword]; escape]==true;escape;$ternary[$hasText[$get[aifirstword]; none]==true;none;$ternary[$hasText[$get[aifirstword]; action]==true;action;$ternary[$hasText[$get[aifirstword]; react]==true;react;$ternary[$hasText[$get[aifirstword]; backoff]==true;backoff;$ternary[$hasText[$get[aifirstword]; taunt]==true;taunt;none]]]]]]]]]]]]]]]]]]]]]]]]]]]]]
$var[aifirstword; $getSplit[2]]
$split[$get[aitail]; ]
$var[aitail;$replaceRegexp[$get[aimscan];^.*?(?= (jab|punch|kick|headbutt|tackle|throw|clothesline|dropkick|bodyslam|suplex|piledriver|pin|armbar|leglock|choke|sleeper|haymaker|stomp|lowblow|gouge|guard|recover|escape|none|action|react|backoff|taunt));g;]]
$var[aimscan;$replaceRegexp[ $lowercase[$getData[response.response]];[^a-z]+;g; ]]

$ignore[15.6i  CONDITION OF THE RIVAL from response.meta.opponent]
$var[aitrap;$ternary[$get[aitraptxt]==true;0.75;1]]
$var[aitraptxt;$ternary[$getData[response.meta.opponent.trapped]==undefined;false;$getData[response.meta.opponent.trapped]]]
$var[aihpf;$fixed[$math[0.7+0.3*$get[aihealth]/100];2]]
$var[aihealth;$ternary[$isNumber[$get[aihealthraw]]==true;$ternary[$get[aihealthraw]>100;100;$ternary[$get[aihealthraw]<0;0;$get[aihealthraw]]];100]]
$var[aihealthraw;$ternary[$getData[response.meta.opponent.health]==undefined;100;$getData[response.meta.opponent.health]]]
$var[aistam;$fixed[$math[0.6+0.4*$get[aistamina]/100];2]]
$var[aistamina;$ternary[$isNumber[$get[aistaminaraw]]==true;$ternary[$get[aistaminaraw]>100;100;$ternary[$get[aistaminaraw]<0;0;$get[aistaminaraw]]];100]]
$var[aistaminaraw;$ternary[$getData[response.meta.opponent.stamina]==undefined;100;$getData[response.meta.opponent.stamina]]]
$var[aiok;$ternary[$get[rpstatus]>0;$ternary[$get[side]==self;$ternary[$get[status]==fighting;1;0];0];0]]

$ignore[15.6j  TURN ROLES AROUND: rival attacks, own defends]
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
 STEP 15.5 - ROLEPLAY: internal GET to /ugcw/roleplay
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
 STEP 15 - PERSIST: save health, holds, turn
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
 STEP 14 - RESOLVE THE TURN: KO, winner, next turn, round
==========================================================================]

$var[roundnew;$ternary[$get[side]==opponent;$fixed[$math[$get[round]+1];0];$get[round]]]
$var[next;$ternary[$get[status]==finished;none;$ternary[$get[side]==self;opponent;self]]]
$var[status;$ternary[$get[winner]==none;fighting;finished]]
$var[winner;$ternary[$get[opphpnew]<=0;$ternary[$get[selfhpnew]<=0;draw;self];$ternary[$get[selfhpnew]<=0;opponent;none]]]
$var[outcome;$ternary[$get[style]==none;action;$ternary[$get[mv]==guard;guard;$ternary[$get[mv]==recover;recover;$ternary[$get[mv]==escape;$ternary[$get[escok]==1;escape;held];$ternary[$get[pintry]==1;pinfall;$ternary[$get[hit]==false;miss;$ternary[$get[crit]>1;critical;$ternary[$get[gmult]<1;guarded;hit]]]]]]]]]

$ignore[==========================================================================
 STEP 13 - APPLY: damage, recoil, healing, holds, pin
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

$var[escok;$ternary[$get[mv]==escape;$ternary[$get[ahold]>0;$ternary[$get[hit]==true;1;0];1];0]]
$var[holdtick;$ternary[$get[ahold]>0;$fixed[$math[$get[ahold]-1]];0]]

$ignore[==========================================================================
 STEP 12 - DAMAGE FORMULA
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
 STEP 11 - PIN
==========================================================================]

$var[pintry;$ternary[$get[mv]==pin;$ternary[$get[hit]==true;$ternary[$get[dpct]<=35;1;0];0];0]]
$var[dpct;$fixed[$math[100*$get[dhp]/$get[dmaxhp]]]]

$ignore[==========================================================================
 STEP 10 - ROLL THE DICE
==========================================================================]

$var[hit;$ternary[$get[nodmg]==1;false;$ternary[$get[rolld100]<$get[acc];true;false]]]
$tryIf[$get[nodmg]==0;@var(rolld100;@randomNumber(0;101))@var(critroll;@randomNumber(0;101))]
$var[rolld100;0]
$var[critroll;100]

$ignore[==========================================================================
 STEP 9 - TYPE EFFECTIVENESS
==========================================================================]

$var[eff;$ternary[$isNumber[$get[effraw]]==true;$get[effraw];1]]
$var[effraw;$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$replaceText[$get[effkey];grapple-light;1.25];grapple-balanced;1];grapple-heavy;0.8];charge-light;1.15];charge-balanced;1];charge-heavy;0.9];swift-light;0.9];swift-balanced;1];swift-heavy;1.2];strike-light;1.1];strike-balanced;1];strike-heavy;0.85]]
$var[effkey;$get[mtype]-$get[dbuild]]

$ignore[==========================================================================
 STEP 8 - MOVE DATABASE
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
 STEP 7.5 - ESCAPE CONTEST
==========================================================================]

$var[escacc;$ternary[$get[ahold]>0;$get[escclamp];100]]
$var[escclamp;$ternary[$get[escraw]>90;90;$ternary[$get[escraw]<15;15;$get[escraw]]]]
$var[escraw;$fixed[$math[10+45*$get[escratio]+($get[aspeed]-$get[dspeed])/10]]]
$var[escratio;$fixed[$math[($get[aweight]+$get[atough])/($get[dweight]+$get[dtough])];2]]

$ignore[==========================================================================
 STEP 7 - PICK ACTOR AND TARGET
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
 STEP 6 - LOAD THE FIGHT
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
 STEP 4 - RESOLVE THE MOVE
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
 STEP 3 - CHECK HEIGHT AND WEIGHT RANGE
==========================================================================]

$ignore[every size is stored or the default, both already known good, so this
 only catches an absurd stored value - the payload names it (source "stored")]
$if[$get[ow]<20;400;{"error": "'opponent_weight' out of range, must be 20-400 kg","got": "$get[ow]","source": "$get[owsrc]"}]
$if[$get[ow]>400;400;{"error": "'opponent_weight' out of range, must be 20-400 kg","got": "$get[ow]","source": "$get[owsrc]"}]
$if[$get[oh]<50;400;{"error": "'opponent_height' out of range, must be 50-300 cm","got": "$get[oh]","source": "$get[ohsrc]"}]
$if[$get[oh]>300;400;{"error": "'opponent_height' out of range, must be 50-300 cm","got": "$get[oh]","source": "$get[ohsrc]"}]
$if[$get[sw]<20;400;{"error": "'self_weight' out of range, must be 20-400 kg","got": "$get[sw]","source": "$get[swsrc]"}]
$if[$get[sw]>400;400;{"error": "'self_weight' out of range, must be 20-400 kg","got": "$get[sw]","source": "$get[swsrc]"}]
$if[$get[sh]<50;400;{"error": "'self_height' out of range, must be 50-300 cm","got": "$get[sh]","source": "$get[shsrc]"}]
$if[$get[sh]>300;400;{"error": "'self_height' out of range, must be 50-300 cm","got": "$get[sh]","source": "$get[shsrc]"}]

$ignore[==========================================================================
 STEP 2 - CHECK REQUIRED INPUTS AND TYPES
==========================================================================]

$if[$getQuery[message]==undefined;400;{"error": "Missing required query parameter: message"}]
$if[$get[uid]==undefined;400;{"error": "Missing required query parameter: userid"}]

$ignore[==========================================================================
 STEP 1 - READ INPUT
==========================================================================]

$var[uid;$replaceText[$getQuery[userid];";]]
$ignore[==========================================================================
 FIGHTER SIZE - read from the game state, never from the query:
   <userid>-sh / -sw are written by game-new for the player,
   <userid>-oh / -ow are written by move for the opponent standing in front
   of the player, so a turn always fights the rival the map handed out.
 A missing value falls back to the same sizes roleplay.js uses
 (183 / 95 / 180 / 80) - that fallback, not the old self_height / self_weight /
 opponent_height / opponent_weight query, is what keeps a caller without saved
 game state from getting a 400. size_source in the answer says which was used
 and the range 400 names it too, so a fight held with default sizes is visible
 instead of silent.
==========================================================================]
$var[sh;$ternary[$isNumber[$get[shdb]]==true;$get[shdb];183]]
$var[sw;$ternary[$isNumber[$get[swdb]]==true;$get[swdb];95]]
$var[oh;$ternary[$isNumber[$get[ohdb]]==true;$get[ohdb];180]]
$var[ow;$ternary[$isNumber[$get[owdb]]==true;$get[owdb];80]]
$ignore[stored or default, reported by the range 400 and in the answer]
$var[shsrc;$ternary[$isNumber[$get[shdb]]==true;stored;default]]
$var[swsrc;$ternary[$isNumber[$get[swdb]]==true;stored;default]]
$var[ohsrc;$ternary[$isNumber[$get[ohdb]]==true;stored;default]]
$var[owsrc;$ternary[$isNumber[$get[owdb]]==true;stored;default]]
$var[shdb;$getVar[$getQuery[userid]-sh]]
$var[swdb;$getVar[$getQuery[userid]-sw]]
$var[ohdb;$getVar[$getQuery[userid]-oh]]
$var[owdb;$getVar[$getQuery[userid]-ow]]
$var[mvraw;$lowercase[$getQuery[move]]]
$var[msg;$getQuery[message]]
$var[reset;$ternary[$getQuery[reset]==1;true;$ternary[$getQuery[reset]==true;true;false]]]

  `
}
