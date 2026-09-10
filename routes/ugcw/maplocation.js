module.exports = {
  path: "/ugcw/maplocation",
  code: `
  $send[200;canvas;$default]
  $tryif[$getVar[$getQuery[userid]-stage]==1&&$getVar[$getQuery[userid]-location]==route1;@setVar(@getQuery(userid)-stage;2)]
  $drawText[$getQuery[time];90;727;200;80]
  $drawText[$replaceText[$getQuery[clock];";];15;725;200;80]
  $font[40;como]
  $color[#000000]
  $registerFont[./assets/fonts/Comunismo.ttf;como]
  $opacity[100]
  $tryif[$getVar[$getQuery[userid]-stage]==start&&$getVar[$getQuery[userid]-position]==15;
  @drawText(Let me free @getVar(@getQuery(userid)-name);@math(@getVar(positionx20)+15);@math(@getVar(positiony20)+10);@get(w);@get(h))
  @drawImage(textbox;@getVar(positionx20);@getVar(positiony20);@math(@get(w)+50);@math(@get(h)+50))
  @loadImage(textbox;path;./assets/images/comicbox2.png)
  @var(h;@measureText(Let me free @getVar(@getQuery(userid)-name);height))
  @var(w;@measureText(Let me free @getVar(@getQuery(userid)-name);width))
  @font(40;Arial;bold)
  @color(#000000)]


  $drawImage[1;$getVar[positionx$getVar[$getQuery[userid]-position]];$getVar[positiony$getVar[$getQuery[userid]-position]];80;90]
  $loadImage[1;path;./naicul-walk-$getVar[$getQuery[userid]-movement].png]
 
  $drawImage[base;0;0;800;800]
  $tryif[$getVar[$getQuery[userid]-location]==home-town;@setVar(@getQuery(userid)-townsfolk;momfront.png|momback.png|person1front.png|person1back.png|8|14|16|22)]
$tryif[$getVar[$getQuery[userid]-location]==route1;@setVar(@getQuery(userid)-townsfolk;@ternary(@getVar(@getQuery(userid)-stage)==1;stranger1side.png;assets/chess/blank.png)|@ternary(@getVar(@getQuery(userid)-stage)==1;stranger1side.png;assets/chess/blank.png)|@ternary(@getVar(@getQuery(userid)-stage)==1;stranger1side.png;assets/chess/blank.png)|@ternary(@getVar(@getQuery(userid)-stage)==1;stranger1side.png;assets/chess/blank.png)|17|17|17|17)]
  $loadImage[base;path;./$getVar[$getQuery[userid]-location].jpg]
  $createCanvas[800;800]
  `}
