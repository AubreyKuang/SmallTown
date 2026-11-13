'use strict';
const $=id=>document.getElementById(id);
const KEY='god-dice-v1';
const canvas=$('map'),ctx=canvas.getContext('2d');
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let world=SaveManager.load(localStorage,KEY,Town.valid,Town.migrate);
const isNew=!world;
if(isNew){
  world=Town.create();
  while(world.tick<17)Town.step(world);
}
Town.upgrade(world);
let timer=null,audio=null,running=false,fast=false,choosingPlace=false,frame=null;
let lastFrame=null,manualUntil=0;
let draftPlan=0,draftHelper=null,shownOffer=-1;
let animationTime=0,tickProgress=0;
const tickDuration=()=>fast?2400:7200;
let schoolBoard=false;
let interiors=localStorage.getItem(KEY+':interiors')!=='off';
let heardConversation=false;
let crowd=createCrowd(),mapPins=crowd.pins();
let seenStory=world.sequence;
let watched=Number.isInteger(world.watchedEvent)?world.watchedEvent:null;
let snapDay=null;
// Every save also keeps one snapshot per game day so the player can rewind to that morning.
function save(){
  const data={...world,watchedEvent:watched,savedAt:Date.now()};
  const ok=SaveManager.save(localStorage,KEY,data,Town.valid);
  const d=Math.floor(world.tick/48);
  if(ok&&snapDay!==d){
    snapDay=d;
    if(!SaveManager.snapshots(localStorage,KEY).some(entry=>entry.label===`day-${d}`))
      SaveManager.snapshot(localStorage,KEY,data,Town.valid,{label:`day-${d}`,day:d,tick:world.tick});
  }
  return ok;
}
let pulses=[],pulseSeq=world.sequence,fateTab='quests',paperIndex=0,threadRoot=null,toastTimer=null;
let autoPaper=localStorage.getItem(KEY+':paper')!=='off';
let skippedPaperDay=null;
let visiblePins=mapPins;
let buildingType=null;
const camera=TownCamera.create();
const cameraInput=TownCamera.bind(canvas,camera,updateCamera);
const selected=()=>world.people.find(p=>p.id===Number($('person').value))||world.people[0];

function option(select,value,label){
  const el=document.createElement('option');
  el.value=value;el.textContent=label;select.append(el);
}
function populateResidents(){
  const before=$('person').value;
  $('person').replaceChildren();
  for(const p of world.people)option($('person'),p.id,p.name);
  if(world.people.some(p=>p.id===Number(before)))$('person').value=before;
}
populateResidents();
for(const [key,place] of Object.entries(Town.places)){
  const button=document.createElement('button');
  button.textContent=place.name;button.onclick=()=>intervene('visit',key);
  $('destinations').append(button);
}
$('offline').checked=localStorage.getItem(KEY+':offline')==='yes';
$('offline').onchange=()=>localStorage.setItem(KEY+':offline',$('offline').checked?'yes':'no');
if($('offline').checked&&world.savedAt){
  const elapsed=Math.max(0,Math.min(48,Math.floor((Date.now()-world.savedAt)/600000)));
  for(let i=0;i<elapsed;i++)Town.step(world);
  if(elapsed)$('notice').textContent=`离线期间，小镇推进了 ${elapsed/2} 小时。`;
  resetCrowd();
}
function beep(){
  if(!audio)return;
  const note=audio.createOscillator(),gain=audio.createGain();
  note.type='triangle';note.frequency.value=440;gain.gain.setValueAtTime(.05,audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.22);
  note.connect(gain).connect(audio.destination);note.start();note.stop(audio.currentTime+.23);
}

function residentActivity(p){
  const pin=visiblePins.find(walker=>walker.resident.id===p.id);
  if(pin?.activity==='breadCart'&&TownSupply.current(world)?.leg?.person===p.id)return '在推车送货';
  const place=p.place==='homes'?'家':Town.places[p.place].name;
  const label=TownRoutines.labels[Town.activity(world,p)];
  const companion=pin?.partner&&world.people.find(other=>other.id===pin.partner);
  return companion?`和 ${companion.name} ${pin.social==='talk'?'聊天':'同行'}`:
    pin?.movingTo||pin?.place!==p.place?`去${place}的路上`:p.place==='homes'&&label.startsWith('在家')?label:`${place} · ${label}`;
}
function personalThought(p){
  return TownRelations.thought(world,p)??TownSkeptic.thought(world,p)??TownRipples.thought(world,p)??TownWishes.thought(world,p,Town.activity(world,p));
}
function paint(){
  const progress=motion.matches?.62:tickProgress;
  const cargo=TownSupply.cargo(world,progress);
  visiblePins=cargo?mapPins.map(pin=>pin.resident.id===cargo.person?
    {...pin,x:cargo.x,y:cargo.y,indoors:false,activity:'breadCart',social:null,partner:null,movingTo:null,
      step:Math.sin(animationTime/120)*1.4}:pin).sort((a,b)=>a.y-b.y):mapPins;
  const p=selected(),activity=residentActivity(p);
  const bio=`${activity} · 心情 ${p.mood} · ${p.money} 元${p.questioned?' · 察觉异常':''}`;
  if($('bio').textContent!==bio)$('bio').textContent=bio;
  const pixelRatio=Math.min(2,window.devicePixelRatio||1);
  const backingWidth=Math.max(TownCamera.width,Math.min(2400,Math.round(canvas.clientWidth*pixelRatio)));
  const backingHeight=Math.round(backingWidth*TownCamera.height/TownCamera.width);
  if(canvas.width!==backingWidth||canvas.height!==backingHeight){
    canvas.width=backingWidth;canvas.height=backingHeight;
  }
  const sx=canvas.width/TownCamera.width,sy=canvas.height/TownCamera.height;
  ctx.save();
  ctx.setTransform(sx*camera.scale,0,0,sy*camera.scale,sx*camera.x,sy*camera.y);
  TownMap.draw(ctx,world,p.id,canvas.clientWidth*camera.scale,visiblePins,choosingPlace,interiors,animationTime,progress,cargo,buildingType);
  drawPulses();
  ctx.restore();
}
function createCrowd(){
  return TownMovement.create(world,Math.random,(a,b)=>{
    if(Town.roadTalk(world,a,b))heardConversation=true;
  });
}
function resetCrowd(){
  if($('person').options.length!==world.people.length)populateResidents();
  crowd=createCrowd();
  mapPins=crowd.pins();
  tickProgress=0;
}
function refreshMotion(){
  const active=!motion.matches&&!document.hidden&&!modalOpen()&&(running||performance.now()<manualUntil);
  if(active&&frame===null)frame=requestAnimationFrame(animate);
  if(!active&&frame!==null){cancelAnimationFrame(frame);frame=null;lastFrame=null;}
}
function animate(now){
  frame=null;
  if(lastFrame!==null){
    crowd.advance(Math.min(.05,(now-lastFrame)/1000)*(fast?1.25:1),running);
    animationTime+=Math.min(50,now-lastFrame);
    tickProgress=Math.min(1,tickProgress+Math.min(50,now-lastFrame)/tickDuration());
    mapPins=crowd.pins();
    if(heardConversation){heardConversation=false;save();render();}
    else paint();
  }
  lastFrame=now;
  refreshMotion();
  if(frame===null)lastFrame=null;
}
function positionMapLinks(){
  for(const [id,x,y] of [['openSchool',646,97],['openRail',822,363]]){
    const point=camera.screen(x,y),button=$(id);
    button.hidden=choosingPlace||!!buildingType||point.x<58||point.x>TownCamera.width-58||point.y<14||point.y>TownCamera.height-62;
    button.style.left=`${point.x/TownCamera.width*100}%`;
    button.style.top=`${point.y/TownCamera.height*100}%`;
  }
}
function updateCamera(){
  $('zoomReset').textContent=`${Math.round(camera.scale*100)}%`;
  $('zoomOut').disabled=camera.scale<=TownCamera.min;
  $('zoomIn').disabled=camera.scale>=TownCamera.max;
  canvas.classList.toggle('can-pan',camera.scale>TownCamera.min);
  positionMapLinks();
  paint();
}
canvas.addEventListener('click',event=>{
  const bounds=canvas.getBoundingClientRect();
  const point=cameraInput.point(event);
  const {x,y}=camera.world(point.x,point.y);
  if(buildingType){placeBuilding(TownBuild.plotAt(x,y,buildingType));return;}
  if(choosingPlace){
    const place=TownMap.findPlace(x,y,world);
    if(place)intervene('visit',place);
    return;
  }
  const closest=visiblePins.reduce((best,pin)=>{
    if(pin.indoors&&!interiors)return best;
    const distance=Math.hypot(x-pin.x,y-pin.y+4);
    return distance<best.distance?{pin,distance}:best;
  },{pin:null,distance:Math.max(30,TownCamera.width/bounds.width*19)/camera.scale});
  const guest=TownRail.passengers(world.tick,motion.matches?.62:tickProgress).find(pin=>
    pin.visitor&&Math.min(Math.hypot(x-pin.x,y-pin.y+4),Math.hypot(x-pin.x,y-pin.y+26))<Math.min(24,closest.distance));
  if(guest){openRail(guest.visitor.id);return;}
  if(closest.pin){
    $('person').value=closest.pin.resident.id;
    render();
    openResidentProfile();
  }else if(TownTradeArt.hit(x,y)||['bakery','market'].includes(TownMap.findPlace(x,y)))openSupply();
});
function when(tick){return `第 ${Math.floor(tick/48)+1} 天 ${String(Math.floor(tick%48/2)).padStart(2,'0')}:${tick%2?'30':'00'}`;}
const modalOpen=()=>['journal','stories','moment','rail','wish','paper','fate','thread','twilight','supply','build'].some(id=>$(id).open);
function storyNode(tag,value,css){
  const node=document.createElement(tag);
  node.textContent=value;
  if(css)node.className=css;
  return node;
}
function storyButton(label,action,css){
  const button=storyNode('button',label,css);
  button.onclick=action;
  return button;
}
function observeAt(at){
  setRunning(false);
  const previousPaper=world.papers?.at(-1);
  while(world.tick<at)Town.step(world);
  const latestPaper=world.papers?.at(-1);
  if(latestPaper&&latestPaper!==previousPaper)skippedPaperDay=latestPaper.day;
  resetCrowd();save();render();
  canvas.focus({preventScroll:true});
  canvas.scrollIntoView({block:'nearest'});
}
const supplyLabels={waiting:'等早班列车',unload:'站台等人卸货',inbound:'推车送面粉', 'oven-wait':'等面包师到店',
  baking:'炉里正在烤',pickup:'面包出炉，等人来搬',outbound:'推车去商街',market:'商街开卖',served:'今天的订单都卖完了',short:'收市，面包还不够',closed:'今日已收市'};
