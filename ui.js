'use strict';
const $=id=>document.getElementById(id);
const KEY='god-dice-v1';
const canvas=$('map'),ctx=canvas.getContext('2d');
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let world=SaveManager.load(localStorage,KEY,Town.valid);
const isNew=!world;
if(isNew){
  world=Town.create();
  while(world.tick<17)Town.step(world);
}
let timer=null,audio=null,running=false,fast=false,choosingPlace=false,frame=null;
let lastFrame=null,manualUntil=0;
let draftPlan=0,draftHelper=null,shownOffer=-1;
let interiors=localStorage.getItem(KEY+':interiors')!=='off';
let crowd=TownMovement.create(world),mapPins=crowd.pins();
let seenStory=world.sequence;
let watched=Number.isInteger(world.watchedEvent)?world.watchedEvent:null;
const save=()=>SaveManager.save(localStorage,KEY,{...world,watchedEvent:watched,savedAt:Date.now()},Town.valid);
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

function paint(){
  const p=selected();
  const pin=mapPins.find(walker=>walker.resident.id===p.id);
  const place=p.place==='homes'?'家':Town.places[p.place].name;
  const label=TownRoutines.labels[Town.activity(world,p)];
  const activity=pin?.place!==p.place?`去${place}的路上`:p.place==='homes'&&label.startsWith('在家')?label:`${place} · ${label}`;
  const bio=`${activity} · 心情 ${p.mood} · ${p.money} 元${p.questioned?' · 察觉异常':''}`;
  if($('bio').textContent!==bio)$('bio').textContent=bio;
  TownMap.draw(ctx,world,p.id,canvas.clientWidth,mapPins,choosingPlace,interiors);
}
function resetCrowd(){
  crowd=TownMovement.create(world);
  mapPins=crowd.pins();
}
function refreshMotion(){
  const active=!motion.matches&&!document.hidden&&!modalOpen()&&(running||performance.now()<manualUntil);
  if(active&&frame===null)frame=requestAnimationFrame(animate);
  if(!active&&frame!==null){cancelAnimationFrame(frame);frame=null;lastFrame=null;}
}
function animate(now){
  frame=null;
  if(lastFrame!==null){
    crowd.advance(Math.min(.05,(now-lastFrame)/1000)*(fast?3:1),running);
    mapPins=crowd.pins();
    paint();
  }
  lastFrame=now;
  refreshMotion();
  if(frame===null)lastFrame=null;
}
canvas.addEventListener('click',event=>{
  const bounds=canvas.getBoundingClientRect();
  const x=(event.clientX-bounds.left)*canvas.width/bounds.width;
  const y=(event.clientY-bounds.top)*canvas.height/bounds.height;
  if(choosingPlace){
    const place=TownMap.findPlace(x,y);
    if(place)intervene('visit',place);
    return;
  }
  const closest=mapPins.reduce((best,pin)=>{
    if(pin.indoors&&!interiors)return best;
    const distance=Math.hypot(x-pin.x,y-pin.y+4);
    return distance<best.distance?{pin,distance}:best;
  },{pin:null,distance:Math.max(27,canvas.width/bounds.width*15)});
  if(closest.pin){$('person').value=closest.pin.resident.id;render();}
});
function when(tick){return `第 ${Math.floor(tick/48)+1} 天 ${String(Math.floor(tick%48/2)).padStart(2,'0')}:${tick%2?'30':'00'}`;}
const modalOpen=()=>$('journal').open||$('stories').open;
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
function renderBoard(){
  const active=TownStories.active(world),offer=TownStories.offer(world);
  const marker=$('storyMarker');
  marker.hidden=!active;
  $('storyButtonTitle').textContent=active?TownStories.planFor(active).name:offer.title;
  $('storyButtonDetail').textContent=active?`${when(active.time)} · ${Town.places[TownStories.planFor(active).place].name}`:
    `镇务告示 · 收藏 ${world.keepsakes?.length??0} / 6`;
  if(active){
    const {left,top}=TownMap.marker(TownStories.planFor(active).place);
    marker.style.left=`${left}%`;marker.style.top=`${top}%`;
  }
}
function renderStories(){
  const panel=$('storyPanel'),active=TownStories.active(world),offer=TownStories.offer(world);
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
      if(shownOffer!==today){shownOffer=today;draftPlan=0;draftHelper=null;}
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
      const deadline=(today+1)*48+35;
      const venue=TownStories.planFor(proposal).place;
      const candidates=world.people.filter(p=>p.id!==offer.host).map(p=>({p,
        willing:TownStories.eligible(world,proposal,p),there:Town.forecast(world,p,deadline)===venue}));
      candidates.sort((a,b)=>Number(b.willing)*2+Number(b.there)-Number(a.willing)*2-Number(a.there));
      const label=storyNode('label','选择搭档');label.htmlFor='storyHelper';
      const select=document.createElement('select');select.id='storyHelper';
      for(const {p,willing,there} of candidates)option(select,p.id,`${p.name} · ${willing?'愿意搭手':'暂时不愿意'}${there?' · 日程会经过':''}`);
      if(draftHelper!==null)select.value=draftHelper;
      select.onchange=()=>{draftHelper=Number(select.value);};
      const start=storyButton('开始筹备',()=>{
        if(Town.startStory(world,draftPlan,Number(select.value))){save();render();$('storyPanel').querySelector('h3').focus();}
      },'story-primary');
      const actions=storyNode('div','','story-actions');actions.append(label,select,start);
      panel.append(storyNode('p',`${when(deadline)} · ${Town.places[venue].name}`,'story-meta'),actions);
    }
  }
  const collection=(world.keepsakes??[]).map(key=>TownStories.stories[Math.floor(key/2)].plans[key%2].keepsake);
  panel.append(storyNode('p',collection.length?`小镇收藏 ${collection.length} / 6 · ${collection.join('、')}`:'小镇收藏 0 / 6','story-collection'));
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
  const result=world.events.findLast(e=>e.parent===root.id&&e.type!=='suspicion');
  const pending=world.pending.some(e=>e.parent===root.id);
  const badge=document.createElement('strong');
  badge.textContent=pending?'追踪中':result?'后续':'已发生';
  text.append(badge,document.createTextNode(result?.text??root.text));
}
function render(){
  const p=selected(),night=world.tick%48<12||world.tick%48>=40;
  $('clock').textContent=when(world.tick);
  $('skyIcon').textContent=world.power?'✦':world.weather==='小雪'?'❄':world.weather==='细雨'?'☂':night?'☾':'☀';
  $('skyIcon').title=world.power?'停电':world.weather;
  $('tokens').textContent=`今天还有 ${world.tokens} 次`;
  TownMap.portrait($('portrait'),p);
  document.querySelectorAll('[data-kind]').forEach(button=>button.disabled=world.tokens<=0||(button.dataset.kind==='delay'&&!Town.canDelay(world,p)));
  if(world.tokens<=0)choosingPlace=false;
  $('redirect').disabled=world.tokens<=0;
  $('redirect').setAttribute('aria-expanded',String(choosingPlace));
  $('destinations').hidden=!choosingPlace;
  $('mapHint').textContent=choosingPlace?`给 ${p.name} 点一个目的地`:'点击地图上的居民';
  const latest=world.events.findLast(e=>e.type!=='town');
  $('mapStory').hidden=!latest;
  $('mapStoryText').textContent=latest?.text||'';
  $('unread').hidden=!latest||latest.id<=seenStory;
  renderBoard();
  if($('stories').open)renderStories();
  if($('journal').open)renderJournal();
  renderFollow();
  paint();
}
function advance(){
  Town.step(world);
  if(motion.matches)resetCrowd();
  save();render();
}
function scheduleNext(delay=fast?1200:3600){
  clearTimeout(timer);
  if(running&&!document.hidden&&!modalOpen())timer=setTimeout(()=>{advance();scheduleNext();},delay);
}
function setRunning(next){
  running=next;
  manualUntil=0;
  $('auto').textContent=running?'Ⅱ':'▶';
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
$('step').onclick=()=>{advance();manualUntil=performance.now()+5500;scheduleNext();refreshMotion();};
$('auto').onclick=()=>setRunning(!running);
$('speed').onclick=()=>{fast=!fast;$('speed').textContent=fast?'3×':'1×';scheduleNext();};
function showHomeMode(){
  $('homeView').setAttribute('aria-pressed',String(interiors));
  $('homeView').textContent=interiors?'屋内':'外观';
  $('homeView').setAttribute('aria-label',interiors?'屋内视图':'住宅外观');
}
$('homeView').onclick=()=>{
  interiors=!interiors;
  localStorage.setItem(KEY+':interiors',interiors?'on':'off');
  showHomeMode();paint();
};
showHomeMode();
$('person').onchange=render;
$('redirect').onclick=()=>{choosingPlace=!choosingPlace;render();};
$('openJournal').onclick=$('mapStory').onclick=openJournal;
$('closeJournal').onclick=()=>$('journal').close();
function openStories(){
  renderStories();$('stories').showModal();scheduleNext();refreshMotion();
}
$('openStories').onclick=$('storyMarker').onclick=openStories;
$('closeStories').onclick=()=>$('stories').close();
for(const id of ['journal','stories'])$(id).addEventListener('close',()=>{scheduleNext();refreshMotion();});
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
    const data=JSON.parse(await file.text());
    if(!Town.valid(data))throw new Error();
    const newWatch=Number.isInteger(data.watchedEvent)?data.watchedEvent:null;
    if(!SaveManager.save(localStorage,KEY,{...data,savedAt:Date.now()},Town.valid))throw new Error();
    world=data;watched=newWatch;seenStory=world.sequence;choosingPlace=false;
    resetCrowd();populateResidents();
    render();$('notice').textContent='已恢复存档。';
  }catch{$('notice').textContent='存档无效或无法写入。';}
  finally{event.target.value='';}
};
window.addEventListener('resize',paint);
document.addEventListener('visibilitychange',()=>{scheduleNext();refreshMotion();});
motion.addEventListener('change',()=>{if(motion.matches){resetCrowd();paint();}refreshMotion();});
window.addEventListener('pagehide',save);
save();render();
setRunning(true);
