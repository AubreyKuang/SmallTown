'use strict';

const TownAtmosphere=(()=>{
  const lamps=[[475,325],[618,326],[594,388],[494,390],[365,270],[682,278],[809,473]];
  const tables={square:{x:586,y:370,seats:[[575,374],[599,374]]},cafe:{x:574,y:180,seats:[[563,184],[586,184]]}};
  const clamp=n=>Math.max(0,Math.min(1,n));
  const ramp=(value,from,to)=>{
    const t=clamp((value-from)/(to-from));
    return t*t*(3-2*t);
  };
  function light(tick,progress){
    const hour=(tick+progress)%48/2;
    const dawn=ramp(hour,5.5,6.7)*(1-ramp(hour,7,8.5));
    const dusk=ramp(hour,16.5,18.5)*(1-ramp(hour,19,21));
    const night=Math.max(1-ramp(hour,4.8,7.2),ramp(hour,18.5,20.8));
    return {dawn,dusk,night};
  }
  const halos=new Map();
  function glow(ctx,x,y,r,alpha,color,squash=1){
    if(alpha<.01)return;
    if(!halos.has(color)){
      const image=document.createElement('canvas');
      image.width=image.height=96;
      const paint=image.getContext('2d'),gradient=paint.createRadialGradient(48,48,0,48,48,48);
      gradient.addColorStop(0,`rgba(${color},.9)`);
      gradient.addColorStop(.32,`rgba(${color},.35)`);
      gradient.addColorStop(1,`rgba(${color},0)`);
      paint.fillStyle=gradient;paint.fillRect(0,0,96,96);
      halos.set(color,image);
    }
    ctx.globalAlpha=alpha;
    ctx.drawImage(halos.get(color),x-r,y-r*squash,r*2,r*2*squash);
    ctx.globalAlpha=1;
  }
  function scenery(ctx,w,time,light,river,interiors,{ellipse,line}){
    const {night,dawn,dusk}=light;
    const rain=w.weather==='细雨',snow=w.weather==='小雪';
    const sun=Math.max(dawn*.7,dusk)*(rain?.26:snow?.56:1);
    const shade=ctx.createLinearGradient(0,0,600,620);
    shade.addColorStop(0,`rgba(34,46,83,${night*.38+(rain?.07:0)})`);
    shade.addColorStop(1,`rgba(40,56,78,${night*.49+(rain?.09:0)})`);
    ctx.fillStyle=shade;ctx.fillRect(0,0,960,620);
    if(sun>.01){
      const sky=ctx.createLinearGradient(35,0,630,550);
      sky.addColorStop(0,`rgba(255,205,142,${sun*.49})`);
      sky.addColorStop(.58,`rgba(235,149,119,${sun*.16})`);
      sky.addColorStop(1,'rgba(226,146,127,0)');
      ctx.fillStyle=sky;ctx.fillRect(0,0,960,620);
    }
    if(dawn>.05||rain){
      glow(ctx,160+Math.sin(time/4100)*15,510,330,dawn*.18+(rain?.16:0),'220,237,218',.22);
      glow(ctx,790+Math.sin(time/4700)*17,561,265,dawn*.15+(rain?.12:0),'223,232,218',.2);
    }
    for(let i=0;i<31;i++){
      const [ax,ay]=river[i%8],[bx,by]=river[i%8+1];
      const f=(i*.381+time*(rain?.000088:.000043))%1;
      const x=ax+(bx-ax)*f,y=ay+(by-ay)*f+((i*13)%25)-12;
      if(x>673&&x<752)continue;
      const fade=Math.min(1,f*7,(1-f)*7);
      const color=i%3===0&&sun>.2?'255,209,152':'215,244,229';
      line(ctx,[[x,y],[x+6+(i%4)*3,y]],`rgba(${color},${fade*(.32+sun*.3-night*.16)})`,i%4===0?1.8:1);
    }
    if(!w.power&&night+dusk>.12){
      const alpha=clamp(night*.83+dusk*.36);
      for(const [x,y] of lamps){
        glow(ctx,x,y-23,34,alpha,'255,196,103');
        glow(ctx,x,y+2,32,alpha*.38,'255,204,122',.34);
        ellipse(ctx,x,y-23,2.9,3.1,`rgba(255,232,164,${alpha})`);
      }
    }
    if(w.power)for(const x of [519,558,595])glow(ctx,x,354,20,night*.31,'255,194,116',.65);
    const place=TownTwilight.lit(w);
    if(place){
      const {x,y}=tables[place];
      const inside=place==='cafe';
      glow(ctx,x,inside&&!interiors?157:y-8,42,.66,'255,183,91',.77);
      if(!inside||interiors){
        ellipse(ctx,x,y+4,10,4,'#705643');
        line(ctx,[[x-3,y-1],[x+3,y-1]],'#74432e',2);
        ctx.fillStyle='#ffe0a2';ctx.fillRect(x-2,y-7,4,6);
        ellipse(ctx,x,y-8,2,2,'#fff4c5');
      }
    }
  }
  function particles(ctx,w,time,light,{ellipse,line}){
    const {night,dawn,dusk}=light;
    if(w.weather==='晴朗'){
      if(night>.24)for(let i=0;i<18;i++){
        const x=54+(i*67)%254+Math.sin(time/1400+i)*9;
        const y=359+(i*31)%113+Math.cos(time/1040+i*3)*6;
        const alpha=(.3+.25*Math.sin(time/690+i*4))*night;
        glow(ctx,x,y,7,alpha,'228,244,142');
        ellipse(ctx,x,y,1.15,1.15,`rgba(248,255,170,${alpha})`);
      }
      if(dawn+dusk>.3)for(let i=0;i<15;i++){
        const x=45+(i*61+time*.011)%430,y=56+(i*43)%366+Math.sin(time/1300+i)*11;
        ellipse(ctx,x,y,1.35,1,`rgba(255,238,183,${(dawn+dusk)*(.22+.13*Math.sin(time/850+i))})`);
      }
      return;
    }
    const snow=w.weather==='小雪';
    for(let i=0;i<(snow?65:49);i++){
      const depth=i%3,fall=snow?.017+depth*.007:.22+depth*.04;
      const x=(i*137+(snow?Math.sin(time/1150+i)*16+16+time*.011:time*.064))%960;
      const y=(i*163+time*fall)%620;
      if(snow)ellipse(ctx,x,y,.9+depth*.56,.9+depth*.45,depth===2?'#fffdf2ad':'#f6ffed71');
      else line(ctx,[[x,y],[x+2+depth,y+5+depth*3]],depth===2?'#e9fae882':'#daefea54',.85+depth*.2);
    }
  }
  return {lamps,tables,light,scenery,particles};
})();
