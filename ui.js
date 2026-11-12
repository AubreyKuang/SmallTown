'use strict';
const $=id=>document.getElementById(id);
const KEY='god-dice-v1';
let world=SaveManager.load(localStorage,KEY,Town.valid);
if(!world){
  world=Town.create();
  while(world.tick<18)Town.step(world);
}
let timer=null,audio=null;
const canvas=$('map'),ctx=canvas.getContext('2d');
const save=()=>SaveManager.save(localStorage,KEY,{...world,savedAt:Date.now()},Town.valid);
function option(select,value,label){const el=document.createElement('option');el.value=value;el.textContent=label;select.append(el);}
for(const p of world.people)option($('person'),p.id,p.name);
for(const [key,place] of Object.entries(Town.places))option($('place'),key,place.name);
$('place').value='cafe';
$('offline').checked=localStorage.getItem(KEY+':offline')==='yes';
$('offline').onchange=()=>localStorage.setItem(KEY+':offline',$('offline').checked?'yes':'no');
if($('offline').checked&&world.savedAt){
  const elapsed=Math.max(0,Math.min(48,Math.floor((Date.now()-world.savedAt)/600000)));
  for(let i=0;i<elapsed;i++)Town.step(world);
  if(elapsed)$('notice').textContent=`离线期间，小镇推进了 ${elapsed/2} 小时。`;
}
function beep(){
  if(!audio)return;
  const note=audio.createOscillator(),gain=audio.createGain();
  note.type='triangle';note.frequency.value=440;gain.gain.setValueAtTime(.05,audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.22);
  note.connect(gain).connect(audio.destination);note.start();note.stop(audio.currentTime+.23);
}
let mapPins=[];
canvas.addEventListener('click',event=>{
  const bounds=canvas.getBoundingClientRect();
  const x=(event.clientX-bounds.left)*canvas.width/bounds.width;
  const y=(event.clientY-bounds.top)*canvas.height/bounds.height;
  const closest=mapPins.reduce((best,pin)=>{
    const distance=Math.hypot(x-pin.x,y-pin.y+4);
    return distance<best.distance?{pin,distance}:best;
  },{pin:null,distance:42});
  if(closest.pin){$('person').value=closest.pin.resident.id;render();}
});
function when(tick){return `第 ${Math.floor(tick/48)+1} 天 ${String(Math.floor(tick%48/2)).padStart(2,'0')}:${tick%2?'30':'00'}`;}
function render(){
  $('clock').textContent=`${when(world.tick)} · ${world.weather}${world.power?' · 停电':''}`;
  $('tokens').textContent=`剩余 ${world.tokens} 次`;
  const p=world.people.find(person=>person.id===Number($('person').value))||world.people[0];
  $('portrait').textContent=p.name.slice(0,1);
  $('portrait').style.setProperty('--portrait',TownMap.color(p.id));
  $('bio').textContent=`${Town.places[p.place].name} · 心情 ${p.mood} · ${p.money} 元${p.questioned?' · 开始怀疑巧合':''}`;
  const list=$('events');list.replaceChildren();
  for(const e of world.events.slice(-14).reverse()){
    const row=document.createElement('li');row.textContent=e.text;
    const sub=document.createElement('small');
    const causes=[];let parent=e.parent;
    while(parent&&causes.length<5){const event=world.events.find(item=>item.id===parent);if(!event)break;causes.unshift(event.text);parent=event.parent;}
    sub.textContent=when(e.tick)+(causes.length?' · 起因：'+causes.join(' → '):'');row.append(sub);list.append(row);
  }
  if(!world.events.length){
    const row=document.createElement('li');row.textContent='小镇还很安静。推进时间，或拨动一位居民的命运。';list.append(row);
  }
  $('memories').replaceChildren();
  const memories=NPCMemory.recall(world,p.id).slice(0,8);
  if(!memories.length){
    const item=document.createElement('li');item.textContent='目前没有可回顾的经历。';$('memories').append(item);
  }
  for(const e of memories){
    const item=document.createElement('li');item.textContent=e.interpretation;$('memories').append(item);
  }
  document.querySelectorAll('[data-kind]').forEach(button=>button.disabled=world.tokens<=0||(button.dataset.kind==='delay'&&(world.tick%48<14||world.tick%48>=18)));
  mapPins=TownMap.draw(ctx,world,p.id,canvas.clientWidth);
}
function advance(){Town.step(world);save();render();}
$('step').onclick=advance;
$('auto').onclick=()=>{
  if(timer){clearInterval(timer);timer=null;}else timer=setInterval(advance,900);
  $('auto').setAttribute('aria-pressed',String(!!timer));$('auto').textContent=timer?'暂停':'自动推进';
};
$('person').onchange=render;
$('sound').onclick=async()=>{
  if(audio){await audio.close();audio=null;}else{audio=new AudioContext();await audio.resume();beep();}
  $('sound').setAttribute('aria-pressed',String(!!audio));$('sound').textContent=audio?'关闭音效':'开启音效';
};
for(const button of document.querySelectorAll('[data-kind]'))button.onclick=()=>{
  if(Town.influence(world,Number($('person').value),button.dataset.kind,$('place').value)){beep();save();render();}
};
$('export').onclick=()=>{
  const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(world,null,2)],{type:'application/json'}));
  link.download='god-dice-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
};
$('import').onchange=async event=>{
  try{
    const file=event.target.files[0];if(!file)return;
    const data=JSON.parse(await file.text());
    if(!Town.valid(data)||!SaveManager.save(localStorage,KEY,data,Town.valid))throw new Error();
    world=data;render();$('notice').textContent='已恢复存档。';
  }catch{$('notice').textContent='存档无效或无法写入。';}
  finally{event.target.value='';}
};
window.addEventListener('resize',()=>{mapPins=TownMap.draw(ctx,world,Number($('person').value),canvas.clientWidth);});
window.addEventListener('pagehide',save);
save();render();
