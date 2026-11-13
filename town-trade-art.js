'use strict';

const TownTradeArt=(()=>{
  function buildings(ctx,lit,{polygon,ellipse,line}){
    const poly=(points,fill)=>polygon(ctx,points,fill);
    const oval=(x,y,rx,ry,fill)=>ellipse(ctx,x,y,rx,ry,fill);
    const stroke=(points,fill,width)=>line(ctx,points,fill,width);
    const box=(x,y,w,h,fill)=>{ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);};
    function yard(x,y,w){
      poly([[x-10,y],[x+w-4,y],[x+w+12,y+15],[x+4,y+15]],'#65744a42');
      poly([[x,y],[x+w,y],[x+w-10,y+12],[x-12,y+12]],'#c6b58b');
      for(let row=0;row<3;row++){
        for(let col=0;col<Math.floor(w/8)-1;col++){
          const xx=x+col*8-row*3+(row%2)*3;
          box(xx,y+row*4,6,2,(col+row)%3===0?'#e8d3a0':'#d9c69a');
        }
      }
    }
    function building(x,y,w,h,face,side,roof,shade,tile){
      poly([[x-5,y+5],[x+w,y+5],[x+w+33,y-12],[x+21,y-13]],'#475a3e57');
      const wall=ctx.createLinearGradient(x,y-h,x,y);
      wall.addColorStop(0,face);wall.addColorStop(.12,shade);wall.addColorStop(.29,face);wall.addColorStop(1,face);
      box(x,y-h,w,h,wall);
      poly([[x+w,y-h],[x+w+24,y-h-17],[x+w+24,y-17],[x+w,y]],side);
      box(x,y-5,w,5,'#96765a');
      poly([[x+w,y-5],[x+w+24,y-22],[x+w+24,y-17],[x+w,y]],'#795d49');
      poly([[x-6,y-h+1],[x+18,y-h-17],[x+39,y-h-43],[x+13,y-h-24]],shade);
      poly([[x+13,y-h-24],[x+39,y-h-43],[x+w+28,y-h-18],[x+w+4,y-h+1]],shade);
      poly([[x-6,y-h+1],[x+13,y-h-24],[x+w-14,y-h-24],[x+w+4,y-h+1]],roof);
      poly([[x+w-14,y-h-24],[x+w+10,y-h-43],[x+w+28,y-h-18],[x+w+4,y-h+1]],shade);
      stroke([[x+13,y-h-24],[x+w-14,y-h-24],[x+w+10,y-h-43]],tile,2);
      for(let row=1;row<6;row++){
        const yy=y-h-24+row*4, left=x+13-row*3,right=x+w-14+row*3;
        stroke([[left,yy],[right,yy]],tile,.75);
        for(let xx=left+6+(row%2)*4;xx<right-4;xx+=9)stroke([[xx+1,yy-3],[xx,yy]],'#613e3b66',.7);
        stroke([[right,yy],[right+22,yy-17]],tile,.7);
      }
      stroke([[x+w,y-h+4],[x+w,y],[x+w+24,y-17],[x+w+24,y-h-15]],'#65513f',1.1);
      for(let j=1;j<7;j++){
        const yy=y-h+4+j*5;
        stroke([[x+w+1,yy],[x+w+23,yy-15]],'#d3b6855f',.8);
      }
      stroke([[x-6,y-h+2],[x+w+4,y-h+2],[x+w+28,y-h-16]],'#654a3a',2.3);
    }
    function frame(x,y,w,h){
      box(x-2,y-2,w+4,h+4,'#6b4938');
      box(x,y,w,h,lit?'#ffd088':'#537d78');
      stroke([[x+2,y+h-2],[x+w-2,y+3]],lit?'#ffe5a8':'#91a498',1);
      box(x+w/2-.6,y,1.2,h,'#edc996');box(x,y+h*.48,w,1,'#edc996');
      box(x-3,y+h+1,w+6,2,'#a68056');
    }
    function arch(x,y,w,h){
      ctx.fillStyle='#644438';
      ctx.beginPath();ctx.roundRect(x,y,w,h,[w/2,w/2,0,0]);ctx.fill();
      box(x+3,y+9,w-6,h-9,'#825b41');
      for(let i=5;i<w-4;i+=4)box(x+i,y+12,1,h-12,'#684a39');
      oval(x+w-6,y+h*.68,1,1,'#edd186');
    }
    function canopy(x,y,w,color){
      for(let i=0;i<8;i++){
        const xx=x+i*w/8;
        poly([[xx,y],[xx+w/8,y],[xx+w/8-4,y+8],[xx-4,y+8]],i%2?'#e5c58f':color);
        box(xx-4,y+8,w/8,3,i%2?'#cba477':color);
      }
      stroke([[x-4,y+11],[x+w-4,y+11]],'#784f41',1);
    }
    yard(372,216,117);
    building(380,215,91,51,'#dba987','#a8785d','#a65f4e','#764e48','#d58c68');
    for(let row=0;row<6;row++)for(let i=0;i<11;i++){
      const x=381+i*8+(row%2)*3,y=171+row*6;
      if(x<466)box(x,y,5,1.3,(i+row)%3===0?'#f0c5a0':'#be8b73');
    }
    box(452,121,11,27,'#986657');
    poly([[463,121],[469,116],[469,144],[463,148]],'#755549');
    poly([[449,121],[465,121],[471,116],[455,116]],'#d39676');
    arch(420,184,18,31);
    frame(391,184,18,15);frame(447,182,14,13);
    canopy(388,178,24,'#ab6957');
    stroke([[418,218],[442,218]],'#9d7e5b',3);
    stroke([[419,217],[441,217]],'#ecce9d',1.4);

    yard(710,217,120);
    building(717,216,85,48,'#d8b98b','#a78360','#ba8b49','#866844','#dcb072');
    for(const x of [720,743,776,796])box(x,173,3,40,'#775642');
    stroke([[720,208],[743,175]],'#876344',2);
    stroke([[777,175],[797,208]],'#876344',2);
    arch(751,185,17,31);frame(726,181,11,12);frame(782,181,10,12);
    for(const [x,y,color] of [[831,220,'#aa6254'],[876,230,'#618471']]){
      oval(x,y+12,23,7,'#48513c55');
      for(const xx of [x-16,x+16])stroke([[xx,y-9],[xx,y+13]],'#70513d',2);
      canopy(x-15,y-13,35,color);
      box(x-16,y+5,32,6,'#886044');
      box(x-18,y+4,36,2,'#c79b67');
      for(let i=0;i<4;i++)oval(x-11+i*7,y+2,2.8,1.9,i%2?'#ba7d4d':'#829750');
    }
  }
  function hit(x,y){
    return x>=366&&x<=498&&y>=117&&y<=217||x>=711&&x<=830&&y>=123&&y<=217;
  }
  function trade(ctx,w,cargo,time,{polygon,ellipse,line},interiors){
    const run=TownSupply.current(w);
    const depot=TownSupply.depots[w.supply?.depot??'square'];
    const {x,y}=depot;
    ellipse(ctx,x,y+3,16,5,'#39493568');
    polygon(ctx,[[x-13,y],[x+7,y],[x+15,y-7],[x+15,y-19],[x-7,y-19],[x-13,y-12]],'#a37c55');
    polygon(ctx,[[x+7,y],[x+15,y-7],[x+15,y-19],[x+7,y-13]],'#795840');
    polygon(ctx,[[x-16,y-12],[x-7,y-24],[x+16,y-23],[x+9,y-12]],'#6d7755');
    line(ctx,[[x-16,y-12],[x+9,y-12],[x+16,y-23]],'#424b38',1.7);
    if(['unload','inbound','oven-wait'].includes(run?.stage)){
      for(let i=0;i<3;i++)ellipse(ctx,x-9+i*6,y+5-i%2*2,3.4,3.9,'#e3c38f');
    }
    if(run?.stage==='baking'){
      if(interiors){
        const glow=ctx.createRadialGradient(395,182,1,395,182,13);
        glow.addColorStop(0,'#ffdb8fce');glow.addColorStop(1,'#f39a4b00');
        ellipse(ctx,395,182,13,9,glow);
      }
      for(let i=0;i<4;i++){
        const f=(time/1400+i/4)%1;
        ellipse(ctx,459+f*12,120-f*24,2+f*4,1.4+f*3,`rgba(255,234,203,${.48*(1-f)})`);
      }
    }
    if(run?.stage==='market')for(let i=0;i<run.bread;i++)ellipse(ctx,752+i*4,225-i%2*2,2.8,1.6,'#d99c50');
    if(!cargo)return;
    const cx=cargo.x+9,cy=cargo.y+3;
    ellipse(ctx,cx,cy+1,11,4,'#3e483950');
    line(ctx,[[cargo.x+2,cargo.y-1],[cx-4,cy-1]],'#594334',1.6);
    polygon(ctx,[[cx-6,cy-6],[cx+8,cy-6],[cx+7,cy],[cx-5,cy]],'#926543');
    line(ctx,[[cx-5,cy-3],[cx+7,cy-3]],'#dbad72',1);
    for(let i=0;i<3;i++)ellipse(ctx,cx-4+i*4,cy-7-i%2*2,2.6,cargo.kind==='flour'?3:1.8,cargo.kind==='flour'?'#efd3a1':'#dc9b48');
    ellipse(ctx,cx+4,cy+1,2.8,2.8,'#4b3e32');
    ellipse(ctx,cx+4,cy+1,.9,.9,'#c4a075');
  }
  return {buildings,trade,hit};
})();
