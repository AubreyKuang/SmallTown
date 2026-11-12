'use strict';
const $=id=>document.getElementById(id);
const KEY='god-dice-v1';
const canvas=$('map'),ctx=canvas.getContext('2d');
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let world=SaveManager.load(localStorage,KEY,Town.valid);
const isNew=!world;
if(isNew){
  world=Town.create();
  while(world.tick<15)Town.step(world);
}
let timer=null,audio=null,running=false,fast=false,choosingPlace=false,frame=null;
let lastFrame=null,manualUntil=0;
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
  const place=Town.places[p.place].name;
  const activity=pin?.place===p.place?place:`去${place}的路上`;
  const bio=`${activity} · 心情 ${p.mood} · ${p.money} 元${p.questioned?' · 察觉异常':''}`;
  if($('bio').textContent!==bio)$('bio').textContent=bio;
  TownMap.draw(ctx,world,p.id,canvas.clientWidth,mapPins,choosingPlace);
}
function resetCrowd(){
  crowd=TownMovement.create(world);
  mapPins=crowd.pins();
}
function refreshMotion(){
  const active=!motion.matches&&!document.hidden&&!$('journal').open&&(running||performance.now()<manualUntil);
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
    const distance=Math.hypot(x-pin.x,y-pin.y+4);
    return distance<best.distance?{pin,distance}:best;
  },{pin:null,distance:Math.max(27,canvas.width/bounds.width*15)});
  if(closest.pin){$('person').value=closest.pin.resident.id;render();}
});
function when(tick){return `第 ${Math.floor(tick/48)+1} 天 ${String(Math.floor(tick%48/2)).padStart(2,'0')}:${tick%2?'30':'00'}`;}
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
  document.querySelectorAll('[data-kind]').forEach(button=>button.disabled=world.tokens<=0||(button.dataset.kind==='delay'&&(world.tick%48<14||world.tick%48>=18)));
  if(world.tokens<=0)choosingPlace=false;
  $('redirect').disabled=world.tokens<=0;
  $('redirect').setAttribute('aria-expanded',String(choosingPlace));
  $('destinations').hidden=!choosingPlace;
  $('mapHint').textContent=choosingPlace?`给 ${p.name} 点一个目的地`:'点击地图上的居民';
  const latest=world.events.findLast(e=>e.type!=='town');
  $('mapStory').hidden=!latest;
  $('mapStoryText').textContent=latest?.text||'';
  $('unread').hidden=!latest||latest.id<=seenStory;
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
  if(running&&!document.hidden&&!$('journal').open)timer=setTimeout(()=>{advance();scheduleNext();},delay);
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
$('person').onchange=render;
$('redirect').onclick=()=>{choosingPlace=!choosingPlace;render();};
$('openJournal').onclick=$('mapStory').onclick=openJournal;
$('closeJournal').onclick=()=>$('journal').close();
$('journal').addEventListener('close',()=>{scheduleNext();refreshMotion();});
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
