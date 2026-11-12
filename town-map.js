'use strict';

const TownMap = (() => {
  const colors = ['#ad554b','#366c87','#548062','#a77337','#68588d','#536b45'];
  const locations = {
    homes:{x:191,y:263,labelY:298}, bakery:{x:430,y:213,labelY:181},
    cafe:{x:588,y:198,labelY:167}, market:{x:768,y:223,labelY:194},
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
  function house(ctx,x,y,w,h,roof,wall,shop,lit){
    ellipse(ctx,x+w*.53,y+h+6,w*.65,12,'#53563230');
    polygon(ctx,[[x+w,y],[x+w+15,y-12],[x+w+15,y+h-12],[x+w,y+h]],'#b08960');
    ctx.fillStyle=wall;ctx.fillRect(x,y,w,h);
    polygon(ctx,[[x-9,y+2],[x+w*.34,y-35],[x+w+9,y+2]],roof);
    polygon(ctx,[[x+w*.34,y-35],[x+w*.34+15,y-47],[x+w+24,y-10],[x+w+9,y+2]],'#755647');
    for(let i=0;i<4;i++){
      const f=(i+1)/5;
      line(ctx,[[x-9+(w*.34+9)*f,y+2-37*f],[x+w+9-(w*.66+9)*f,y+2-37*f]],'#fff1c13b',1.3);
    }
    ctx.fillStyle='#765a46';ctx.fillRect(x+w*.44,y+h-25,15,25);
    for(const side of [.15,.73]){
      const wx=x+w*side;
      ctx.fillStyle='#765a46';ctx.fillRect(wx-2,y+9,17,17);
      ctx.fillStyle=lit?'#fce2a0':'#81a4a1';ctx.fillRect(wx,y+11,13,13);
      line(ctx,[[wx+6.5,y+11],[wx+6.5,y+24]],'#fff4ce',1);
      line(ctx,[[wx,y+17],[wx+13,y+17]],'#fff4ce',1);
    }
    if(shop){
      ctx.fillStyle='#fff1d0';ctx.fillRect(x-3,y+30,w+6,11);
      ctx.fillStyle=roof;
      for(let i=0;i<6;i++)ctx.fillRect(x-3+i*(w+6)/6,y+30,(w+6)/12,11);
    }
  }
  function terrain(ctx,lit){
    ctx.fillStyle='#b7c888';ctx.fillRect(0,0,960,620);
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
    house(ctx,78,159,71,56,'#ad5e4e','#f1d49f',false,lit);
    house(ctx,186,143,80,61,'#728a6b','#f2dfb6',false,lit);
    house(ctx,118,222,68,51,'#b07c4e','#efdbb2',false,lit);
    house(ctx,217,224,70,54,'#926e86','#f2d5b8',false,lit);
    house(ctx,381,156,83,58,'#b9724a','#f4deb5',true,lit);
    house(ctx,526,135,95,62,'#617d73','#f0d9a3',true,lit);
    house(ctx,718,156,90,65,'#a35f58','#f0d3a0',true,lit);
    house(ctx,777,390,83,61,'#627e8b','#e9d2ac',false,lit);
    ellipse(ctx,549,357,79,51,'#c3ab81');ellipse(ctx,547,352,74,47,'#eed4a6');
    ellipse(ctx,547,342,25,15,'#aa936c');ellipse(ctx,547,339,21,11,'#76aaa6');
    ellipse(ctx,545,337,7,4,'#c0ded1');
    for(const [x,y] of [[475,325],[618,326],[594,388],[494,390],[365,270],[682,278],[809,473]]){
      line(ctx,[[x,y],[x,y-21]],'#69624a',3);
      ellipse(ctx,x,y-23,4,4,lit?'#f9d37f':'#f2e1b2');
    }
    for(let i=0;i<6;i++)line(ctx,[[634+i*8,479+i*7],[660+i*8,462+i*7]],'#ad8961',5);
  }
  function people(world){
    const groups=new Map();
    for(const resident of world.people){
      if(!groups.has(resident.place))groups.set(resident.place,[]);
      groups.get(resident.place).push(resident);
    }
    const pins=[];
    for(const [place,residents] of groups){
      const p=locations[place];
      const columns=Math.min(residents.length,8);
      residents.forEach((resident,i)=>{
        const stroll=(world.tick+resident.id*3)%8;
        const x=p.x+(i%columns-(columns-1)/2)*17+Math.sin(stroll*Math.PI/4)*5;
        const y=p.y+Math.floor(i/columns)*15+15+Math.cos(stroll*Math.PI/4)*4;
        pins.push({resident,place,x,y});
      });
    }
    return pins.sort((a,b)=>a.y-b.y);
  }
  const street = [[244,315],[359,275],[430,272],[551,268],[704,279],[769,287]];
  const entrances = {
    homes:{junction:0,walk:[[231,311]]}, forest:{junction:0,walk:[[211,391]]},
    bakery:{junction:2,walk:[[427,233]]}, cafe:{junction:3,walk:[[588,270],[588,249]]},
    square:{junction:3,walk:[[550,333]]},
    station:{junction:3,walk:[[550,353],[628,427],[717,465]]},
    market:{junction:5,walk:[[770,250]]}
  };
  function route(from,to){
    const a=entrances[from.place],b=entrances[to.place];
    const start=[from.x,from.y],end=[to.x,to.y];
    if(a===b)return [start,end];
    const middle=street.slice(Math.min(a.junction,b.junction),Math.max(a.junction,b.junction)+1);
    if(a.junction>b.junction)middle.reverse();
    return [start,...a.walk,...middle,...b.walk.slice().reverse(),end];
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
  function draw(ctx,world,selection,displayWidth,pins,choosingPlace){
    const labelScale=Math.min(1.8,Math.max(1,640/displayWidth));
    const hour=world.tick%48/2;
    const night=hour<6||hour>=20;
    ctx.drawImage(background(night,night&&!world.power,hour>=18),0,0);
    for(const {resident,x,y,step} of pins){
      if(resident.id===selection)ellipse(ctx,x,y+3,10,6,'#f9d17a');
      figure(ctx,resident,x,y,step);
      if(world.power&&resident.place==='square')ellipse(ctx,x+8,y-1,3,3,'#fff0a4');
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
  return { draw, people, portrait, route, plan, position, findPlace };
})();
