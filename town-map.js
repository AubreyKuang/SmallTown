'use strict';

const TownMap = (() => {
  const colors = ['#ad554b','#366c87','#548062','#a77337','#68588d','#536b45'];
  const locations = {
    homes:{x:191,y:263,labelY:298}, bakery:{x:430,y:213,labelY:115},
    cafe:{x:574,y:198,labelY:107}, market:{x:768,y:223,labelY:111},
    square:{x:551,y:357,labelY:425}, station:{x:780,y:465,labelY:517},
    forest:{x:228,y:416,labelY:465}
  };
  const color = id => colors[(id - 1) % colors.length];
  function polygon(ctx,points,fill){
    ctx.beginPath();ctx.moveTo(...points[0]);
    for(const point of points.slice(1))ctx.lineTo(...point);
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  }
  function ellipse(ctx,x,y,rx,ry,fill){
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  }
  function line(ctx,points,stroke,width){
    ctx.beginPath();ctx.moveTo(...points[0]);
    for(const point of points.slice(1))ctx.lineTo(...point);
    ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  }
  function tree(ctx,x,y,scale,variation){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ellipse(ctx,4,2,20,8,'#405a3830');
    line(ctx,[[0,0],[0,-20]],'#725938',5);
    const leaves=['#60864e','#5d8a68','#83a75a','#ad9a52'][variation%4];
    ellipse(ctx,0,-27,18,20,'#486b48');
    ellipse(ctx,-8,-32,12,15,leaves);ellipse(ctx,7,-35,13,16,leaves);
    ellipse(ctx,-7,-41,8,5,'#d5df8b55');
    ctx.restore();
  }
  function terrain(ctx,lit){
    const grass=ctx.createLinearGradient(0,0,960,620);
    grass.addColorStop(0,'#91aa67');grass.addColorStop(.5,'#bcc987');grass.addColorStop(1,'#9eb781');
    ctx.fillStyle=grass;ctx.fillRect(0,0,960,620);
    for(let i=0;i<46;i++){
      ellipse(ctx,(i*211)%991,(i*137)%643,48+(i%4)*17,19+(i%3)*7,i%2?'#9ab57938':'#d9d9a255');
    }
    const river=[[0,561],[140,514],[279,522],[381,474],[468,482],[574,538],[715,558],[830,572],[960,541]];
    line(ctx,river,'#e2d6a2',72);line(ctx,river,'#6ba6a6',57);line(ctx,river,'#86bbba',36);
    for(let i=0;i<37;i++){
      const a=river[i%8],b=river[i%8+1],f=((i*31)%97)/100;
      const x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f+(i%5-2)*7;
      line(ctx,[[x-5,y],[x+9,y]],'#d1e5d180',1.7);
    }
    const road=[[62,318],[244,315],[359,275],[541,267],[704,279],[879,302]];
    line(ctx,road,'#839269',39);line(ctx,road,'#e4cba0',32);line(ctx,road,'#eddbad',23);
    line(ctx,[[554,267],[550,352],[628,427],[676,495]],'#ead6aa',25);
    line(ctx,[[244,315],[211,391],[228,416]],'#dfc49b',20);
    line(ctx,[[424,270],[427,220]],'#e3cba0',17);
    line(ctx,[[769,287],[769,223]],'#e3cba0',17);
    line(ctx,[[588,247],[588,271]],'#e3cba0',17);
    line(ctx,[[628,427],[716,464],[780,479]],'#ead6aa',19);
    line(ctx,[[895,389],[894,502],[905,611]],'#76766a',19);
    for(let y=390;y<620;y+=9)line(ctx,[[884,y],[908,y]],'#a29274',3);
    line(ctx,[[889,390],[889,614]],'#535b55',2);line(ctx,[[902,390],[902,614]],'#535b55',2);
    for(let i=0;i<94;i++){
      const x=12+(i*163)%932,y=14+(i*109)%590;
      if((y>280&&y<322)||(y>490&&y<586))continue;
      ellipse(ctx,x,y,2.5,1.5,i%3===0?'#e8e0a0':'#7f9f62');
    }
    for(let i=0;i<17;i++)tree(ctx,29+i*55,65+(i*29)%40,.72+(i%4)*.15,i);
    for(let i=0;i<17;i++)tree(ctx,50+(i*73)%260,369+(i*43)%126,.62+(i%4)*.13,i);
    for(const [x,y] of [[342,211],[303,284],[464,146],[691,170],[841,239],[463,388],[624,374],[718,460],[874,352],[372,432],[665,592]])tree(ctx,x,y,.85,x);
    TownArt.buildings(ctx,lit,{polygon,ellipse,line});
    ellipse(ctx,549,357,79,51,'#c3ab81');ellipse(ctx,547,352,74,47,'#eed4a6');
    ellipse(ctx,547,342,25,15,'#aa936c');ellipse(ctx,547,339,21,11,'#76aaa6');
    ellipse(ctx,545,337,7,4,'#c0ded1');
    for(const [x,y] of [[475,325],[618,326],[594,388],[494,390],[365,270],[682,278],[809,473]]){
      line(ctx,[[x,y],[x,y-21]],'#69624a',3);
      ellipse(ctx,x,y-23,4,4,lit?'#f9d37f':'#f2e1b2');
    }
    line(ctx,[[729,600],[769,608],[818,608]],'#e5d4a5',12);
    polygon(ctx,[[661,493],[680,487],[748,597],[727,609]],'#785d4d');
    polygon(ctx,[[664,493],[679,490],[744,596],[728,605]],'#b99568');
    for(let i=0;i<17;i++)line(ctx,[[664+i*4,494+i*6.8],[680+i*4,489+i*6.8]],'#d0ac78',3);
    line(ctx,[[660,491],[727,606]],'#654f42',3);line(ctx,[[681,486],[749,598]],'#654f42',3);
    TownArt.landscape(ctx,{ellipse,line});
    for(let i=0;i<5600;i++){
      const x=(i*313+i*i*5)%960,y=(i*157+i*i*3)%620;
      ctx.fillStyle=i%2?'#fff4c70d':'#283b2410';
      ctx.fillRect(x,y,1+(i%3===0),1);
    }
  }
  const street = [[244,315],[359,275],[430,272],[551,268],[704,279],[769,287]];
  // Street-side stops and open ground, kept clear of buildings, water and the fountain.
  const stops={
    homes:[[66,317],[86,309],[102,323],[115,310],[129,321],[141,309],[155,323],[167,311],[178,323],[191,311],[205,323],[214,310],[228,321],[246,324],[260,319],[274,313],[289,309],[302,305],[316,300],[333,294],[350,282],[192,283],[204,289],[94,290],[146,285],[262,290],[78,327],[120,328],[236,300],[283,298]],
    bakery:[[365,270],[382,270],[398,268],[412,259],[426,246],[438,260],[456,266],[475,267],[393,242],[412,231],[441,231],[458,243],[487,270]],
    cafe:[[507,255],[527,265],[556,254],[576,247],[590,232],[605,247],[620,256],[635,265],[648,271],[570,269],[608,269],[548,238],[629,235],[644,248]],
    market:[[685,275],[701,285],[718,273],[734,284],[749,275],[764,261],[780,272],[796,282],[815,282],[834,293],[852,299],[869,295],[741,245],[756,234],[775,239],[795,248]],
    square:[[492,351],[504,360],[485,367],[498,380],[514,378],[525,362],[539,365],[550,378],[563,360],[575,370],[591,359],[604,351],[611,368],[595,383],[578,386],[527,389],[550,397],[568,401],[593,399],[617,379],[474,354],[471,373],[484,391],[507,395]],
    station:[[633,431],[649,438],[666,444],[683,453],[698,462],[722,469],[740,467],[751,481],[768,475],[785,480],[801,470],[819,482],[835,465],[854,469],[863,486],[757,449],[723,485],[773,495],[813,494],[687,473],[658,457],[708,442],[736,451],[845,492]],
    forest:[[239,330],[231,349],[224,366],[215,386],[220,405],[235,420],[251,414],[269,427],[253,440],[231,446],[210,431],[195,415],[178,420],[165,435],[151,452]]
  };
  const entrances = {
    homes:{junction:0,walk:[[231,311]]}, forest:{junction:0,walk:[[211,391]]},
    bakery:{junction:2,walk:[[427,233]]}, cafe:{junction:3,walk:[[588,270],[588,249]]},
    square:{junction:3,walk:[[550,320],[510,323],[505,342],[506,356]]},
    station:{junction:3,walk:[[550,353],[628,427],[717,465]]},
    market:{junction:5,walk:[[770,250]]}
  };
  function approach(pin){
    const walk=entrances[pin.place].walk;
    if(pin.place==='station'&&pin.x<715)return walk.slice(0,2);
    if(pin.place==='forest'&&pin.y<382)return [];
    return walk;
  }
  function route(from,to){
    const a=entrances[from.place],b=entrances[to.place];
    const start=[from.x,from.y],end=[to.x,to.y];
    if(a===b)return [start,end];
    const middle=street.slice(Math.min(a.junction,b.junction),Math.max(a.junction,b.junction)+1);
    if(a.junction>b.junction)middle.reverse();
    const lane=(from.resident.id%5-2)*3;
    return [start,...approach(from).slice().reverse(),...middle.map(([x,y])=>[x,y+lane]),...approach(to),end];
  }
  function plan(points){
    const lengths=points.slice(1).map(([x,y],i)=>Math.hypot(x-points[i][0],y-points[i][1]));
    return {points,lengths,total:lengths.reduce((total,length)=>total+length,0)};
  }
  function position(path,fraction){
    if(fraction>=1)return path.points.at(-1);
    let remaining=path.total*fraction;
    for(const [i,length] of path.lengths.entries()){
      if(length>0&&remaining<=length){
        const [x,y]=path.points[i], [endX,endY]=path.points[i+1];
        return [x+(endX-x)*remaining/length,y+(endY-y)*remaining/length];
      }
      remaining-=length;
    }
    return path.points.at(-1);
  }
  function figure(ctx,resident,x,y,step=0,scale=1){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ellipse(ctx,0,4,7,3,'#33463355');
    line(ctx,[[-2,2],[-2+step,6]],'#3c3c32',2);
    line(ctx,[[2,2],[2-step,6]],'#3c3c32',2);
    ellipse(ctx,0,0,5,5,color(resident.id));
    ellipse(ctx,0,-6,4.2,4.6,'#f4c695');
    ellipse(ctx,0,-8,4.5,2.8,['#48352b','#644032','#a5683a'][resident.id%3]);
    ctx.restore();
  }
  function portrait(canvas,resident){
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,64,64);
    ellipse(ctx,32,32,25,25,'#f6e7b9');
    figure(ctx,resident,32,38,0,2.65);
  }
  function findPlace(x,y){
    return Object.entries(locations).find(([,p])=>Math.hypot(x-p.x,y-p.y)<47||Math.abs(x-p.x)<53&&Math.abs(y-p.labelY)<20)?.[0];
  }
  const backgrounds=new Map();
  function background(night,lit,dusk){
    const key=night?(lit?'night':'outage'):dusk?'dusk':'day';
    if(!backgrounds.has(key)){
      const canvas=document.createElement('canvas');
      canvas.width=960;canvas.height=620;
      const ctx=canvas.getContext('2d');
      terrain(ctx,lit);
      if(night||dusk){
        ctx.fillStyle=night?'#25385d58':'#af614b26';ctx.fillRect(0,0,960,620);
      }
      backgrounds.set(key,canvas);
    }
    return backgrounds.get(key);
  }
  function marker(place){
    const {x,y}=locations[place];
    return {left:(x+47)/9.6,top:(y+8)/6.2};
  }
  function draw(ctx,world,selection,displayWidth,pins,choosingPlace){
    const labelScale=Math.min(1.8,Math.max(1,640/displayWidth));
    const hour=world.tick%48/2;
    const night=hour<6||hour>=20;
    ctx.drawImage(background(night,night&&!world.power,hour>=18),0,0);
    TownArt.keepsakes(ctx,world.keepsakes??[],night,{polygon,ellipse,line});
    for(const {resident,place,x,y,step} of pins){
      if(resident.id===selection)ellipse(ctx,x,y+3,10,6,'#f9d17a');
      figure(ctx,resident,x,y,step);
      if(world.power&&place==='square')ellipse(ctx,x+8,y-1,3,3,'#fff0a4');
    }
    for(const [id,{x,labelY}] of Object.entries(locations)){
      const text=Town.places[id].name;
      ctx.font=`600 ${15*labelScale}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      const w=ctx.measureText(text).width+16;
      ctx.beginPath();ctx.roundRect(x-w/2,labelY-11*labelScale,w,22*labelScale,6);ctx.fillStyle=choosingPlace?'#ffe8a5':'#fff7dfed';ctx.fill();
      ctx.fillStyle='#4d5340';ctx.fillText(text,x,labelY);
    }
    if(world.weather!=='晴朗')for(let i=0;i<60;i++){
      const x=(i*137+world.tick*13)%960,y=(i*97+world.tick*19)%620;
      if(world.weather==='小雪')ellipse(ctx,x,y,2,2,'#fffdf1bb');
      else line(ctx,[[x,y],[x-3,y+8]],'#e8f1fa99',1.5);
    }
    const active=pins.find(pin=>pin.resident.id===selection);
    if(active){
      ctx.font=`700 ${13*labelScale}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      const w=ctx.measureText(active.resident.name).width+18;
      ctx.beginPath();ctx.roundRect(active.x-w/2,active.y-21-10*labelScale,w,19*labelScale,5);ctx.fillStyle='#344b3b';ctx.fill();
      ctx.fillStyle='#fff4d4';ctx.fillText(active.resident.name,active.x,active.y-21);
    }
    return pins;
  }
  return { draw, stops, portrait, route, plan, position, findPlace, marker };
})();
