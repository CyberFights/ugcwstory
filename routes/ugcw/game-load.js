module.exports = {
  path: "/ugcw/game-load",
  code: `
  $send[200;json;{
  "location": "$getVar[$getQuery[userid]-location]",
  "position": "$getVar[$getQuery[userid]-position]",
  "terrain": "$getVar[pokelocation$getVar[$getQuery[userid]-position]]",
  "above": "$get[above]",
  "below": "$get[below]",
  "right": "$get[right]",
  "left": "$get[left]",
  "stage": "$getVar[$getQuery[userid]-stage]",
  "current_map": "$get[map]"
  }]
  $var[map;http://shadows-api-pokemon.shadowsnemesis.repl.co/game/pokemon/maplocation?userid=$getQuery[userid]&steps=$getVar[$getQuery[userid]-steps]&position=$getVar[$getQuery[userid]-position]&location=$getVar[$getQuery[userid]-location]&time=$getQuery[time]&clock=$getQuery[clock]&stage=$getVar[$getQuery[userid]-stage]]

  $setVar[$getQuery[userid]-clock;$getQuery[clock]]

  $setVar[$getQuery[userid]-movement;stand]
  $setVar[$getQuery[userid]-time;$ternary[$getQuery[time]==AM;day;$ternary[$getQuery[time]==PM;night;]]]
  $var[above;$getVar[pokelocation$math[$getVar[$getQuery[userid]-position]-6]]]
  $var[below;$getVar[pokelocation$math[$getVar[$getQuery[userid]-position]+6]]]
  $var[right;$getVar[pokelocation$math[$getVar[$getQuery[userid]-position]+1]]]
  $var[left;$getVar[pokelocation$math[$getVar[$getQuery[userid]-position]-1]]]

  $setVar[pokelocation36;$getSplit[36]]
  $setVar[pokelocation35;$getSplit[35]]
  $setVar[pokelocation34;$getSplit[34]]
  $setVar[pokelocation33;$getSplit[33]]
  $setVar[pokelocation32;$getSplit[32]]
  $setVar[pokelocation31;$getSplit[31]]
  $setVar[pokelocation30;$getSplit[30]]
  $setVar[pokelocation29;$getSplit[29]]
  $setVar[pokelocation28;$getSplit[28]]
  $setVar[pokelocation27;$getSplit[27]]
  $setVar[pokelocation26;$getSplit[26]]
  $setVar[pokelocation25;$getSplit[25]]
  $setVar[pokelocation24;$getSplit[24]]
  $setVar[pokelocation23;$getSplit[23]]
  $setVar[pokelocation22;$getSplit[22]]
  $setVar[pokelocation21;$getSplit[21]]
  $setVar[pokelocation20;$getSplit[20]]
  $setVar[pokelocation19;$getSplit[19]]
  $setVar[pokelocation18;$getSplit[18]]
  $setVar[pokelocation17;$getSplit[17]]
  $setVar[pokelocation16;$getSplit[16]]
  $setVar[pokelocation15;$getSplit[15]]
  $setVar[pokelocation14;$getSplit[14]]
  $setVar[pokelocation13;$getSplit[13]]
  $setVar[pokelocation12;$getSplit[12]]
  $setVar[pokelocation11;$getSplit[11]]
  $setVar[pokelocation10;$getSplit[10]]
  $setVar[pokelocation9;$getSplit[9]]
  $setVar[pokelocation8;$getSplit[8]]
  $setVar[pokelocation7;$getSplit[7]]
  $setVar[pokelocation6;$getSplit[6]]
  $setVar[pokelocation5;$getSplit[5]]
  $setVar[pokelocation4;$getSplit[4]]
  $setVar[pokelocation3;$getSplit[3]]
  $setVar[pokelocation2;$getSplit[2]]
  $setVar[pokelocation1;$getSplit[1]]
  $split[$getVar[terrain-$getVar[$getQuery[userid]-location]];/]
  
  
  `}
