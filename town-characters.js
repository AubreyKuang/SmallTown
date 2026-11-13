'use strict';

const TownCharacters=(()=>{
  // ID order follows world.js, town-school.js, and town-build.js. Named visitors use their sprite IDs.
  // Outfit and hairstyle are independent of gender. The same design travels with a resident through saves.
  const designs=[
    ['女','bun','apron','berry','ribbon'],
    ['男','sweep','vest','ocean','satchel'],
    ['男','side','coat','fern','glasses'],
    ['女','bob','skirt','amber','clip'],
    ['男','crop','jacket','clay','cap'],
    ['女','long','coat','plum','scarf'],
    ['女','braid','skirt','fern','satchel'],
    ['男','curls','vest','clay','scarf'],
    ['女','side','jacket','ocean','glasses'],
    ['男','sweep','coat','amber','cap'],
    ['女','bob','skirt','plum','ribbon'],
    ['男','curls','vest','fern','satchel'],
    ['女','long','jacket','ocean','clip'],
    ['男','crop','coat','berry','scarf'],
    ['女','bun','skirt','clay','glasses'],
    ['男','side','jacket','ocean','cap'],
    ['女','braid','apron','amber','scarf'],
    ['男','sweep','coat','fern','satchel'],
    ['女','curls','jacket','berry','clip'],
    ['男','crop','vest','plum','cap'],
    ['女','braid','jacket','clay','ribbon'],
    ['男','curls','coat','ocean','glasses'],
    ['女','long','skirt','amber','clip'],
    ['男','side','vest','fern','scarf'],
    ['女','bun','coat','ocean','glasses'],
    ['女','braid','skirt','berry','ribbon'],
    ['男','curls','jacket','amber','satchel'],
    ['男','crop','vest','ocean','cap'],
    ['女','bob','jacket','plum','clip'],
    ['女','long','coat','fern','satchel'],
    ['男','crop','jacket','ocean','scarf'],
    ['女','braid','skirt','clay','ribbon'],
    ['女','bob','apron','berry','clip'],
    ['女','side','jacket','amber','glasses'],
    ['男','curls','vest','plum','satchel'],
    ['女','bun','coat','plum','scarf'],
    ['男','sweep','jacket','berry','cap'],
    ['女','curls','apron','ocean','ribbon'],
    ['男','side','coat','amber','glasses'],
    ['女','long','skirt','fern','clip'],
    ['男','crop','vest','clay','satchel']
  ];
  const visitors={
    105:['男','side','coat','plum','glasses'],
    106:['女','bob','jacket','clay','beret']
  };
  const outfits={
    berry:['#a64b52','#773443','#f3bc9f'],
    ocean:['#46778b','#305462','#c8e2dc'],
    fern:['#607d55','#3d553d','#dce6ab'],
    amber:['#b58238','#785226','#fae5aa'],
    clay:['#ad6746','#744633','#f8d3a2'],
    plum:['#7f6395','#563f6d','#e7cfe9']
  };
  const colors=Object.keys(outfits);
  const skins=['#f1c998','#c78c66','#e8ae81','#985e49','#f5d3aa','#d29972'];
  const hairColors=['#56352b','#664334','#302f31','#75412e','#50372a','#422c35','#845138','#322e29'];
  const fallbackHair=['crop','bob','sweep','curls'];
  const fallbackCoat=['coat','jacket','vest'];
  const fallbackGear=['cap','scarf','satchel','beret'];
  const labels={
    bun:'盘发',sweep:'侧梳短发',side:'侧分发',bob:'齐耳短发',crop:'短发',long:'披肩发',braid:'辫子',curls:'卷发',
    ribbon:'发带',satchel:'斜挎包',glasses:'圆眼镜',clip:'发夹',cap:'便帽',scarf:'围巾',beret:'贝雷帽'
  };
  const looks=new Map();
  function appearance(id){
    const design=designs[id-1]??visitors[id];
    const key=design?id:-1-id%24;
    if(!looks.has(key)){
      const [gender,hair,cut,palette,gear]=design??
        [null,fallbackHair[id%4],fallbackCoat[id%3],colors[id%colors.length],fallbackGear[id%4]];
      const [cloth,shade,trim]=outfits[palette];
      looks.set(key,{gender,hair,cut,gear,cloth,shade,trim,skin:skins[(id*5+1)%skins.length],
        hairColor:hairColors[(id*3+5)%hairColors.length],details:`${labels[hair]} · ${labels[gear]}`});
    }
    return looks.get(key);
  }
  function draw(ctx,id,x,y,{step=0,scale=1,facing=0,working=false,sleeping=false}={}, {ellipse,line,polygon}){
    const {hair,cut,gear,cloth,shade,trim,skin,hairColor}=appearance(id);
    const outline='#3d3533';
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    if(sleeping){
      ellipse(ctx,1,3,7,2.6,'#3d35333f');
      ellipse(ctx,2,.8,5.8,3.4,shade);ellipse(ctx,2,0,4.9,2.8,cloth);
      line(ctx,[[2,-2],[2.8,2]],trim,.9);
      ellipse(ctx,-3.7,-.5,3.1,2.8,hairColor);ellipse(ctx,-3.8,.2,2.3,1.8,skin);
      ctx.restore();
      return;
    }
    ellipse(ctx,0,5.5,7.5,2.7,'#29382e4a');
    ctx.scale(facing<0?-1:1,1);
    const offset=facing ? .65 : 0;
    const stride=facing<0?-step:step;
    const bounce=Math.abs(step)*.32;
    for(const side of [-1,1]){
      const foot=side*2+stride*side;
      line(ctx,[[side*1.9,1-bounce],[foot,5.5]],outline,2.4);
      line(ctx,[[foot-.4,5.6],[foot+.8,5.6]],outline,1.55);
    }
    ctx.translate(0,-bounce);
    if(hair==='long'||hair==='braid'){
      ellipse(ctx,-.9,-7,hair==='long'?5.5:5.2,6.2,hairColor);
      if(hair==='braid'){
        line(ctx,[[-4,-9],[-5.2,-4],[-4.6,-.8]],hairColor,2.2);
        line(ctx,[[-5,-2],[-4.2,-1.8]],trim,.9);
      }
    }
    for(const side of [-1,1]){
      const hand=side*5.2-stride*side*.65;
      line(ctx,[[side*3.4,-3.6],[hand,1]],outline,2.45);
      line(ctx,[[side*3.4,-3.6],[hand,.4]],shade,1.65);
      ellipse(ctx,hand,1,1,.85,skin);
    }
    const flared=cut==='coat'||cut==='skirt'||cut==='apron';
    const hem=flared?4.6:3.5;
    const bottom=cut==='coat'?3.8:flared?2.8:2;
    polygon(ctx,[[-4.5,-4.1],[-2,-5.6],[2,-5.6],[4.5,-4.1],[hem+.6,bottom],[-hem-.6,bottom]],outline);
    polygon(ctx,[[-3.9,-3.9],[-1.9,-5],[1.9,-5],[3.9,-3.9],[hem,bottom-.55],[-hem,bottom-.55]],cloth);
    line(ctx,[[-2.9,-3.35],[-3.4,.1]],trim,.7);
    if(cut==='apron'||working){
      polygon(ctx,[[-1.7,-3.8],[1.6,-3.8],[2.65,bottom-.55],[-2.65,bottom-.55]],'#f1d9b3');
      line(ctx,[[-1.25,.4],[.95,.4],[.9,1.5],[-.95,1.5]],'#b38168',.55);
    }else if(cut==='vest'||cut==='coat'){
      polygon(ctx,[[-2.4,-4.8],[.2,-2.15],[2.45,-4.8],[1.3,-5.1],[-1.6,-5.1]],trim);
      line(ctx,[[.2,-1.9],[.2,bottom-.6]],shade,.8);
      ellipse(ctx,.8,.8,.45,.45,trim);
    }else{
      line(ctx,[[-3.1,.1],[3.1,.1]],shade,.95);
    }

    const headX=offset;
    if(hair==='bun')ellipse(ctx,headX-3.5,-13.6,2.7,2.45,hairColor);
    ellipse(ctx,headX,-9.3,4.9,5.1,outline);
    ellipse(ctx,headX,-8.9,4.3,4.6,skin);
    ellipse(ctx,headX-4.1,-8.2,1.1,1.25,skin);
    if(hair==='curls'){
      for(const [dx,dy,r] of [[-3.25,-11.5,2],[-1.6,-13,2.2],[.8,-13.2,2.1],[3.15,-12.1,1.85]])ellipse(ctx,headX+dx,dy,r,r,hairColor);
    }else{
      ellipse(ctx,headX-.25,-12.1,4.65,2.75,hairColor);
      const fringe=hair==='crop'?-.8:hair==='sweep'?-2.5:hair==='side'?-2.9:-1.8;
      polygon(ctx,[[headX-4.5,-12.2],[headX+3.7,-12.3],[headX+fringe,-10],[headX-4.3,-8.7]],hairColor);
      if(hair==='bob')line(ctx,[[headX-3.9,-12.2],[headX-4.3,-7.15]],hairColor,1.45);
    }
    ellipse(ctx,headX+1,-9,.48,.58,outline);
    if(!facing)ellipse(ctx,headX-1.6,-9,.48,.58,outline);
    else ellipse(ctx,headX+3.6,-8.15,.85,.66,skin);
    if(gear==='glasses'){
      for(const dx of [-1.5,1.2]){
        ctx.beginPath();ctx.ellipse(headX+dx,-9,1.2,.95,0,0,Math.PI*2);
        ctx.strokeStyle=outline;ctx.lineWidth=.6;ctx.stroke();
      }
      line(ctx,[[headX-.3,-9],[headX,-9]],outline,.6);
    }else if(gear==='scarf'){
      line(ctx,[[-2.6,-5],[2.35,-5]],trim,1.75);
      line(ctx,[[1.8,-4.8],[2.5,-1.75]],trim,1.25);
    }else if(gear==='satchel'){
      line(ctx,[[-2.9,-4.45],[3.45,1.45]],'#654738',.9);
      ellipse(ctx,3.55,1.6,1.8,1.5,'#6d4a38');ellipse(ctx,3.65,1.15,1.55,.85,'#c18c58');
    }else if(gear==='cap'||gear==='beret'){
      ellipse(ctx,headX-.3,-13.7,gear==='cap'?4.4:5.05,2.15,shade);
      ellipse(ctx,headX-.65,-14.15,gear==='cap'?3.65:4.4,1.55,cloth);
      if(gear==='cap')line(ctx,[[headX+1.5,-12.35],[headX+5.15,-12.1]],outline,1.2);
      else ellipse(ctx,headX-.9,-15.95,.65,.58,trim);
    }else{
      const markX=headX+(hair==='bun'?-3.4:2.9);
      line(ctx,[[markX-.9,-12.35],[markX+.95,-11.45]],trim,gear==='ribbon'?1.65:1.05);
      if(gear==='ribbon')line(ctx,[[markX+.85,-12.35],[markX-.6,-11.45]],trim,1.3);
    }
    ctx.restore();
  }
  return {appearance,draw};
})();
