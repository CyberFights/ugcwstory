module.exports = {
  path: "/ugcw/move",
  code: `
  $send[200;json;{
  "location": "$getVar[$getQuery[userid]-location]",
  "position": "$getVar[$getQuery[userid]-position]",
  "terrain": "$get[terrain]",
  "movement": "$getQuery[movement]",
  "above": "$get[above]",
  "below": "$get[below]",
  "right": "$get[right]",
  "left": "$get[left]",
  "stage": "$getVar[$getQuery[userid]-stage]",
  "current_map": "$get[map]",
  "encountered": "$getVar[$getQuery[userid]-encounter]",
  "battle_image": "https://raw.githubusercontent.com/CyberFights/ugcwstory/refs/heads/main/assets/images/$getVar[$getQuery[userid]-location]-$getVar[$getQuery[userid]-opponent].jpeg",
  "opponent": "$getVar[$getQuery[userid]-opponent]",
  "opponent_height": "$getVar[$getQuery[userid]-oh]",
   "opponent_weight": "$getVar[$getQuery[userid]-ow]"
  }]
  $var[map;http://ugcwrp-production.up.railway.app/ugcw/maplocation?userid=$getQuery[userid]&steps=$getVar[$getQuery[userid]-steps]&position=$getVar[$getQuery[userid]-position]&location=$getVar[$getQuery[userid]-location]&time=$getQuery[time]&clock=$getQuery[clock]&stage=$getVar[$getQuery[userid]-stage]]

  $setVar[$getQuery[userid]-clock;$getQuery[clock]]
  $setVar[$getQuery[userid]-steps;$getQuery[steps]]

  $setVar[$getQuery[userid]-time;$ternary[$getQuery[time]==AM;day;$ternary[$getQuery[time]==PM;night;]]]
    $tryIf[$getVar[$getQuery[userid]-opponent]==lizard;@setVar(@getQuery(userid)-oh;183) @setVar(@getQuery(userid)-ow;75)]
  $tryIf[$getVar[$getQuery[userid]-opponent]==bandit;@setVar(@getQuery(userid)-oh;177) @setVar(@getQuery(userid)-ow;79)]
  $tryIf[$getVar[$getQuery[userid]-chance]==true;@setVar(@getQuery(userid)-encounter;true)]
  $setVar[$getQuery[userid]-chance;$random[true;false;false]]
  $tryIf[$getVar[$getQuery[userid]-location]==ruincity1;@setVar(@getQuery(userid)-opponent;@get(random))
@var(random;@random(lizard;bandit))]
  $tryIf[$getVar[$getQuery[userid]-location]==ruincity2;@setVar(@getQuery(userid)-opponent;@get(random))
@var(random;@random(lizard;bandit))]
  $tryIf[$getVar[$getQuery[userid]-location]==ruincity3;@setVar(@getQuery(userid)-opponent;@get(random))
@var(random;@random(lizard;bandit))]
  $tryIf[$getVar[$getQuery[userid]-location]==ruincity4;@setVar(@getQuery(userid)-opponent;@get(random))
@var(random;@random(lizard;bandit))]
  $tryIf[$getVar[$getQuery[userid]-location]==ruincity5;@setVar(@getQuery(userid)-opponent;@get(random))
@var(random;@random(lizard;bandit))]

  $var[terrain;$getSplit[$getVar[$getQuery[userid]-position]]]
  $var[above;$ternary[$getVar[$getQuery[userid]-position]>6;$getSplit[$math[$getVar[$getQuery[userid]-position]-6]];x]]
  $var[below;$ternary[$getVar[$getQuery[userid]-position]<31;$getSplit[$math[$getVar[$getQuery[userid]-position]+6]];x]]
  $var[right;$ternary[$math[$getVar[$getQuery[userid]-position]%6]!=0;$getSplit[$math[$getVar[$getQuery[userid]-position]+1]];x]]
  $var[left;$ternary[$math[($getVar[$getQuery[userid]-position]-1)%6]!=0;$getSplit[$math[$getVar[$getQuery[userid]-position]-1]];x]]
  $split[$getVar[terrain-$getVar[$getQuery[userid]-location]];/]

  $tryIf[$get[targetterrain]==route1;@setVar(@getQuery(userid)-location;route1) @setVar(@getQuery(userid)-position;@replaceText(@replaceText(@getQuery(movement);right;13);left;18))]
  $tryIf[$get[targetterrain]==ruincity4;@setVar(@getQuery(userid)-location;ruincity4) @setVar(@getQuery(userid)-position;31) @setVar(@getQuery(userid)-movement;up)]
  $tryIf[$get[targetterrain]==ruincity3;@setVar(@getQuery(userid)-location;ruincity3) @setVar(@getQuery(userid)-position;18)]
  $tryIf[$get[targetterrain]==ruincity1;@setVar(@getQuery(userid)-location;ruincity1) @setVar(@getQuery(userid)-position;6)]
  $tryIf[$get[targetterrain]==ruincity2;@setVar(@getQuery(userid)-location;ruincity2) @setVar(@getQuery(userid)-position;30)]

  $setVar[$getQuery[userid]-movement;$getQuery[movement]]
  $tryIf[$get[walkable]==true;@setVar(@getQuery(userid)-position;@get(target))]
  $if[$get[delta]==0;400;{"error": "'movement' must be up, down, left, or right"}]
  $if[$get[amount]<1;400;{"error": "'amount' must be a positive integer"}]
  $if[$math[$get[amount]%1]!=0;400;{"error": "'amount' must be a positive integer"}]
  $var[walkable;$ternary[$get[target]<1;false;$ternary[$get[target]>36;false;$ternary[$getQuery[movement]==right;$ternary[$math[($getVar[$getQuery[userid]-position]-1)%6]+$get[amount]<6;$get[targetterrain]!=x;false];$ternary[$getQuery[movement]==left;$ternary[$get[amount]<=$math[($getVar[$getQuery[userid]-position]-1)%6];$get[targetterrain]!=x;false];$get[targetterrain]!=x]]]]]
  $var[targetterrain;$getSplit[$get[target]]]
  $split[$getVar[terrain-$getVar[$getQuery[userid]-location]];/]
  $var[target;$math[$getVar[$getQuery[userid]-position]+$get[delta]*$get[amount]]]
  $var[delta;$ternary[$getQuery[movement]==up;-6;$ternary[$getQuery[movement]==down;6;$ternary[$getQuery[movement]==right;1;$ternary[$getQuery[movement]==left;-1;0]]]]]
  $var[amount;$ternary[$isNumber[$getQuery[amount]]==true;$getQuery[amount];1]]
$setVar[$getQuery[userid]-encounter;false]  
  `}
