'use strict';

const TownArt=(()=>{
  function buildings(ctx,lit,{polygon,ellipse,line}){
    const poly=(points,color)=>polygon(ctx,points,color);
    const oval=(x,y,w,h,color)=>ellipse(ctx,x,y,w,h,color);
    const stroke=(points,color,width=1)=>line(ctx,points,color,width);
    function rect(x,y,w,h,color){
      ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
    }
    function window(x,y,w,h,color='#567675'){
      rect(x-2,y-2,w+4,h+4,'#594e45');
      rect(x,y,w,h,lit?'#ffd388':color);
      stroke([[x+w/2,y],[x+w/2,y+h]],'#f4dcab');
      stroke([[x,y+h*.52],[x+w,y+h*.52]],'#f4dcab');
      rect(x-3,y+h+1,w+6,3,'#c59e73');
    }
    function door(x,y,w,h,color){
      rect(x-2,y-2,w+4,h+2,'#5e5146');
      rect(x,y,w,h,color);
      oval(x+w-3,y+h*.62,1.2,1.2,'#efc974');
    }
    function roof(points,color,shine){
      poly(points,color);
      stroke([points[0],points[1],points[2]],shine,2);
    }
    function sign(text,x,y,color){
      ctx.font='bold 8px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';
      rect(x-18,y-6,36,12,color);ctx.fillStyle='#fff1ca';ctx.fillText(text,x,y);
    }
    function planter(x,y){
      oval(x,y+2,10,3,'#38573655');rect(x-7,y-1,14,4,'#985d4d');
      for(let i=-2;i<=2;i++)oval(x+i*2.7,y-2-Math.abs(i%2)*2,2,2,['#eac468','#ec977b','#fff3ce'][Math.abs(i)%3]);
    }

    // Tall blue cottage, with a dormer and shingled gable.
    oval(115,212,48,12,'#3d503442');
    poly([[80,165],[99,145],[148,160],[159,171],[159,207],[80,207]],'#749592');
    poly([[148,163],[166,153],[166,196],[159,207],[148,207]],'#587e7b');
    for(let y=170;y<207;y+=5)stroke([[82,y],[148,y]],'#d7e0bb48');
    rect(131,133,10,28,'#ac7966');
    roof([[72,174],[111,131],[157,173],[111,161]],'#425971','#7891a0');
    poly([[111,131],[130,124],[173,155],[157,173]],'#57677a');
    for(let i=0;i<5;i++)stroke([[83+i*5,166-i*6],[144-i*5,167-i*6]],'#91a7a057');
    window(105,150,10,10);window(87,178,14,13);window(131,177,13,13);
    door(108,183,13,24,'#ad7658');
    stroke([[104,209],[126,209]],'#e6c49b',3);planter(94,205);planter(139,205);

    // Cream courtyard house and its enclosed garden.
    oval(232,205,59,13,'#3d503442');rect(181,157,79,49,'#e8ce98');
    poly([[260,157],[278,147],[278,195],[260,206]],'#b19b6e');
    roof([[171,158],[195,135],[265,135],[278,153],[258,162]],'#af695a','#de9b7a');
    for(let y=143;y<158;y+=4)stroke([[191-(y-143)*.7,y],[264+(y-143)*.55,y]],'#e5a08786');
    window(193,168,12,15);window(235,168,13,15);door(216,176,13,30,'#667d63');
    stroke([[264,210],[303,208],[303,187]],'#e7d1a0',3);
    for(const x of [266,276,286,299])stroke([[x,203],[x,214]],'#d9bd83',2);
    planter(194,203);planter(246,202);oval(289,194,9,11,'#72935d');

    // Brick duplex and whitewashed gardener’s cottage.
    oval(150,277,47,11,'#3d503442');rect(114,233,77,40,'#bf8067');
    poly([[191,233],[200,226],[200,267],[191,273]],'#966d57');
    roof([[105,234],[122,211],[181,211],[200,225],[191,236]],'#744c53','#b07373');
    for(let y=241;y<268;y+=6)stroke([[116,y],[188,y]],'#e4a88588');
    window(124,242,13,12);window(166,242,13,12);door(144,248,14,25,'#5e6267');
    planter(126,270);planter(178,270);
    oval(254,281,49,10,'#3d503442');rect(224,242,64,34,'#f3e3ba');
    roof([[212,245],[249,214],[297,242],[289,246]],'#7e6d83','#af94ac');
    stroke([[230,238],[251,219],[279,236]],'#c7adc579');
    window(230,251,13,12);door(253,250,13,26,'#8d765d');window(272,252,11,11);
    oval(302,270,9,8,'#789454');planter(231,275);planter(281,274);

    // Bakery: brick oven chimney, curved shop window and striped canopy.
    oval(428,221,60,11,'#3d503442');rect(378,163,97,51,'#d5a680');
    poly([[475,164],[488,151],[488,202],[475,214]],'#9a755d');
    rect(460,128,13,31,'#9e6856');rect(457,124,18,5,'#d99c73');
    roof([[366,166],[389,143],[472,143],[489,153],[476,168]],'#995640','#d38660');
    for(let y=150;y<165;y+=4)stroke([[388,y],[479,y]],'#e2a27572');
    for(let y=173;y<213;y+=6)stroke([[380,y],[474,y]],'#eed0a780');
    window(390,185,24,18);window(445,185,20,18);door(422,187,14,27,'#805747');
    poly([[384,181],[465,181],[474,190],[381,190]],'#f5e0ad');
    for(let x=386;x<464;x+=13)poly([[x,181],[x+6,181],[x+9,190],[x+1,190]],'#ab674b');
    sign('BAKERY',424,174,'#804f41');planter(467,211);
    oval(388,215,8,4,'#a2754f');oval(387,213,4,1.5,'#eec278');

    // Café: a glazed corner room and a little terrace.
    oval(573,207,64,12,'#3d503442');rect(516,147,103,50,'#cfb67d');
    poly([[619,148],[636,138],[636,185],[619,197]],'#8a9a6a');
    roof([[507,149],[528,125],[616,125],[637,137],[620,152]],'#4e765f','#8aa483');
    for(let x=532;x<=616;x+=11)stroke([[x,128],[x-5,147]],'#92aa8277');
    rect(521,160,91,32,'#587961');
    for(let x=527;x<=595;x+=19)window(x,167,13,21,'#68958b');
    sign('CAFÉ',568,157,'#3d6958');
    door(610,170,11,27,'#5c785e');planter(521,197);planter(610,200);
    stroke([[645,206],[645,225]],'#6d624c',2);oval(645,215,13,4,'#866550');
    poly([[622,208],[645,187],[667,208]],'#d9a15f');
    poly([[632,208],[645,187],[654,208]],'#f2cc88');
    stroke([[625,209],[664,209]],'#a77555',2);
    oval(629,223,5,3,'#ad865a');oval(660,224,5,3,'#ad865a');

    // Market: a timber hall and two separate open stalls.
    oval(762,221,63,14,'#3d503442');rect(721,164,85,52,'#d8b990');
    poly([[806,164],[823,153],[823,204],[806,216]],'#b78b65');
    roof([[708,165],[759,126],[822,155],[808,167]],'#b77c42','#e4ae66');
    for(let y=143;y<=162;y+=5)stroke([[758-(y-130)*1.18,y],[760+(y-130)*1.8,y]],'#f1bf7280');
    for(const x of [725,748,774,798])stroke([[x,170],[x,214]],'#6e533e',4);
    rect(752,186,19,30,'#665d48');window(731,179,10,12);window(781,178,12,13);
    sign('MARKET',761,173,'#715738');
    for(const [x,y,color] of [[829,217,'#bd7964'],[871,228,'#6a9379']]){
      stroke([[x-14,y-10],[x-14,y+15]],'#725743',2);stroke([[x+14,y-10],[x+14,y+15]],'#725743',2);
      poly([[x-20,y],[x-12,y-16],[x+14,y-16],[x+20,y]],color);
      for(let i=-1;i<=1;i++)poly([[x+i*10-2,y],[x+i*7-2,y-16],[x+i*7+2,y-16],[x+i*10+2,y]],'#f2d7a4');
      rect(x-15,y+9,30,6,'#9e7850');
      for(let i=0;i<5;i++)oval(x-10+i*5,y+8,3,2,i%2?'#d8a058':'#8daa62');
    }

    // Station: a long platform, tiled wings and a central clock tower.
    oval(818,455,69,12,'#3d503442');rect(758,445,125,12,'#d8be8e');
    rect(773,404,89,42,'#d6b892');rect(802,383,35,63,'#e7cfa5');
    poly([[862,404],[874,397],[874,437],[862,446]],'#a98768');
    roof([[764,408],[782,388],[854,388],[875,398],[863,409]],'#a55e52','#d58b73');
    rect(802,377,35,30,'#e9d0a5');
    roof([[796,379],[819,351],[845,379],[837,381]],'#725060','#ba8692');
    oval(819,390,10,10,'#6b6556');oval(819,390,8,8,'#f9e7b5');
    stroke([[819,385],[819,390],[823,391]],'#786450',1.3);
    window(782,415,12,12);window(843,415,12,12);door(812,415,15,31,'#7a7060');
    stroke([[759,450],[878,450]],'#f2d4a2',2);sign('STATION',819,411,'#875a53');
  }

  function landscape(ctx,{ellipse,line}){
    const oval=(x,y,w,h,color)=>ellipse(ctx,x,y,w,h,color);
    const stroke=(points,color,width)=>line(ctx,points,color,width);
    // Sloped orchard and riverbank details.
    for(let i=0;i<6;i++)stroke([[681+i*18,86],[698+i*18,79],[725+i*18,81]],'#8c9e5b68',3);
    for(let i=0;i<18;i++){
      const x=65+(i*47)%822,y=66+(i*31)%49;
      oval(x,y,6,2,'#657d4650');oval(x,y-3,3,3,i%3?'#9bab61':'#dec476');
    }
    for(const [x,y] of [[96,512],[175,496],[299,499],[418,451],[548,488],[680,523],[744,530],[831,542],[921,513]]){
      stroke([[x-4,y],[x-7,y-11],[x,y-2],[x+2,y-14],[x+3,y-1],[x+8,y-9]],'#6c8b60',2);
      oval(x+9,y+3,6,3,'#91a89a');
    }
    for(let i=0;i<62;i++){
      const x=20+(i*79)%922,y=90+(i*53)%490;
      if((x>70&&x<310&&y>125&&y<327)||(x>365&&y>125&&y<300)||(x>465&&x<885&&y>313&&y<490)||y>463)continue;
      oval(x,y,3,1.6,'#74894a');
      oval(x+2,y-2,1.8,1.8,['#f1d07f','#f3de9a','#e5ae8b'][i%3]);
    }
    // Two benches give the square and riverside different silhouettes.
    for(const [x,y] of [[493,344],[615,401],[723,484]]){
      stroke([[x-8,y-5],[x+8,y-5]],'#946e50',3);
      stroke([[x-8,y],[x+8,y]],'#bf9665',3);
      stroke([[x-6,y],[x-6,y+4]],'#75654e',1.6);
      stroke([[x+6,y],[x+6,y+4]],'#75654e',1.6);
    }
  }
  function keepsakes(ctx,collection,night,{polygon,ellipse,line}){
    const oval=(x,y,w,h,color)=>ellipse(ctx,x,y,w,h,color);
    const stroke=(points,color,width)=>line(ctx,points,color,width);
    for(const key of collection){
      if(key===0){
        polygon(ctx,[[808,231],[840,228],[847,240],[812,245]],'#eac59c');
        stroke([[813,245],[813,250]],'#806449',2);stroke([[842,241],[842,246]],'#806449',2);
        for(const [x,y] of [[817,237],[827,235],[836,235]])oval(x,y,4,2.5,'#be8450');
      }else if(key===1){
        stroke([[476,302],[503,315],[530,319],[572,320],[606,309],[620,298]],'#7f6b4b',1.5);
        for(const [x,y] of [[481,306],[505,318],[529,322],[551,323],[574,323],[596,315],[614,305]]){
          if(night)oval(x,y,11,9,'#f8d76f50');
          oval(x,y,4.4,5.1,'#ec9b57');oval(x,y,2,3,'#f9db93');
        }
      }else{
        const [x,y]=[[845,481],[650,235],[192,449],[490,397]][key-2];
        stroke([[x-6,y],[x-6,y+12]],'#6b5643',2);stroke([[x+6,y],[x+6,y+12]],'#6b5643',2);
        stroke([[x-9,y-2],[x+9,y-2]],['#946a50','#a76553','#a77b54','#a87666'][key-2],10);
        for(let i=-1;i<=1;i++)stroke([[x+i*5-1,y-4],[x+i*5+1,y-4]],'#f5dba3',2);
      }
    }
  }
  return {buildings,landscape,keepsakes};
})();
