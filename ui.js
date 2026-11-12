'use strict';
const $=id=>document.getElementById(id);
const KEY='god-dice-v1';
let world=SaveManager.load(localStorage,KEY,Town.valid)||Town.create();
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
function paint(){
  const night=world.tick%48<13||world.tick%48>=38;
  ctx.fillStyle=night?'#253837':'#789267';ctx.fillRect(0,0,480,270);
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  for(let i=0;i<14;i++){rect(8+i*34,0,16,270,night?'#2b403a':'#82996d');}
  rect(0,112,480,24,night?'#4e5147':'#c6b692');rect(220,55,24,158,night?'#4e5147':'#c6b692');
  for(let i=0;i<480;i+=12)rect(i,239+Math.floor(Math.sin(i/44)*9),12,17,night?'#395d69':'#6fa9bc');
  for(let i=0;i<23;i++){
    const x=16+(i*71)%136,y=157+(i*37)%67;
    rect(x+5,y+10,3,7,'#6b4938');rect(x,y,13,12,night?'#436b50':'#446a45');
  }
  for(const [id,place] of Object.entries(Town.places)){
    const {x,y}=place;
    if(id==='square'){rect(x-26,y-20,52,42,night?'#646158':'#dac7a0');rect(x-7,y-10,14,14,'#699aa8');}
    else if(id!=='forest'){
      rect(x-21,y-27,42,34,'#cab48f');rect(x-25,y-34,50,12,id==='station'?'#68778a':'#985a4b');
      rect(x-5,y-6,10,13,'#503b35');rect(x-15,y-16,7,6,world.power?'#473f38':'#f8d785');
    }
    ctx.fillStyle=night?'#fff4d8':'#25271f';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText(place.name,x,y+32);
  }
  const seen={};
  for(const p of world.people){
    const {x,y}=Town.places[p.place],i=seen[p.place]=(seen[p.place]||0)+1;
    const xx=x-21+((i-1)%7)*7,yy=y+11+Math.floor((i-1)/7)*7;
    if(p.id===Number($('person').value))rect(xx-2,yy-3,9,11,'#ffd987');
    rect(xx+1,yy-2,3,3,'#efbe99');rect(xx,yy+1,5,5,['#853e49','#456c8a','#5a7d4a','#986b42'][p.id%4]);
    if(world.power&&p.place==='square')rect(xx+5,yy+1,2,2,'#ffe6a2');
  }
  if(world.weather!=='晴朗')for(let i=0;i<55;i++){
    const x=(i*137+world.tick*9)%480,y=(i*97+world.tick*11)%270;
    rect(x,y,world.weather==='小雪'?2:1,world.weather==='小雪'?2:5,'#d5e7eb99');
  }
}
function when(tick){return `第 ${Math.floor(tick/48)+1} 天 ${String(Math.floor(tick%48/2)).padStart(2,'0')}:${tick%2?'30':'00'}`;}
function render(){
  $('clock').textContent=`${when(world.tick)} · ${world.weather}${world.power?' · 停电':''}`;
  $('tokens').textContent=`今日可拨动 ${world.tokens} 次`;
  const p=world.people.find(person=>person.id===Number($('person').value))||world.people[0];
  $('bio').textContent=`${Town.places[p.place].name} · 心情 ${p.mood} · ${p.money} 元${p.questioned?' · 开始怀疑巧合':''}`;
  const list=$('events');list.replaceChildren();
  for(const e of world.events.slice(-14).reverse()){
    const row=document.createElement('li');row.textContent=e.text;
    const sub=document.createElement('small');
    const causes=[];let parent=e.parent;
    while(parent&&causes.length<5){const event=world.events.find(item=>item.id===parent);if(!event)break;causes.unshift(event.text);parent=event.parent;}
    sub.textContent=when(e.tick)+(causes.length?' · 起因：'+causes.join(' → '):'');row.append(sub);list.append(row);
  }
  $('memories').replaceChildren();
  for(const e of NPCMemory.recall(world,p.id).slice(0,8)){
    const item=document.createElement('li');item.textContent=e.interpretation;$('memories').append(item);
  }
  document.querySelectorAll('[data-kind]').forEach(button=>button.disabled=world.tokens<=0||(button.dataset.kind==='delay'&&(world.tick%48<14||world.tick%48>=18)));
  paint();
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
window.addEventListener('pagehide',save);
save();render();
