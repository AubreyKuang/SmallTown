'use strict';

const TownMap = (() => {
  const colors = ['#ad554b','#366c87','#548062','#a77337','#68588d','#536b45'];
  const locations = {
    homes:{x:191,y:263,labelY:298}, bakery:{x:430,y:213,labelY:115},
    cafe:{x:574,y:198,labelY:107}, market:{x:768,y:223,labelY:111},
    square:{x:551,y:357,labelY:425}, station:{x:780,y:465,labelY:517},
    forest:{x:228,y:416,labelY:465}, school:{x:718,y:70,labelY:21}, schoolyard:{x:871,y:89,labelY:128}
  };
  const color = id => colors[(id - 1) % colors.length];
  const river=[[0,561],[140,514],[279,522],[381,474],[468,482],[574,538],[715,558],[830,572],[960,541]];
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
  function terrain(ctx,lit,interiors){
    const grass=ctx.createLinearGradient(0,0,960,620);
    grass.addColorStop(0,'#91aa67');grass.addColorStop(.5,'#bcc987');grass.addColorStop(1,'#9eb781');
    ctx.fillStyle=grass;ctx.fillRect(0,0,960,620);
    for(let i=0;i<46;i++){
      ellipse(ctx,(i*211)%991,(i*137)%643,48+(i%4)*17,19+(i%3)*7,i%2?'#9ab57938':'#d9d9a255');
    }
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
    line(ctx,[[704,279],[683,242],[682,146],[708,112],[725,94]],'#e3cba0',13);
    line(ctx,[[708,112],[781,107],[827,111]],'#e3cba0',10);
    line(ctx,[[628,427],[716,464],[780,479]],'#ead6aa',19);
    const railNodes=[309,388,625];
    line(ctx,railNodes.map(y=>[TownRail.trackX(y),y]),'#777568',20);
    line(ctx,[[901,518],[901,609]],'#7e6654',24);
    for(let y=312;y<622;y+=8){
      const x=TownRail.trackX(y);
      line(ctx,[[x-11,y],[x+11,y+(y<388?5:0)]],'#ac9879',3);
    }
    for(const offset of [-6,6])line(ctx,railNodes.map(y=>[TownRail.trackX(y)+offset,y]),'#535955',2.4);
    polygon(ctx,[[871,419],[890,419],[890,521],[875,521],[869,480]],'#ccb48b');
    line(ctx,[[888,421],[888,519]],'#f7dd9f',2);
    for(const y of [436,463,492])line(ctx,[[876,y],[884,y]],'#b29a70',1.5);
    for(let i=0;i<94;i++){
      const x=12+(i*163)%932,y=14+(i*109)%590;
      if((y>280&&y<322)||(y>490&&y<586))continue;
      ellipse(ctx,x,y,2.5,1.5,i%3===0?'#e8e0a0':'#7f9f62');
    }
    for(let i=0;i<11;i++)tree(ctx,29+i*55,65+(i*29)%40,.72+(i%4)*.15,i);
    for(let i=0;i<17;i++)tree(ctx,50+(i*73)%260,369+(i*43)%126,.62+(i%4)*.13,i);
    for(const [x,y] of [[342,211],[303,284],[464,146],[691,170],[841,239],[463,388],[624,374],[718,460],[874,352],[372,432],[665,592]])tree(ctx,x,y,.85,x);
    TownArt.buildings(ctx,lit,{polygon,ellipse,line},interiors);
    if(interiors)TownInteriors.draw(ctx,lit,{ellipse,line});
    TownArt.school(ctx,lit,{polygon,ellipse,line},interiors);
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
    school:[[680,101],[698,102],[718,105],[735,100],[754,104],[771,99]],
    schoolyard:[[810,76],[825,95],[839,77],[854,99],[870,73],[886,96],[900,76],[909,99],[816,110],[894,110]],
    bakery:[[365,270],[382,270],[398,268],[412,259],[426,246],[438,260],[456,266],[475,267],[393,242],[412,231],[441,231],[458,243],[487,270]],
    cafe:[[507,255],[527,265],[556,254],[576,247],[590,232],[605,247],[620,256],[635,265],[648,271],[570,269],[608,269],[548,238],[629,235],[644,248]],
    market:[[685,275],[701,285],[718,273],[734,284],[749,275],[764,261],[780,272],[796,282],[815,282],[834,293],[852,299],[869,295],[741,245],[756,234],[775,239],[795,248]],
    square:[[492,351],[504,360],[485,367],[498,380],[514,378],[525,362],[539,365],[550,378],[563,360],[575,370],[591,359],[604,351],[611,368],[595,383],[578,386],[527,389],[550,397],[568,401],[593,399],[617,379],[474,354],[471,373],[484,391],[507,395]],
    station:[[633,431],[649,438],[666,444],[683,453],[698,462],[722,469],[740,467],[751,481],[768,475],[785,480],[801,470],[819,482],[835,465],[854,469],[863,486],[757,449],[723,485],[773,495],[813,494],[687,473],[658,457],[708,442],[736,451],[845,492]],
    forest:[[239,330],[231,349],[224,366],[215,386],[220,405],[235,420],[251,414],[269,427],[253,440],[231,446],[210,431],[195,415],[178,420],[165,435],[151,452]]
  };
  const entrances = {
    homes:{junction:0}, forest:{junction:0,walk:[[211,391]]},
    bakery:{junction:2,walk:[[427,233]]}, cafe:{junction:3,walk:[[588,270],[588,249]]},
    square:{junction:3,walk:[[550,320],[510,323],[505,342],[506,356]]},
    station:{junction:3,walk:[[550,353],[628,427],[717,465]]},
    market:{junction:5,walk:[[770,250]]},
    school:{junction:4,walk:[[683,242],[682,146],[708,112]]},
    schoolyard:{junction:4,walk:[[683,242],[682,146],[708,112],[781,107],[827,111]]}
  };
  function approach(pin,resident){
    if(pin.place==='homes')return TownHomes.approach(resident.id);
    const walk=entrances[pin.place].walk;
    if(TownInteriors.contains(pin.place,pin.x,pin.y))return [...walk,...TownInteriors.entry(pin.place)];
    if(pin.place==='station'&&pin.x<715)return walk.slice(0,2);
    if(pin.place==='forest'&&pin.y<382)return [];
    return walk;
  }
  function streetBetween(start,end,lane){
    const points=street.slice(Math.min(start,end),Math.max(start,end)+1);
    if(start>end)points.reverse();
    return points.map(([x,y])=>[x,y+lane]);
  }
  function route(from,to){
    const a=entrances[from.place],b=entrances[to.place];
    const start=[from.x,from.y],end=[to.x,to.y];
    const fromInside=TownInteriors.contains(from.place,...start),toInside=TownInteriors.contains(to.place,...end);
    const exit=fromInside?TownInteriors.entry(from.place).reverse():[];
    const enter=toInside?TownInteriors.entry(to.place):[];
    if(a===b)return fromInside===toInside?[start,end]:[start,...exit,...enter,end];
    if(['school','schoolyard'].includes(from.place)&&['school','schoolyard'].includes(to.place))return [start,...exit,[790,105],...enter,end];
    const lane=(from.resident.id%5-2)*3;
    return [start,...approach(from,from.resident).slice().reverse(),...streetBetween(a.junction,b.junction,lane),...approach(to,from.resident),end];
  }
  function reroute(walker,to,trip){
    const {points,lengths}=trip.path;
    const start=[walker.x,walker.y],end=[to.x,to.y];
    const lane=(walker.resident.id%5-2)*3;
    let distance=0,segment=0,best;
    for(let i=0;i<lengths.length&&distance+lengths[i]<=trip.traveled;i++){
      distance+=lengths[i];segment=i+1;
    }
    for(const [i,[x,y]] of points.entries()){
      const junction=street.findIndex(([sx,sy])=>x===sx&&y===sy+lane);
      if(junction<0)continue;
      const entry=i<=segment?points.slice(i,segment+1).reverse():points.slice(segment+1,i+1);
      const path=plan([start,...entry,...streetBetween(junction,entrances[to.place].junction,lane).slice(1),
        ...approach(to,walker.resident),end]);
      if(!best||path.total<best.total)best=path;
    }
    if(best)return best;
    // Short campus paths have no road junction. Finish that path before taking its exit.
    const [x,y]=points.at(-1);
    return plan([start,...points.slice(segment+1),...route({...walker,place:trip.place,x,y},to).slice(1)]);
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
  function conversation(ctx,x,y,time){
    ctx.fillStyle='#fff2d6';ctx.strokeStyle='#9b7754';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(x-9,y-31,18,11,4);ctx.fill();ctx.stroke();
    polygon(ctx,[[x-3,y-21],[x+1,y-21],[x-3,y-17]],'#fff2d6');
    for(let i=0;i<3;i++)ellipse(ctx,x-4+i*4,y-25,1.1,1.1,Math.floor(time/240)%3===i?'#573e32':'#b78d60');
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
    if(TownHomes.hit(x,y))return 'homes';
    return Object.entries(locations).find(([,p])=>Math.hypot(x-p.x,y-p.y)<47||Math.abs(x-p.x)<53&&Math.abs(y-p.labelY)<20)?.[0];
  }
  const backgrounds=new Map();
  function background(night,lit,dusk,interiors){
    const key=(night?(lit?'night':'outage'):dusk?'dusk':'day')+(interiors?'-interiors':'');
    if(!backgrounds.has(key)){
      const canvas=document.createElement('canvas');
      canvas.width=960;canvas.height=620;
      const ctx=canvas.getContext('2d');
      terrain(ctx,lit,interiors);
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
  function atmosphere(ctx,world,time,night){
    for(let i=0;i<17;i++){
      const [ax,ay]=river[i%8],[bx,by]=river[i%8+1];
      const f=(i*.381+time*.000046)%1;
      const x=ax+(bx-ax)*f,y=ay+(by-ay)*f+((i*13)%22)-11;
      if(x>675&&x<752)continue;
      const fade=Math.min(1,f*8,(1-f)*8);
      line(ctx,[[x,y],[x+8+i%4,y]],`rgba(230,252,227,${fade*(night?.27:.49)})`,1.2);
    }
    if(night&&!world.power){
      for(const [x,y] of [[475,302],[618,303],[594,365],[494,367],[365,247],[682,255],[809,450]]){
        const glow=ctx.createRadialGradient(x,y,1,x,y,18);
        glow.addColorStop(0,'#ffe2a87b');glow.addColorStop(1,'#ffe2a800');
        ellipse(ctx,x,y,18,18,glow);
      }
    }
    if(night&&world.weather==='晴朗'){
      for(let i=0;i<12;i++){
        const x=55+(i*47)%250+Math.sin(time/1100+i)*7;
        const y=359+(i*31)%113+Math.cos(time/770+i*3)*5;
        const alpha=.25+.22*Math.sin(time/380+i*4);
        ellipse(ctx,x,y,2.2,2.2,`rgba(247,234,131,${alpha})`);
      }
    }
  }
  function rollingStock(ctx,train){
    if(!train)return;
    for(const [i,offset] of [16,44,72].entries()){
      const y=train.nose+offset,x=TownRail.trackX(y);
      ctx.save();ctx.translate(x,y);
      if(y<388)ctx.rotate(.69);
      ellipse(ctx,2,3,13,16,'#4c49374a');
      ctx.beginPath();ctx.roundRect(-10,-13,20,26,i===0?7:3);
      ctx.fillStyle=i===0?'#a3504b':'#597969';ctx.fill();
      ctx.strokeStyle='#543f39';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle=i===0?'#e0a06d':'#ead4a7';ctx.fillRect(-5,-9,11,18);
      for(const py of [-7,1,7]){
        ctx.fillStyle='#4e625d';ctx.fillRect(-9,py,3,4);ctx.fillRect(6,py,3,4);
      }
      if(i===0)ellipse(ctx,0,-12,2.8,2.8,'#f9dfa2');
      if(train.phase==='platform'){
        ctx.fillStyle='#493c36';ctx.fillRect(-10,2,4,7);
        ctx.fillStyle='#eac891';ctx.fillRect(-11,8,5,2);
      }
      ctx.restore();
    }
  }
  function draw(ctx,world,selection,displayWidth,pins,choosingPlace,interiors,time=0,progress=0){
    const labelScale=Math.min(1.8,Math.max(1,640/displayWidth));
    const hour=world.tick%48/2;
    const night=hour<6||hour>=20;
    ctx.drawImage(background(night,night&&!world.power,hour>=18,interiors),0,0);
    TownArt.keepsakes(ctx,world.keepsakes??[],night,{polygon,ellipse,line},interiors);
    atmosphere(ctx,world,time,night);
    rollingStock(ctx,TownRail.train(world.tick,progress));
    for(const traveler of TownRail.passengers(world.tick,progress)){
      const {id,x,y,phase}=traveler;
      const walking=['alight','walk','board'].includes(phase);
      figure(ctx,{id},x,y,walking?Math.sin(time/110+id)*1.4:0,.85);
      ctx.fillStyle='#96684e';ctx.fillRect(x+4,y+1,3.5,4);
      line(ctx,[[x+4.6,y+1],[x+4.6,y],[x+6.2,y]],'#6a4e3b',.8);
    }
    const moment=TownMoments.active(world);
    for(const {resident,x,y,step,indoors,activity,social,partner} of pins){
      if(indoors&&!interiors)continue;
      if(moment&&(resident.id===moment.a||resident.id===moment.b)){
        ctx.beginPath();ctx.ellipse(x,y+3,10+Math.sin(time/250)*1.5,5,0,0,Math.PI*2);
        ctx.strokeStyle='#fff2ad';ctx.lineWidth=1.4;ctx.stroke();
      }
      if(resident.id===selection)ellipse(ctx,x,y+3,indoors?7:10,indoors?4:6,'#f9d17a');
      if(social==='walk')ellipse(ctx,x,y+3,8,4,'#b7e1ca99');
      if(indoors&&activity==='sleep'&&!step){
        ellipse(ctx,x+2,y+1,5,3,color(resident.id));ellipse(ctx,x-3,y,2.6,2.6,'#f4c695');
      }else figure(ctx,resident,x,y,step,(indoors?.74:1)*(TownSchool.student(resident)?.77:1));
      if(activity==='stars')ellipse(ctx,x+8,y-1,3,3,'#fff0a4');
    }
    for(const [id,{x,labelY}] of Object.entries(locations)){
      const text=Town.places[id].name;
      ctx.font=`600 ${15*labelScale}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      const w=ctx.measureText(text).width+16;
      ctx.beginPath();ctx.roundRect(x-w/2,labelY-11*labelScale,w,22*labelScale,6);ctx.fillStyle=choosingPlace?'#ffe8a5':'#fff7dfed';ctx.fill();
      ctx.fillStyle='#4d5340';ctx.fillText(text,x,labelY);
    }
    if(world.weather!=='晴朗')for(let i=0;i<60;i++){
      const snow=world.weather==='小雪';
      const x=(i*137+(snow?Math.sin(time/880+i)*13+16:time*.071))%960;
      const y=(i*97+time*(snow?.025:.31))%620;
      if(snow)ellipse(ctx,x,y,1.3+i%3*.37,1.5,'#fffdf1bb');
      else line(ctx,[[x,y],[x+4,y+9]],'#e8f1fa86',1.35);
    }
    const active=pins.find(pin=>pin.resident.id===selection&&(!pin.indoors||interiors));
    if(active){
      ctx.font=`700 ${13*labelScale}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      const w=ctx.measureText(active.resident.name).width+18;
      ctx.beginPath();ctx.roundRect(active.x-w/2,active.y-21-10*labelScale,w,19*labelScale,5);ctx.fillStyle='#344b3b';ctx.fill();
      ctx.fillStyle='#fff4d4';ctx.fillText(active.resident.name,active.x,active.y-21);
    }
    for(const {resident,x,y,social,partner} of pins){
      if(social!=='talk'||resident.id>=partner)continue;
      const other=pins.find(pin=>pin.resident.id===partner);
      const labelClearance=selection===resident.id||selection===partner?18:0;
      conversation(ctx,(x+other.x)/2,Math.min(y,other.y)-labelClearance,time);
    }
    return pins;
  }
  return { draw, stops, portrait, route, reroute, plan, position, findPlace, marker };
})();
