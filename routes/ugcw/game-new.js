module.exports = { 
  path: "/ugcw/game-new",
  code: `
  $send[200;json;{
  "name": "$getVar[$getQuery[userid]-name]",
  "position": "$getVar[$getQuery[userid]-position]",
  "location": "$getVar[$getQuery[userid]-location]",
  "steps": "0",
  "current_map": "$get[map]"
  }]

$var[map;http://ugcwrp-production.up.railway.app/ugcw/maplocation?userid=$getQuery[userid]&steps=$getVar[$getQuery[userid]-steps]&position=$getVar[$getQuery[userid]-position]&location=$getVar[$getQuery[userid]-location]&time=$getQuery[time]&clock=$getQuery[clock]&stage=$getVar[$getQuery[userid]-stage]]
$setVar[$getQuery[userid]-movement;up]


   $setVar[$getQuery[userid]-steps;0]
   
  $setVar[$getQuery[userid]-name;$getQuery[name]]
  
  $setVar[$getQuery[userid]-position;27]
  
$setVar[$getQuery[userid]-location;ruincity1]

$setVar[$getQuery[userid]-stage;start]

$setVar[$getQuery[userid]-totalcaught;0]

$setVar[$getQuery[userid]-caught;"caught": @right]
$setVar[positionx1;7]
$setVar[positiony1;15]
$setVar[positionx2;187]
$setVar[positiony2;15]
$setVar[positionx3;367]
$setVar[positiony3;15]
$setVar[positionx4;547]
$setVar[positiony4;15]
$setVar[positionx5;727]
$setVar[positiony5;15]
$setVar[positionx6;747]
$setVar[positiony6;15]
$setVar[positionx7;7]
$setVar[positiony7;220]
$setVar[positionx8;187]
$setVar[positiony8;220]
$setVar[positionx9;367]
$setVar[positiony9;220]
$setVar[positionx10;547]
$setVar[positiony10;220]
$setVar[positionx11;727]
$setVar[positiony11;220]
$setVar[positionx12;747]
$setVar[positiony12;220]
$setVar[positionx13;7]
$setVar[positiony13;330]
$setVar[positionx14;187]
$setVar[positiony14;330]
$setVar[positionx15;367]
$setVar[positiony15;330]
$setVar[positionx16;547]
$setVar[positiony16;330]
$setVar[positionx17;727]
$setVar[positiony17;330]
$setVar[positionx18;747]
$setVar[positiony18;330]
$setVar[positionx19;7]
$setVar[positiony19;490]
$setVar[positionx20;187]
$setVar[positiony20;490]
$setVar[positionx21;367]
$setVar[positiony21;490]
$setVar[positionx22;547]
$setVar[positiony22;490]
$setVar[positionx23;727]
$setVar[positiony23;490]
$setVar[positionx24;747]
$setVar[positiony24;490]
$setVar[positionx25;7]
$setVar[positiony25;690]
$setVar[positionx26;187]
$setVar[positiony26;690]
$setVar[positionx27;367]
$setVar[positiony27;690]
$setVar[positionx28;547]
$setVar[positiony28;690]
$setVar[positionx29;727]
$setVar[positiony29;690]
$setVar[positionx30;747]
$setVar[positiony30;690]


$setVar[$getQuery[userid]-potions;0]

$setVar[$getQuery[userid]-pokecoins;500]
$setVar[$getQuery[userid]-fishingrod;0]

$setVar[terrain-ruincity1;x/x/x/x/x/ruincity2/x/x/x/x/x/-/x/x/x/x/x/-/ruincity3/-/-/-/-/-/x/x/-/x/x/x/x/x/-/x/x/x]
$setVar[terrain-ruincity3;water/x/x/x/-/x/water/x/x/x/-/x/water/x/x/x/-/x/water/x/-/-/-/ruincity2/water/x/x/x/x/x/water/water/water/water/x/x]
$setVar[terrain-ruincity2;x/ruincity4/-/-/-/-/x/-/x/x/x/-/x/x/x/x/x/-/x/x/x/x/x/-/x/x/x/x/x/-/x/x/x/x/x/ruincity1]
$setVar[terrain-ruincity5;water/x/x/x/x/x/water/x/x/x/-/ruincity4/water/x/x/x/-/x/water/x/x/x/-/x/water/x/x/x/-/x/water/x/x/x/ruincity3/x]
$setVar[terrain-ruincity4;x/x/x/x/x/x/ruincity5/-/x/x/x/x/x/-/x/x/x/x/x/-/x/x/-/x/x/-/-/-/-/desert1/x/ruincity3/x/x/underground1/x]
  `
}