function placeBuilding(plot){
  if(!buildingType||!Town.placeBuilding(world,plot,buildingType))return;
  buildingType=null;
  save();render();
  showToast('已开工',`${TownBuild.plots[plot].name}已立起脚手架。`);
  $('openBuild').focus({preventScroll:true});
}
function renderBuild(){
  const funds=TownSupply.funds(world),buildings=TownBuild.buildings(world);
  const entry=$('openBuild'),panel=$('buildPanel'),placement=$('buildPlacement');
  entry.replaceChildren(storyNode('strong','小镇建设'),
    storyNode('small',`${world.people.length} 位居民 · 工坊公款 ${funds} 元`));
  placement.hidden=!buildingType;
  if(buildingType){
    const type=TownBuild.types[buildingType];
    const choices=storyNode('div','','build-choices');
    for(const [plot,site] of TownBuild.plots.entries()){
      const button=storyButton(`${plot+1} · ${site.name}`,()=>placeBuilding(plot));
      button.disabled=!TownBuild.canPlace(world,plot,buildingType);
      choices.append(button);
    }
    placement.replaceChildren(storyNode('strong',`放置${type.name} · ${type.cost} 元`),
      storyNode('p','点击地图高亮地块，也可从列表选址。','story-meta'),choices,
      storyButton('取消放置',()=>{buildingType=null;render();entry.focus();}));
  }
  if(!$('build').open)return;
  const choices=storyNode('div','','story-choices');
  const available=buildings.length<TownBuild.plots.length;
  for(const [key,type] of Object.entries(TownBuild.types)){
    const button=storyButton('',()=>{
      choosingPlace=false;buildingType=key;
      $('build').close();
      camera.reset();render();
      canvas.focus({preventScroll:true});
      canvas.scrollIntoView({block:'nearest'});
    });
    button.disabled=!available||funds<type.cost;
    button.append(storyNode('strong',type.name),
      storyNode('small',`${type.cost} 元 · ${type.capacity} 位住户 · 施工 ${type.duration/2} 小时`));
    choices.append(button);
  }
  const list=storyNode('ul','','build-list');
  for(const b of buildings){
    const names=world.people.filter(p=>p.homePlot===b.plot).map(p=>p.name);
    const status=b.movedIn?`已入住 · ${names.join('、')}`:b.finished?`已完工 · ${when(b.moveIn)} 入住`:
      `${when(b.ready)} 竣工 · ${when(b.moveIn)} 入住`;
    list.append(storyNode('li',`${TownBuild.plots[b.plot].name} · ${TownBuild.types[b.type].name} · ${status}`));
  }
  const nodes=[storyNode('p',`工坊公款 ${funds} 元 · 剩余地块 ${TownBuild.plots.length-buildings.length} 块`),
    storyNode('p','面包收入进入公款。住宅完工后，新住户搭接下来第一班早班车抵达。','story-meta'),choices];
  if(list.childElementCount)nodes.push(storyNode('h3','已选地块'),list);
  const next=buildings.filter(b=>!b.movedIn).sort((a,b)=>a.moveIn-b.moveIn)[0];
  if(next)nodes.push(storyButton('到新住户抵达时',()=>{
    $('build').close();observeAt(next.moveIn);
  },'story-primary'));
  panel.replaceChildren(...nodes);
}
function renderSupply(){
  const entry=$('openSupply'),panel=$('supplyPanel'),stage=TownSupply.stage(world);
  const run=TownSupply.current(world),state=world.supply;
  const depot=TownSupply.depots[state?.depot??'square'];
  const close=TownSupply.dayStart(world)+TownSupply.close;
  entry.dataset.stage=stage;
  entry.replaceChildren(storyNode('strong','今天的面包'),
    storyNode('small',`${supplyLabels[stage]} · ${run?.sold??0}/${TownSupply.demand}`));
  if(!$('supply').open)return;
  const chain=storyNode('ol','','supply-chain');
  for(const [label,stages] of [
    ['车站',['waiting','unload']],['货棚',['inbound','oven-wait']],['面包坊',['baking','pickup']],['商街',['outbound','market','short','served','closed']]
  ]){
    const item=storyNode('li',label);
    if(stages.includes(stage))item.setAttribute('aria-current','step');
    chain.append(item);
  }
  const funds=state?.coins??TownSupply.initialCoins;
  const nodes=[chain,storyNode('p',`今天需要 ${TownSupply.demand} 个面包 · 18:00 收市 · ${world.weather}`,'story-meta'),
    storyNode('p',`${supplyLabels[stage]}。已卖 ${run?.sold??0} 个，工坊公款 ${funds} 元。`)];
  if(run?.leg){
    const person=world.people.find(p=>p.id===run.leg.person);
    nodes.push(storyNode('p',`${person.name} 正在负责这一步 · 预计 ${when(Math.min(run.leg.to,close))}${run.leg.to>=close?' 收市前来不及完成':''}`,'story-meta'));
  }
  if(world.weather!=='晴朗')nodes.push(storyNode('p','雨雪会拖慢两段推车路线。','story-meta'));
  const actions=storyNode('div','','story-actions');
  const helper=TownSupply.helper(world);
  if(helper)actions.append(storyButton(`请 ${helper.name} 帮忙 · 1 次干预`,()=>{
    const root=Town.assistSupply(world,helper.id);
    if(root){watched=root;beep();save();render();$('supplyTitle').focus();}
  },'story-primary'));
  if(world.tick<TownSupply.dayStart(world)+TownSupply.arrival)actions.append(storyButton('到早班车卸货时',()=>{
    $('supply').close();observeAt(TownSupply.dayStart(world)+TownSupply.arrival);
  }));
  if(world.tick<close)actions.append(storyButton('看到今天收市',()=>{
    $('supply').close();observeAt(close);
  }));
  nodes.push(actions,storyNode('p',`现在使用${depot.name}。${state?.nextDepot?'新的站边货棚从明天早班车开始使用。':''}`,'story-meta'));
  if(depot===TownSupply.depots.square&&!state?.nextDepot){
    const cost=TownSupply.depots.station.cost;
    const button=storyButton(`修站边货棚 · ${cost} 元`,()=>{
      if(TownSupply.build(world)){save();render();$('supplyTitle').focus();}
    });
    button.disabled=funds<cost;
    nodes.push(storyNode('p','改建后，明天起卸货到面包坊可节省一个游戏小时。','story-meta'),button);
  }
  panel.replaceChildren(...nodes);
}
function openSupply(){
  $('supply').showModal();renderSupply();scheduleNext();refreshMotion();
}
function renderTwilight(){
  const scene=TownTwilight.plan(world),current=scene&&TownTwilight.state(world,scene);
  const active=TownTwilight.lit(world),panel=$('twilightPanel'),entry=$('openTwilight');
  const upcoming=scene&&world.tick<scene.until;
  const timing=active?`灯已点亮 · ${Town.places[active].name}`:upcoming?
    `今晚 18:00 · ${Town.places[scene.place].name}`:`下次在第 ${TownTwilight.nextDay(world)+1} 天 · 每三天一盏灯`;
  entry.dataset.lit=String(Boolean(active));
  entry.replaceChildren(storyNode('strong','河畔灯笺'),storyNode('small',timing));
  if(!$('twilight').open)return;
  const nodes=[];
  if(scene){
    const host=world.people.find(p=>p.id===scene.host);
    const place=Town.places[scene.place].name;
    nodes.push(storyNode('p',`${when(scene.at)} · ${place} · ${scene.weather}`,'story-meta'),
      storyNode('p',scene.prompt,'wish-thought'));
    if(scene.weather==='细雨')nodes.push(storyNode('p','河岸在下雨，今晚把灯挪到了咖啡厅。','story-meta'));
    if(current?.invite){
      const guest=world.people.find(p=>p.id===current.invite.id);
      nodes.push(storyNode('p',`给 ${guest.name} 的灯笺掷出 ${current.invite.die} 点。${current.invite.die>=3?'有空时会来。':'今晚照原来的日程走。'}`,'story-meta'));
    }
    if(current?.result)nodes.push(storyNode('p',current.result.text,'story-result'));
    if(upcoming&&!current?.result&&!current?.invite){
      nodes.push(storyNode('p',`${host.name} 会留一盏灯。有空的人可能顺路坐下。也可以花一次干预，给其中一人捎张灯笺。`));
      const choices=storyNode('div','','story-choices');
      for(const id of scene.guests){
        const guest=world.people.find(p=>p.id===id);
        const button=storyButton('',()=>{
          const root=Town.inviteTwilight(world,id);
          if(root){watched=root;beep();save();render();$('twilightTitle').focus();}
        });
        const forecast=Town.forecastPlan(world,guest,Math.max(world.tick,scene.at));
        button.append(storyNode('strong',`捎给 ${guest.name}`),
          storyNode('small',`按目前日程 · ${Town.places[forecast.place].name} · ${TownRoutines.labels[forecast.activity]}`));
        button.disabled=!TownTwilight.canInvite(world,id);
        choices.append(button);
      }
      nodes.push(choices);
    }
    if(world.tick<scene.at-1)nodes.push(storyButton('到点灯前半小时',()=>{
      $('twilight').close();observeAt(scene.at-1);
    },'story-primary'));
  }else nodes.push(storyNode('p',timing,'story-meta'),
    storyNode('p','河畔灯笺每隔三个游戏日亮一次：Iris、Grace 和 Alice 轮流在 18:00 留一盏灯，晴天和小雪在中央广场，细雨时挪进咖啡厅。有空的人可能顺路坐下，聊聊画、旧车票或新烤的面包。'));
  const cards=TownTwilight.cards(world);
  if(cards.length){
    const list=storyNode('ul','','twilight-cards');
    for(const card of cards.slice().reverse()){
      const row=storyNode('li','');
      row.append(storyNode('strong',card.title),
        storyNode('small',`第 ${card.day+1} 天 · ${card.weather} · ${Town.places[card.place].name}`),
        storyNode('p',card.text));
      list.append(row);
    }
    nodes.push(storyNode('h3','收藏的灯笺'),list);
  }
  panel.replaceChildren(...nodes);
}
function renderRail(){
  const {active,next,phase}=TownRail.schedule(world.tick),button=$('openRail');
  const status={approach:'正在进站',platform:'正在上下车',departure:'正在发车'};
  button.dataset.active=String(Boolean(active));
  button.textContent=active?status[phase]:'列车 ›';
  if(!$('rail').open)return;
  const list=storyNode('ol','','rail-list');
  for(const service of TownRail.services(Math.floor(world.tick/48))){
    list.append(storyNode('li',`${when(service.start+1)} 到站 · ${service.arrivals} 位下车 · ${service.departures} 位上车`));
  }
  const guests=storyNode('div','','rail-guests');
  for(const {profile,trip,history} of TownVisitors.timetable(world)){
    const card=storyNode('section','','resident-section');
    const heading=storyNode('h3',profile.name);
    heading.id=`visitor-${profile.id}`;heading.tabIndex=-1;
    card.append(heading,storyNode('p',profile.reason));
    if(trip){
      const timing=world.tick>=trip.arrival?'正在镇上':`${when(trip.arrival)} 到站`;
      card.append(storyNode('p',`${timing} · ${when(trip.departure)} 返程`,'story-meta'));
      if(world.tick<trip.arrival-1)card.append(storyButton('前往到站前半小时',()=>{
        $('rail').close();observeAt(trip.arrival-1);
      }));
    }else card.append(storyNode('p','这一程已结束','story-meta'));
    if(history?.lastMeeting){
      const {day,text}=history.lastMeeting;
      card.append(storyNode('p',`${day===Math.floor(world.tick/48)?'今天见面':'上次见面'} · 第 ${day+1} 天 · ${text}`,'story-result'));
    }
    guests.append(card);
  }
  $('railPanel').replaceChildren(storyNode('h3',active?status[phase]:`下一班 ${when(next.start+1)}`),list,
    storyNode('h3','来镇上的旅客'),guests);
}
function renderWish(){
  const p=selected(),profile=TownWishes.profile(p.id),state=TownWishes.state(world,p.id),panel=$('wishPanel');
  const thought=personalThought(p),date=TownRelations.date(world,p);
  $('wishTitle').textContent=`${p.name} 的人物档案`;
  function switchResident(id){
    $('person').value=id;render();$('wishTitle').focus();
  }
  const people=storyNode('div','','wish-people');
  for(const id of [6,8,...TownWishes.ids]){
    const person=world.people.find(candidate=>candidate.id===id);
    const button=storyButton(person.name,()=>switchResident(id));
    button.setAttribute('aria-pressed',String(id===p.id));people.append(button);
  }
  const mood=p.mood>=80?'心情很好':p.mood>=55?'心情平稳':p.mood>=40?'有些低落':'很想独处';
  panel.replaceChildren(people,storyNode('p',`此刻 · ${residentActivity(p)} · ${mood}（${p.mood}）`,'story-meta'),
    storyNode('p',`「${thought}」`,'wish-thought'));
  const following=TownWatch.ids(world).includes(p.id);
  const atLimit=!following&&TownWatch.ids(world).length>=TownWatch.limit;
  const followButton=storyButton(following?`取消关注 ${p.name}`:atLimit?'已关注 2 位居民':`关注 ${p.name}`,()=>{
    if(TownWatch.toggle(world,p.id)){save();render();$('followResident').focus();}
  });
  followButton.id='followResident';followButton.disabled=atLimit;
  const followActions=storyNode('div','','story-actions');
  followActions.append(followButton);panel.append(followActions);
  if(p.homePlot!=null)panel.append(storyNode('p',`住址 · ${TownBuild.plots[p.homePlot].name}`,'story-meta'));
  const current=Town.activity(world,p);
  for(let tick=world.tick+1;tick<=world.tick+48;tick++){
    const next=Town.forecastPlan(world,p,tick);
    if(next.place===p.place&&next.activity===current)continue;
    panel.append(storyNode('p',`接下来 · ${when(tick)} · ${Town.places[next.place].name} · ${TownRoutines.labels[next.activity]}`,'story-meta'));
    break;
  }
  if(date){
    const {plan,other,place,conflict,canNudge}=date;
    const statuses={kept:'赴约了',missed:'失约了',repaired:'说开了',strained:'见了面，话没说开'};
    const block=storyNode('section','','resident-section');
    const heading=storyNode('h3',plan.result?statuses[plan.result.kind]:`想和 ${other.name} ${plan.kind==='repair'?'把上次的事说开':'见一面'}`);
    heading.tabIndex=-1;
    block.append(heading,storyNode('p',`恋人 · ${other.name} · ${when(plan.at)} · ${Town.places[place].name}`,'story-meta'));
    if(plan.result)block.append(storyNode('p',plan.result.text));
    else if(plan.previous)block.append(storyNode('p',`上次：${plan.previous.text}`));
    else if(conflict)block.append(storyNode('p','Owen 得先收摊，可能赶不上约定时间。'));
    if(plan.die)block.append(storyNode('p',`掷出 ${plan.die} 点。${plan.die>=5?'收摊比预期顺利。':plan.die>=3?'能赶在约定结束前收完。':'收摊还是耽搁了。'}`,'story-meta'));
    const actions=storyNode('div','','story-actions');
    actions.append(storyButton(`查看 ${other.name} 怎么想`,()=>switchResident(other.id)));
    if(!plan.result&&world.tick<plan.at-1)actions.append(storyButton('前进到见面前半小时',()=>{
      while(world.tick<plan.at-1)Town.step(world);
      resetCrowd();save();render();panel.querySelector('.resident-section h3').focus();
    }));
    if(canNudge)actions.append(storyButton('掷骰争取早点收摊 · 1 次干预',()=>{
      const root=Town.nudgeDate(world,p.id);
      if(root){watched=root;beep();save();render();panel.querySelector('.resident-section h3').focus();}
    },'story-primary'));
    block.append(actions);panel.append(block);
  }
  const details=document.createDocumentFragment(),connections=TownRelations.connections(world,p).slice(0,5);
  if(connections.length){
    const people=storyNode('div','','profile-relations');
    for(const {person,label,score,event} of connections){
      const button=storyButton('',()=>switchResident(person.id));
      const feeling=score>=8?'更信任了':score<0?'有些隔阂':'';
      button.append(storyNode('strong',`${person.name} · ${label}`));
      if(event||feeling)button.append(storyNode('small',[feeling,event?.text].filter(Boolean).join(' · ')));
      people.append(button);
    }
    details.append(storyNode('h3','人际关系'),people);
  }
  const memories=NPCMemory.recall(world,p.id).slice(0,3);
  if(memories.length){
    const list=storyNode('ul','','profile-memories');
    for(const memory of memories)list.append(storyNode('li',memory.interpretation));
    details.append(storyNode('h3','记得的事'),list);
  }
  if(!profile){panel.append(details);return;}
  const goal=TownWishes.beat(p.id,state),other=world.people.find(candidate=>candidate.id===profile.other);
  const heading=storyNode('h3',profile.title);heading.tabIndex=-1;
  panel.append(heading,storyNode('p',goal?`${profile.fear} · 进展 ${state.stage} / ${profile.beats.length}`:'这件心事已经有了结果。','story-meta'));
  if(state.die){
    const die=storyNode('div','','wish-die');
    const face=storyNode('span','⚀⚁⚂⚃⚄⚅'[state.die-1]);face.setAttribute('aria-hidden','true');
    const band=state.die<=2?'1–2 点：犹豫，没开口':state.die<=4?'3–4 点：自己去等，对方按原日程走':'5–6 点：给双方留出碰面的机会';
    die.append(face,storyNode('span',`上次掷出 ${state.die} 点 · ${band}`));panel.append(die);
  }
  if(state.latest)panel.append(storyNode('p',state.latest,'story-result'));
  if(!goal){panel.append(details);return;}
  const actions=storyNode('div','','story-actions');
  if(state.plan){
    const {at,until}=state.plan;
    const place=Town.places[goal.place].name;
    panel.append(storyNode('p',`${when(at)} 到 ${when(until).split(' ').at(-1)} · ${place} · 想见 ${other.name}`,'story-meta'));
    if(world.tick<at-1)actions.append(storyButton('前进到机会前半小时',()=>{
      while(world.tick<at-1)Town.step(world);
      resetCrowd();save();render();panel.querySelector('h3').focus();
    }));
    actions.append(storyButton(`观察 ${other.name}`,()=>{$('person').value=other.id;$('wish').close();render();}));
  }else{
    const canRoll=TownWishes.canRoll(world,p.id);
    const label=canRoll?'为这件事掷骰 · 1 次干预':world.tokens===0?'今天的干预次数用完了':'明天可以再掷骰';
    const button=storyButton(label,()=>{
      const root=Town.rollWish(world,p.id);
      if(root){watched=root;beep();save();render();$('wishTitle').focus();}
    },'story-primary');
    button.disabled=!canRoll;actions.append(button);
  }
  panel.append(storyNode('p','掷骰花 1 次干预。1–2 点会犹豫，3–4 点会自己去等，5–6 点会给两人都留出机会。赴约和开口还要看日程与信任。','story-meta'));
  panel.append(actions,details);
}
function renderMoment(){
  const m=world.moment,panel=$('momentPanel');
  panel.replaceChildren();
  if(!m)return;
  const scene=TownMoments.sceneFor(m),[a,b]=[m.a,m.b].map(id=>world.people.find(p=>p.id===id));
  const faces=storyNode('div','','moment-portraits');
  for(const p of [a,b]){
    const image=document.createElement('canvas');image.width=image.height=64;image.setAttribute('aria-hidden','true');
    TownMap.portrait(image,p);
    faces.append(image,storyNode('span',p.name));
  }
  panel.append(storyNode('h3',scene.title),faces);
  if(m.state==='done'){
    panel.append(storyNode('p',m.result,'story-result'));
    if(m.success)panel.append(storyNode('p','两个人都记住了这件事。接下来几天，如果他们再次在外相遇，可能会有后续。','story-meta'));
    return;
  }
  panel.append(storyNode('p',scene.prompt(a.name,b.name)),storyNode('p',`${Town.places[scene.place].name} · ${when(m.until)}`,'story-meta'));
  if(m.state==='waiting'){
    const destination=Town.places[Town.forecast(world,b,m.until)].name;
    panel.append(storyNode('p',`${a.name} 会在原处等。${b.name} 按目前的日程会去${destination}，可以临近赴约时让对方改道。`));
    panel.append(storyButton(`观察 ${b.name}`,()=>{$('person').value=b.id;$('moment').close();render();}));
    if(world.tick<m.until-2)panel.append(storyButton('前进到赴约前 1 小时',()=>{
      while(world.tick<m.until-2)Town.step(world);
      resetCrowd();save();render();
    }));
    return;
  }
  const options=storyNode('div','','moment-actions');
  const choose=(mode,title,detail,disabled=false)=>{
    const button=storyButton(title,()=>{
      if(Town.chooseMoment(world,m.root,mode)){watched=m.root;beep();save();render();}
    });
    button.append(storyNode('small',detail));button.disabled=disabled;options.append(button);
  };
  choose('hint',scene.hint,'用一次干预，趁两人还在场给一个小提示。',world.tokens<1||a.place!==scene.place||b.place!==scene.place);
  choose('reunion','让其中一人明天再来','用一次干预，留一个再见的机会。两人赴约会留下更深的记忆。',world.tokens<1);
  choose('leave','让他们自己决定','不花干预。对方的性格和信任会影响是否开口。');
  panel.append(options);
}
function renderBoard(){
  const active=TownStories.active(world),offer=TownStories.offer(world);
  $('storyButtonTitle').textContent=active?TownStories.planFor(active).name:offer.title;
  $('storyButtonDetail').textContent=active?`${when(active.time)} · ${Town.places[TownStories.planFor(active).place].name}`:
    `镇务告示 · 收藏 ${world.keepsakes?.length??0} / ${TownStories.total}`;
}
function renderStories(){
  const panel=$('storyPanel'),active=TownStories.active(world),offer=TownStories.offer(world,schoolBoard);
  panel.replaceChildren();
  if(active){
    const plan=TownStories.planFor(active),helper=world.people.find(p=>p.id===active.helper);
    const willing=TownStories.eligible(world,active,helper);
    const place=Town.places[plan.place].name;
    const forecast=Town.places[Town.forecast(world,helper,active.time)].name;
    panel.append(storyNode('h3',plan.name),storyNode('p',`${when(active.time)} · ${place} · 搭档 ${helper.name}`,'story-meta'),
      storyNode('p',active.invited?`${helper.name} 已留出时间。请让两人按约定到场。`:
        willing?`${helper.name} 愿意搭手。按目前的日程，届时可能在${forecast}。`:
          `${helper.name} 目前还不愿接这项活。可以设法让两人碰面，或看看他们的关系会怎么变。`));
    const actions=storyNode('div','','story-actions');
    const invite=storyButton(active.invited?'已经约好':world.tokens>0?'约好时间 · 1 次干预':'约好时间 · 今日次数已用完',()=>{
      if(Town.inviteStory(world)){save();render();$('storyPanel').querySelector('h3').focus();}
    },'story-primary');
    invite.disabled=active.invited||!willing||world.tokens<1;
    actions.append(invite,storyButton(`在地图上观察 ${helper.name}`,()=>{
      $('person').value=helper.id;$('stories').close();render();
    }));
    if(world.tick<active.time-2)actions.append(storyButton('前进到集合前 1 小时',()=>{
      while(world.tick<active.time-2)Town.step(world);
      resetCrowd();save();render();$('storyPanel').querySelector('h3').focus();
    }));
    panel.firstElementChild.tabIndex=-1;
    panel.append(actions,storyNode('p','到约定时刻，两人需要都在现场。你也可以用「改道」让搭档准时到场。','story-meta'));
  }else{
    const past=world.townStory;
    if(past){
      const result=world.events.findLast(e=>e.parent===past.root&&['story-done','story-missed'].includes(e.type));
      if(result)panel.append(storyNode('p',result.text,'story-result'));
    }
    const today=Math.floor(world.tick/48);
    if(past?.day===today){panel.append(storyNode('p','明天再来查看新的告示。'));}
    else{
      const offerKey=today*2+Number(schoolBoard);
      if(shownOffer!==offerKey){shownOffer=offerKey;draftPlan=0;draftHelper=null;}
      panel.append(storyNode('h3',offer.title),storyNode('p',offer.intro));
      const choices=storyNode('div','','story-choices');
      const requirements={bakery:'面包店员工',market:'商业街员工',station:'车站员工',generous:'热心的居民'};
      offer.plans.forEach((plan,index)=>{
        const choice=storyButton('',()=>{draftPlan=index;draftHelper=null;renderStories();$(`plan-${index}`).focus();});
        choice.id=`plan-${index}`;
        choice.setAttribute('aria-pressed',String(index===draftPlan));
        choice.append(storyNode('strong',plan.name),storyNode('span',plan.description),storyNode('small',`推荐 ${requirements[plan.skill]}，或信任发起人的居民`));
        choices.append(choice);
      });
      panel.append(choices);
      const proposal={story:offer.index,plan:draftPlan};
      const deadline=offer.deadline;
      const venue=TownStories.planFor(proposal).place;
      const candidates=world.people.filter(p=>p.id!==offer.host&&!TownSchool.student(p)).map(p=>({p,
        willing:TownStories.eligible(world,proposal,p),there:Town.forecast(world,p,deadline)===venue}));
      candidates.sort((a,b)=>Number(b.willing)*2+Number(b.there)-Number(a.willing)*2-Number(a.there));
      const label=storyNode('label','选择搭档');label.htmlFor='storyHelper';
      const select=document.createElement('select');select.id='storyHelper';
      for(const {p,willing,there} of candidates)option(select,p.id,`${p.name} · ${willing?'愿意搭手':'暂时不愿意'}${there?' · 日程会经过':''}`);
      if(draftHelper!==null)select.value=draftHelper;
      select.onchange=()=>{draftHelper=Number(select.value);};
      const start=storyButton('开始筹备',()=>{
        if(Town.startStory(world,draftPlan,Number(select.value),schoolBoard)){save();render();$('storyPanel').querySelector('h3').focus();}
      },'story-primary');
      const actions=storyNode('div','','story-actions');actions.append(label,select,start);
      panel.append(storyNode('p',`${when(deadline)} · ${Town.places[venue].name}`,'story-meta'),actions);
    }
  }
  if(schoolBoard){
    const roster=storyNode('div','','school-roster');
    for(const p of world.people.filter(p=>p.id>=TownSchool.teacher)){
      roster.append(storyButton(`${p.name} · ${TownRoutines.labels[Town.activity(world,p)]}`,()=>{
        $('person').value=p.id;$('stories').close();render();
      }));
    }
    panel.append(storyNode('p','点击查看老师和学生','story-meta'),roster);
  }
  const collection=(world.keepsakes??[]).map(key=>TownStories.stories[Math.floor(key/2)].plans[key%2].keepsake);
  panel.append(storyNode('p',`小镇收藏 ${collection.length} / ${TownStories.total}${collection.length?` · ${collection.join('、')}`:''}`,'story-collection'));
}
function describeCauses(event){
  const causes=[];
  let parent=event.parent;
  while(parent&&causes.length<5){
    const ancestor=world.events.find(item=>item.id===parent);
    if(!ancestor)break;
    causes.unshift(ancestor.text);parent=ancestor.parent;
  }
  return causes;
}
function renderJournal(){
  const p=selected();
  const list=$('events');list.replaceChildren();
  for(const e of world.events.slice(-20).reverse()){
    const row=document.createElement('li');
    const person=world.people.find(resident=>resident.id===e.ids?.[0]);
    const label=document.createElement(person?'button':'span');
    label.textContent=e.text;
    if(person)label.onclick=()=>{$('person').value=person.id;$('journal').close();render();};
    const sub=document.createElement('small');
    const causes=describeCauses(e);
    sub.textContent=when(e.tick)+(causes.length?' · 起因：'+causes.join(' → '):'');
    row.append(label,sub);list.append(row);
  }
  if(!world.events.length){
    const row=document.createElement('li');row.textContent='小镇还没有留下记录。';list.append(row);
  }
  $('memoryTitle').textContent=p.name+' 的记忆';
  const connections=world.people.map(other=>({other,score:p.trust[other.id]||0}))
    .filter(({score})=>score!==0).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score)).slice(0,5);
  $('connections').replaceChildren(...connections.map(({other,score})=>
    storyNode('span',`${other.name} · ${score>0?'+':''}${score}`)));
  $('connections').hidden=!connections.length;
  $('memories').replaceChildren();
  const memories=NPCMemory.recall(world,p.id).slice(0,8);
  for(const memory of memories){
    const item=document.createElement('li');item.textContent=memory.interpretation;$('memories').append(item);
  }
  if(!memories.length){
    const item=document.createElement('li');item.textContent='目前没有可回顾的经历。';$('memories').append(item);
  }
}
function renderFollow(){
  const root=world.events.find(event=>event.id===watched);
  const text=$('follow');
  text.replaceChildren();
  if(!root){
    text.textContent='选一位居民，拨动一次命运，再看看事情会怎么发展。';
    return;
  }
  const outcome=world.events.findLast(e=>e.parent===root.id&&!['suspicion','note'].includes(e.type));
  const result=world.events.findLast(e=>e.type==='moment-favor'&&e.parent===outcome?.id)??outcome;
  const twilight=TownTwilight.plan(world);
  const lantern=twilight&&TownTwilight.state(world,twilight);
  const pending=TownSupply.pendingHelp(world,root.id)||TownRipples.pendingFor(world,root.id)||world.pending.some(e=>e.parent===root.id)||TownMoments.active(world)?.root===root.id||TownWishes.activeRoot(world,root.id)||TownRelations.activeRoot(world,root.id)||(!lantern?.result&&lantern?.invite?.root===root.id);
  const badge=document.createElement('strong');
  badge.textContent=pending?'追踪中':result?'后续':'已发生';
  text.append(badge,document.createTextNode(result?.text??root.text));
  const rootId=TownRipples.rootOf(world,root.id)?.id??root.id,sum=TownRipples.summary(world,rootId);
  if(sum.count)text.append(storyNode('em',` · 已牵动 ${sum.people.length} 人`));
  text.append(storyButton('因果链 ›',()=>openThread(rootId),'thread-entry'));
}
function renderWatch(){
  const panel=$('residentWatch'),ids=TownWatch.ids(world);
  panel.hidden=!ids.length;
  const cards=ids.map(id=>{
    const person=world.people.find(p=>p.id===id);
    const [next]=TownWatch.appointments(world,person);
    const latest=TownWatch.developments(world.events,id).at(-1);
    const card=storyNode('div','','watch-person');
    card.append(storyButton(`${person.name} 的档案 ›`,()=>{
      $('person').value=id;render();openResidentProfile();
    }));
    if(next){
      const at=next.at<=world.tick?'正在约定时段':when(next.at);
      card.append(storyNode('p',`${next.title} · ${at} · ${Town.places[next.place].name}`));
      if(next.at>world.tick+1)card.append(storyButton('到约定前半小时',()=>observeAt(next.at-1)));
    }
    if(latest&&world.tick-latest.tick<144)card.append(storyNode('p',latest.text,'story-meta'));
    else if(!next)card.append(storyNode('p','还没有新的约定。','story-meta'));
    return card;
  });
  panel.replaceChildren(storyNode('h2','关注的居民'),...cards);
}
function render(){
  const p=selected(),night=world.tick%48<12||world.tick%48>=40;
  $('clock').textContent=when(world.tick);
  $('skyIcon').textContent=world.power?'◐':world.weather==='小雪'?'❄':world.weather==='细雨'?'☂':night?'☾':'☀';
  $('skyIcon').title=world.power?'停电':world.weather;
  $('tokens').textContent=`今日干预：${world.tokens}/${Town.dailyTotal(world)} 次`;
  $('tokens').title='每天 3 次起；完成委托，第二天多得，最多 5 次。掷骰、捎灯笺、约时间等每次花 1 次干预。';
  TownMap.portrait($('portrait'),p);
  $('wishPreview').textContent=`${p.name}：${personalThought(p)}`;
  document.querySelectorAll('[data-kind]').forEach(button=>button.disabled=!Town.canAct(world,p,button.dataset.kind));
  if(world.tokens<=0)choosingPlace=false;
  $('redirect').disabled=world.tokens<=0;
  $('redirect').setAttribute('aria-expanded',String(choosingPlace));
  $('destinations').hidden=!choosingPlace;
  renderRail();
  renderTwilight();
  renderSupply();
  renderBuild();
  if($('moment').open)renderMoment();
  if($('wish').open)renderWish();
  $('mapHint').textContent=choosingPlace?`给 ${p.name} 点一个目的地`:buildingType?'点击编号地块确认施工':'点击居民查看档案';
  const moment=TownMoments.active(world);
  const latest=world.events.findLast(e=>e.type!=='town');
  $('mapStory').hidden=choosingPlace||(!latest&&!moment);
  $('mapStoryLabel').textContent=moment?.state==='open'?'偶遇':moment?'赴约':'镇讯';
  if(moment){
    const scene=TownMoments.sceneFor(moment);
    $('mapStoryText').textContent=`${Town.places[scene.place].name} · ${scene.title}`;
  }else $('mapStoryText').textContent=latest?.text||'';
  $('unread').hidden=!latest||latest.id<=seenStory;
  renderBoard();
  if($('stories').open)renderStories();
  if($('journal').open)renderJournal();
  renderFollow();
  renderWatch();
  renderExtras();
  updateCamera();
}
function advance(){
  Town.step(world);
  if(motion.matches||$('person').options.length!==world.people.length)resetCrowd();
  tickProgress=0;
  save();render();
}
function scheduleNext(delay=Math.max(100,(1-tickProgress)*tickDuration())){
  clearTimeout(timer);
  if(running&&!document.hidden&&!modalOpen())timer=setTimeout(()=>{advance();scheduleNext();},delay);
}
function setRunning(next){
  running=next;
  manualUntil=0;
  $('auto').textContent=running?'⏸':'▶';
  $('auto').setAttribute('aria-pressed',String(running));
  $('auto').setAttribute('aria-label',running?'暂停时间':'继续时间');
  $('auto').title=running?'暂停时间':'继续时间';
  scheduleNext();
  refreshMotion();
}
function intervene(kind,place){
  const before=world.sequence;
  if(!Town.influence(world,selected().id,kind,place))return;
  watched=before+1;
  choosingPlace=false;
  beep();save();render();
}
function openJournal(){
  seenStory=world.sequence;
  $('unread').hidden=true;
  renderJournal();
  $('journal').showModal();
  clearTimeout(timer);
  refreshMotion();
}
$('step').onclick=()=>{advance();manualUntil=performance.now()+7200;scheduleNext();refreshMotion();};
$('toNight').onclick=()=>{
  setRunning(false);
  const target=(Math.floor(world.tick/48)+1)*48;
  const previousPaper=world.papers?.at(-1);
  while(world.tick<target)Town.step(world);
  const latestPaper=world.papers?.at(-1);
  if(latestPaper&&latestPaper!==previousPaper)skippedPaperDay=latestPaper.day;
  resetCrowd();save();render();
};
$('auto').onclick=()=>setRunning(!running);
$('speed').onclick=()=>{fast=!fast;$('speed').textContent=fast?'3×':'1×';scheduleNext();};
function showHomeMode(){
  $('homeView').setAttribute('aria-pressed',String(interiors));
  $('homeView').textContent=interiors?'屋内':'外观';
  $('homeView').setAttribute('aria-label',interiors?'屋内视图':'建筑外观');
}
$('homeView').onclick=()=>{
  interiors=!interiors;
  localStorage.setItem(KEY+':interiors',interiors?'on':'off');
  showHomeMode();paint();
};
showHomeMode();
$('person').onchange=render;
$('redirect').onclick=()=>{buildingType=null;choosingPlace=!choosingPlace;render();};
$('openJournal').onclick=openJournal;
$('mapStory').onclick=()=>{
  if(TownMoments.active(world))openMoment();
  else openJournal();
};
$('closeJournal').onclick=()=>$('journal').close();
function openStories(school=false){
  schoolBoard=school;
  $('storiesTitle').textContent=school?'微光小学':'镇务告示';
  renderStories();$('stories').showModal();scheduleNext();refreshMotion();
}
$('openStories').onclick=()=>openStories();
$('openSchool').onclick=()=>openStories(true);
$('closeStories').onclick=()=>$('stories').close();
function openMoment(){renderMoment();$('moment').showModal();scheduleNext();refreshMotion();}
$('closeMoment').onclick=()=>$('moment').close();
function openRail(visitor){
  $('rail').showModal();renderRail();scheduleNext();refreshMotion();
  if(visitor)$(`visitor-${visitor}`)?.focus();
}
$('openBuild').onclick=()=>{$('build').showModal();renderBuild();scheduleNext();refreshMotion();};
$('closeBuild').onclick=()=>$('build').close();
$('openSupply').onclick=openSupply;
$('closeSupply').onclick=()=>$('supply').close();
$('zoomOut').onclick=()=>cameraInput.zoomBy(1/1.2);
$('zoomIn').onclick=()=>cameraInput.zoomBy(1.2);
$('zoomReset').onclick=()=>{camera.reset();updateCamera();};
$('openRail').onclick=()=>openRail();
$('closeRail').onclick=()=>$('rail').close();
$('openTwilight').onclick=()=>{$('twilight').showModal();renderTwilight();scheduleNext();refreshMotion();};
$('closeTwilight').onclick=()=>$('twilight').close();
function openResidentProfile(){
  renderWish();
  $('wish').showModal();
  scheduleNext();
  refreshMotion();
}
$('openWish').onclick=openResidentProfile;
$('closeWish').onclick=()=>$('wish').close();
for(const id of ['journal','stories','moment','rail','wish','paper','fate','thread','twilight','supply','build'])$(id).addEventListener('close',()=>{scheduleNext();refreshMotion();});
$('sound').onclick=async()=>{
  if(audio){await audio.close();audio=null;}else{audio=new AudioContext();await audio.resume();beep();}
  const label=audio?'关闭音效':'开启音效';
  $('sound').setAttribute('aria-pressed',String(!!audio));
  $('sound').setAttribute('aria-label',label);
  $('sound').title=label;
};
for(const button of document.querySelectorAll('[data-kind]'))button.onclick=()=>intervene(button.dataset.kind);
$('export').onclick=()=>{
  const link=document.createElement('a');
  link.href=URL.createObjectURL(new Blob([JSON.stringify({...world,watchedEvent:watched},null,2)],{type:'application/json'}));
  link.download='god-dice-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
};
$('importButton').onclick=()=>$('import').click();
$('import').onchange=async event=>{
  try{
    const file=event.target.files[0];if(!file)return;
    const parsed=JSON.parse(await file.text());
    const data=Town.migrate(parsed,parsed?.saveVersion??1);
    if(!Town.valid(data))throw new Error();
    Town.upgrade(data);
    const newWatch=Number.isInteger(data.watchedEvent)?data.watchedEvent:null;
    if(!SaveManager.save(localStorage,KEY,{...data,savedAt:Date.now()},Town.valid))throw new Error();
    world=data;watched=newWatch;seenStory=world.sequence;pulseSeq=world.sequence;choosingPlace=false;buildingType=null;
    resetCrowd();populateResidents();
    render();$('notice').textContent='已恢复存档。';
  }catch{$('notice').textContent='存档无效或无法写入。';}
  finally{event.target.value='';}
};
// ---- Butterfly effects, daily paper, fate book ----
function chime(notes,type='sine',gap=.09,volume=.045){
  if(!audio)return;
  notes.forEach((frequency,i)=>{
    const osc=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime+i*gap;
    osc.type=type;osc.frequency.value=frequency;
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,at+.5);
    osc.connect(gain).connect(audio.destination);osc.start(at);osc.stop(at+.55);
  });
}
const PULSE_TYPES=new Set(['bond','couple','crush','meteor','stargaze','lecture','proof','kind-turn','umbrella','snowman','rumor']);
function collectPulses(){
  if(world.sequence<=pulseSeq)return;
  const fresh=world.events.filter(e=>e.id>pulseSeq);pulseSeq=world.sequence;
  const root=watched!=null?TownRipples.rootOf(world,watched)?.id:null;
  let added=false;
  for(const e of fresh){
    if(!e.ids?.length)continue;
    const mine=e.parent!=null&&root!=null&&TownRipples.rootOf(world,e.id)?.id===root;
    if(!mine&&!PULSE_TYPES.has(e.type))continue;
    pulses.push({ids:e.ids.slice(0,6),born:performance.now(),tone:TownRipples.toneOf(e)});added=true;
  }
  pulses=pulses.slice(-8);
  if(added){chime([392,523],'sine',.12,.03);manualUntil=Math.max(manualUntil,performance.now()+2700);refreshMotion();}
}
function drawPulses(){
  const now=performance.now();
  pulses=pulses.filter(pulse=>now-pulse.born<2600);
  if(!pulses.length)return;
  ctx.save();
  for(const pulse of pulses){
    const k=(now-pulse.born)/2600;
    for(const id of pulse.ids){
      const pin=visiblePins.find(walker=>walker.resident.id===id);
      if(!pin||(pin.indoors&&!interiors))continue;
      for(const lag of [0,.28]){
        const t=k-lag;if(t<0||t>1)continue;
        ctx.beginPath();ctx.arc(pin.x,pin.y-4,7+t*30,0,Math.PI*2);
        ctx.strokeStyle=pulse.tone<0?`rgba(176,74,62,${(1-t)*.85})`:`rgba(246,196,84,${(1-t)*.95})`;
        ctx.lineWidth=3*(1-t)+.6;ctx.stroke();
      }
    }
  }
  ctx.restore();
}
function renderExtras(){
  const aw=Math.round(world.skeptic?.awareness??0);
  $('awarenessBar').style.width=`${aw}%`;$('awarenessText').textContent=`${aw}%`;
  $('awareness').dataset.level=aw>=60?'high':aw>=30?'mid':'low';
  renderQuests();
  collectPulses();
  const latest=world.papers?.at(-1);
  $('paperDot').hidden=!latest||latest.read;
  if(latest&&!latest.read&&latest.day!==skippedPaperDay&&autoPaper&&!modalOpen()&&!document.hidden)openPaper();
  if($('toast').hidden)drainFresh();
  if($('fate').open)renderFate();
  if($('thread').open)renderThread();
}
function renderQuests(){
  const g=TownGoals.state(world),button=$('quests');
  const quests=g.quests.map(q=>`${q.done?'✓':'○'} ${q.text}`);
  button.replaceChildren(storyNode('strong','命运委托'),storyNode('span',quests.join('　')||'今天没有委托'),
    storyNode('small',`${TownGoals.rank(world).title} ›`));
}
function showToast(title,text,action){
  const toast=$('toast');
  toast.replaceChildren(storyNode('strong',title),storyNode('span',text));
  toast.onclick=action??null;toast.hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{toast.hidden=true;drainFresh();},3800);
}
function drainFresh(){
  const g=world.goals;
  if(!g?.fresh.length)return;
  const item=g.fresh.shift();
  if(item.type==='achievement'){
    const a=TownGoals.ACHIEVEMENTS.find(entry=>entry.key===item.key);
    if(a){showToast(a.rare?`★ 稀有成就 · ${a.name}`:`成就解锁 · ${a.name}`,a.text,()=>openFate('badges'));chime([523,659,784,1046],'triangle',.08,.05);$('fateDot').hidden=false;}
  }else{
    showToast('委托完成',`${item.text} · 明天多 1 次干预`,()=>openFate('quests'));chime([659,880],'triangle');
  }
  save();
}
function openPaper(index){
  const papers=world.papers??[];
  paperIndex=index??papers.length-1;
  if(papers[paperIndex])papers[paperIndex].read=true;
  renderPaper();$('paper').showModal();
  if(audio)chime([220,330],'square',.05,.012);
  save();scheduleNext();refreshMotion();
}
function renderPaper(){
  const panel=$('paperPanel'),papers=world.papers??[],p=papers[paperIndex];
  $('paperDot').hidden=papers.every(entry=>entry.read);
  if(!p){
    panel.replaceChildren(storyNode('p','第一份日报会在今天午夜印好。拨动几次命运，明天看看报上写了什么。','story-meta'));
    return;
  }
  const mast=storyNode('header','','paper-mast');
  mast.append(storyNode('h3','微光镇日报'),storyNode('p',`第 ${p.day+1} 天 · ${p.weekday} · ${p.weather}${p.power?' · 夜里停过电':''}`));
  const nodes=[mast];
  if(p.special)nodes.push(storyNode('p',p.special,'paper-special'));
  const lead=storyNode('article','','paper-lead');
  lead.append(storyNode('h4',p.headline.title),storyNode('p',p.headline.text));
  if(p.headline.chain&&world.events.some(e=>e.id===p.headline.chain))
    lead.append(storyButton('看这条因果链 ›',()=>{$('paper').close();openThread(p.headline.chain);},'paper-link'));
  nodes.push(lead);
  const grid=storyNode('div','','paper-grid');
  for(const section of p.sections){
    const box=storyNode('section','','paper-col');
    box.append(storyNode('h5',section.label));
    for(const line of section.text.split('\n'))box.append(storyNode('p',line));
    grid.append(box);
  }
  nodes.push(grid,storyNode('p',`今日天气：${p.weather}`,'story-meta'));
  const actions=storyNode('div','','story-actions paper-actions');
  const prev=storyButton('‹ 前一天',()=>{paperIndex--;renderPaper();});prev.disabled=paperIndex<=0;
  const next=storyButton('后一天 ›',()=>{paperIndex++;renderPaper();});next.disabled=paperIndex>=papers.length-1;
  const card=storyButton('保存为纪念卡',()=>TownCards.download(TownCards.paper(p),`微光镇日报-第${p.day+1}天.png`),'story-primary');
  const label=document.createElement('label'),box=document.createElement('input');
  box.type='checkbox';box.checked=autoPaper;
  box.onchange=()=>{autoPaper=box.checked;localStorage.setItem(KEY+':paper',autoPaper?'on':'off');};
  label.className='paper-auto';label.append(box,document.createTextNode(' 每天结束时自动弹出'));
  actions.append(prev,next,card,label);
  nodes.push(actions);
  panel.replaceChildren(...nodes);
}
function openFate(tab){
  if(tab)fateTab=tab;
  $('fateDot').hidden=true;$('toast').hidden=true;
  renderFate();$('fate').showModal();scheduleNext();refreshMotion();
}
for(const button of document.querySelectorAll('.fate-tabs button'))button.onclick=()=>{fateTab=button.dataset.tab;renderFate();button.focus();};
function renderFate(){
  for(const button of document.querySelectorAll('.fate-tabs button'))button.setAttribute('aria-selected',String(button.dataset.tab===fateTab));
  const panel=$('fatePanel'),g=TownGoals.state(world),nodes=[];
  if(fateTab==='quests'){
    const {title,completed,next}=TownGoals.rank(world);
    nodes.push(storyNode('p',`${title} · 已完成 ${completed} 件委托${next?` · 再完成 ${next.need-completed} 件成为「${next.name}」`:''}`,'fate-rank'));
    for(const quest of g.quests){
      const card=storyNode('div','',`quest-card${quest.done?' done':''}`);
      card.append(storyNode('strong',`${quest.done?'✓':'○'} ${quest.text}`),storyNode('small',quest.hint),
        storyNode('span',quest.done?'已完成 · 明天多 1 次干预':quest.kind==='quiet'?'今晚结算':'进行中','quest-status'));
      nodes.push(card);
    }
    nodes.push(storyNode('p','每完成一件委托，第二天多 1 次干预（最多多 2 次）。委托只看小镇里真实发生的事。','story-meta'));
    if(g.last&&(g.last.done.length||g.last.missed.length)){
      const missed=g.last.missed.map(q=>typeof q==='string'?{text:q,hint:null}:q);
      nodes.push(storyNode('p',`昨天：完成 ${g.last.done.length} 件${missed.length?`，没完成「${missed.map(q=>q.text).join('」「')}」`:''}。`,'story-meta'));
      for(const q of missed)if(q.hint)nodes.push(storyNode('p',`「${q.text}」没完成——下次可以试试：${q.hint}`,'story-meta'));
    }
  }else if(fateTab==='badges'){
    const got=TownGoals.ACHIEVEMENTS.filter(a=>g.achievements[a.key]!=null).length;
    nodes.push(storyNode('p',`已收集 ${got} / ${TownGoals.ACHIEVEMENTS.length} 张纪念卡。带 ★ 的是稀有卡，只在小概率的事里出现。`,'fate-rank'));
    const grid=storyNode('div','','badge-grid');
    for(const a of TownGoals.ACHIEVEMENTS){
      const unlocked=g.achievements[a.key]!=null;
      const item=storyNode('div','',`badge${unlocked?'':' locked'}${a.rare?' rare':''}`);
      const icon=document.createElement('canvas');icon.width=48;icon.height=48;icon.setAttribute('aria-hidden','true');
      TownCards.pixelIcon(icon.getContext('2d'),4,4,40,unlocked?a.color:'#b9b19c',unlocked?a.icon:'?');
      item.append(icon,storyNode('strong',unlocked||!a.rare?`${a.rare?'★ ':''}${a.name}`:'★ ？？？'),
        storyNode('small',unlocked?`${a.text} · 第 ${g.achievements[a.key]+1} 天`:a.rare?'稀有成就，还没遇见过。':a.text));
      if(unlocked)item.append(storyButton('纪念卡',()=>TownCards.download(TownCards.badge(a,g.achievements[a.key],`${TownGoals.rank(world).title} 在微光镇收集。`),`纪念卡-${a.name}.png`)));
      grid.append(item);
    }
    nodes.push(grid);
  }else if(fateTab==='newton'){
    const s=world.skeptic??{stage:0,notes:[],awareness:0,believers:[],laughers:[]};
    nodes.push(storyNode('p',`Newton · ${TownSkeptic.STAGES[s.stage]} · 小镇察觉度 ${Math.round(s.awareness)}%`,'fate-rank'));
    nodes.push(storyNode('p','Newton 只会记下他能看见、或从熟人那里听说的事。干预越多、越在人前，他越容易发现。察觉度每天回落一些。','story-meta'));
    if(s.experiment&&!s.experiment.result)nodes.push(storyNode('p',`他打算 ${when(s.experiment.at)} 在广场做实验。那时候如果有人“恰好”捡到硬币……`,'story-result'));
    if(s.talk&&!s.talk.done)nodes.push(storyNode('p',`他会在 ${when(s.talk.at)} 去广场演讲。`,'story-result'));
    const names=ids=>ids.map(id=>world.people.find(p=>p.id===id)?.name).filter(Boolean).join('、');
    if(s.believers.length)nodes.push(storyNode('p',`相信他的人：${names(s.believers)}`,'story-meta'));
    if(s.laughers.length)nodes.push(storyNode('p',`笑他的人：${names(s.laughers)}`,'story-meta'));
    const list=storyNode('ol','','newton-notes');
    for(const note of s.notes.slice(-12).reverse())list.append(storyNode('li',`第 ${note.day+1} 天 · ${note.text}`));
    if(!s.notes.length)list.append(storyNode('li','笔记本还是空的。Newton 是镇上最爱较真的人，别在他面前频繁出手。'));
    nodes.push(list);
  }else{
    nodes.push(storyNode('p','每天第一次存档时会留一份快照。回到那天以后，世界会照原样重演，除非你拨动不同的骰子。','story-meta'));
    const snaps=SaveManager.snapshots(localStorage,KEY).sort((a,b)=>b.tick-a.tick);
    const list=storyNode('div','','rewind-list');
    for(const snap of snaps){
      const row=storyNode('div','','rewind-row');
      row.append(storyNode('span',`${when(snap.tick)}${snap.day===Math.floor(world.tick/48)?' · 今天':''}`),
        storyButton('回到这里',()=>rewind(snap)));
      list.append(row);
    }
    if(!snaps.length)list.append(storyNode('p','还没有快照。'));
    nodes.push(list);
  }
  panel.replaceChildren(...nodes);
}
function rewind(snap){
  if(!confirm(`回到${when(snap.tick)}？在那之后发生的事都会被改写。`))return;
  const data=SaveManager.restore(localStorage,KEY,snap.index,Town.valid,Town.migrate);
  if(!data){showToast('时光回溯','这份快照读不出来了。');return;}
  Town.upgrade(data);
  world=data;watched=Number.isInteger(data.watchedEvent)?data.watchedEvent:null;
  seenStory=world.sequence;pulseSeq=world.sequence;pulses=[];choosingPlace=false;buildingType=null;
  resetCrowd();populateResidents();save();$('fate').close();render();
  showToast('时光回溯',`回到了${when(world.tick)}。世界会照原样重演，除非你换一种拨法。`);
}
function openThread(rootId){
  const current=watched!=null?TownRipples.rootOf(world,watched)?.id:null;
  threadRoot=rootId??current??world.events.findLast(e=>e.parent==null&&TownRipples.PLAYER.has(e.type))?.id??null;
  renderThread();$('thread').showModal();scheduleNext();refreshMotion();
}
function threadNode(node){
  const tone=Math.sign(TownRipples.toneOf(node.event));
  const item=storyNode('li','',`tone-${tone<0?'bad':tone>0?'good':'flat'}`);
  const row=storyNode('div','','thread-row');
  row.append(storyNode('time',when(node.event.tick)),storyNode('span',node.event.text));
  item.append(row);
  if(node.children.length){
    const list=document.createElement('ul');
    for(const child of node.children)list.append(threadNode(child));
    item.append(list);
  }
  return item;
}
function renderThread(){
  const panel=$('threadPanel'),nodes=[];
  const roots=world.events.filter(e=>e.parent==null&&TownRipples.PLAYER.has(e.type)).slice(-8).reverse();
  if(roots.length){
    const picker=storyNode('div','','thread-roots');
    for(const root of roots){
      const sum=TownRipples.summary(world,root.id);
      const button=storyButton(`${root.text.length>16?root.text.slice(0,16)+'…':root.text} · ${sum.people.length} 人`,()=>{threadRoot=root.id;renderThread();});
      button.setAttribute('aria-pressed',String(root.id===threadRoot));
      picker.append(button);
    }
    nodes.push(picker);
  }
  const tree=threadRoot!=null?TownRipples.tree(world,threadRoot):null;
  if(!tree){
    nodes.push(storyNode('p','还没有可追踪的命运之线。选一位居民，拨动一次命运吧。','story-meta'));
    panel.replaceChildren(...nodes);return;
  }
  const sum=TownRipples.summary(world,threadRoot);
  nodes.push(storyNode('p',`牵动 ${sum.people.length} 位居民 · 后续 ${sum.count} 件 · 最远传了 ${sum.depth} 层${sum.positive||sum.negative?` · 好事 ${sum.positive} / 坏事 ${sum.negative}`:''}`,'thread-summary'));
  const list=storyNode('ul','','thread-tree');list.append(threadNode(tree));nodes.push(list);
  const brewing=TownRipples.pendingFor(world,threadRoot)||world.pending.some(e=>e.parent!=null&&TownRipples.rootOf(world,e.parent)?.id===threadRoot);
  if(brewing)nodes.push(storyNode('p','还有后续在酝酿。居民们得先在某个地方碰上面，事情才会往下走。','story-meta'));
  panel.replaceChildren(...nodes);
}
$('openPaper').onclick=()=>openPaper();
$('closePaper').onclick=()=>$('paper').close();
$('openFate').onclick=()=>openFate();
$('closeFate').onclick=()=>$('fate').close();
$('quests').onclick=()=>openFate('quests');
$('closeThread').onclick=()=>$('thread').close();
window.addEventListener('resize',paint);
document.addEventListener('visibilitychange',()=>{scheduleNext();refreshMotion();});
motion.addEventListener('change',()=>{if(motion.matches){resetCrowd();paint();}refreshMotion();});
window.addEventListener('pagehide',save);
save();render();
setRunning(true);
