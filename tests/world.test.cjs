const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const source=['npc-memory.js','save-manager.js','town-stories.js','world.js','town-map.js','town-movement.js'].map(name=>readFileSync(require('node:path').join(__dirname,'..',name),'utf8')).join('\n');
const {Town,SaveManager,NPCMemory,TownMap,TownMovement,TownStories}=vm.runInNewContext(source+'\n({Town,SaveManager,NPCMemory,TownMap,TownMovement,TownStories})');
function to(w,t){while(w.tick<t)Town.step(w);}
function visualRandom(seed){
  return ()=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
}
test('redirect only meets residents who were scheduled at the destination',()=>{
  const w=Town.create(8);to(w,34);
  assert.equal(Town.influence(w,3,'visit','cafe'),true);Town.step(w);
  const event=w.events.find(e=>e.type==='meeting');
  assert.ok(event);assert.equal(w.events.find(e=>e.id===event.parent).type,'visit');
  assert.ok(event.ids.includes(3));
  assert.equal(w.people.find(p=>p.id===event.ids[1]).habit,'cafe');
  assert.equal(NPCMemory.recall(w,3).length,1);
  const empty=Town.create(7);assert.ok(Town.influence(empty,3,'visit','cafe'));to(empty,5);
  assert.equal(empty.events.some(e=>e.type==='meeting'),false);
  const quiet=empty.events.find(e=>e.type==='quiet');
  assert.equal(quiet?.parent,empty.events.find(e=>e.type==='visit').id);
});
test('staggered commuters animate along the street after their destination changes',()=>{
  const w=Town.create(8);to(w,15);
  const crowd=TownMovement.create(w,visualRandom(12));
  const from=crowd.pins().find(pin=>pin.resident.id===1);
  Town.step(w);
  assert.equal(from.place,'homes');
  assert.equal(w.people.find(p=>p.id===1).place,'station');
  assert.equal(w.people.find(p=>p.id===2).place,'homes');
  crowd.advance(.5);
  const mid=crowd.pins().find(pin=>pin.resident.id===1);
  assert.equal(mid.place,'homes');
  assert.notEqual(mid.x,from.x);
  for(let i=0;i<80;i++)crowd.advance(.05,false);
  const target=crowd.pins().find(pin=>pin.resident.id===1);
  assert.equal(target.place,'station');
  const points=TownMap.route(from,target);
  assert.ok(points.length>2);
  const path=TownMap.plan(points);
  assert.notDeepEqual(TownMap.position(path,.5),points[0]);
  assert.notDeepEqual(TownMap.position(path,.5),points.at(-1));
  assert.deepEqual(TownMap.position(path,1),points.at(-1));
});
test('residents roam at different times and have distinct stops without advancing the world',()=>{
  const w=Town.create(8);
  const snapshot=JSON.stringify(w);
  const crowd=TownMovement.create(w,visualRandom(3));
  const before=new Map(crowd.pins().map(pin=>[pin.resident.id,pin]));
  assert.equal(new Set(crowd.pins().map(pin=>`${pin.x},${pin.y}`)).size,24);
  for(let i=0;i<14;i++)crowd.advance(.05);
  const moved=crowd.pins().filter(pin=>pin.x!==before.get(pin.resident.id).x||pin.y!==before.get(pin.resident.id).y);
  assert.ok(moved.length>0&&moved.length<24);
  for(let i=0;i<100;i++)crowd.advance(.05);
  assert.ok(crowd.pins().some(pin=>pin.x!==before.get(pin.resident.id).x||pin.y!==before.get(pin.resident.id).y));
  assert.equal(JSON.stringify(w),snapshot);
});
test('a blackout draws a few volunteers and keeps other districts active',()=>{
  const w=Town.create(9);to(w,37);w.power=true;
  for(let tick=38;tick<=42;tick++){
    Town.step(w);
    const places=w.people.map(p=>p.place);
    assert.ok(places.filter(place=>place==='square').length<=12);
    assert.ok(new Set(places).size>=3);
  }
});
test('residents share a location for unprompted conversations and remember their own perspective',()=>{
  const w=Town.create(8);to(w,25);
  const chat=w.events.find(event=>event.type==='chat');
  assert.ok(chat);
  const [a,b]=chat.ids.map(id=>w.people.find(p=>p.id===id));
  assert.equal(a.place,b.place);
  assert.match(NPCMemory.recall(w,a.id)[0].interpretation,new RegExp(b.name));
  assert.match(NPCMemory.recall(w,b.id)[0].interpretation,new RegExp(a.name));
  assert.ok(w.people.filter(p=>!chat.ids.includes(p.id)).every(p=>NPCMemory.recall(w,p.id).length===0));
});
test('missing a bus delays arrival relative to the resident’s own shift',()=>{
  const w=Town.create(8);to(w,15);
  const bob=w.people.find(p=>p.id===2);
  assert.ok(Town.influence(w,bob.id,'delay'));
  to(w,20);
  assert.equal(bob.place,'station');
  assert.equal(w.events.some(event=>event.type==='late'),false);
  Town.step(w);
  assert.equal(bob.place,bob.job);
  assert.match(w.events.find(event=>event.type==='late').text,/30 分钟/);
});
test('lottery can produce loan conflict, and repeated anomalies raise suspicion',()=>{
  const w=Town.create(9);to(w,34);
  assert.ok(Town.influence(w,2,'lottery'));to(w,39);
  const loan=w.events.find(e=>e.type==='loan');
  assert.ok(loan);assert.match(loan.text,/碰了壁/);
  assert.ok(NPCMemory.influence(w,loan.ids[1],loan.ids[0])<0);
  assert.ok(Town.influence(w,3,'coin'));assert.ok(Town.influence(w,3,'coin'));
  assert.ok(w.events.some(e=>e.type==='suspicion'));
  assert.equal(Town.influence(w,3,'coin'),false);
});
test('seeded town, pending consequences and clock resume identically from a snapshot',()=>{
  const w=Town.create(24);to(w,34);Town.influence(w,2,'lottery');
  const restored=JSON.parse(JSON.stringify(w));to(w,120);to(restored,120);
  assert.equal(JSON.stringify(restored),JSON.stringify(w));
  assert.equal(w.events.filter(e=>e.type==='loan').length,1);
  assert.equal(w.tokens,3);
});
test('save manager accepts legacy data, retains backup and rejects invalid data',()=>{
  const map=new Map(),storage={getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};
  map.set('town',JSON.stringify(Town.create(5)));
  assert.equal(SaveManager.load(storage,'town',Town.valid).seed,5);
  assert.ok(SaveManager.save(storage,'town',Town.create(9),Town.valid));
  assert.equal(SaveManager.save(storage,'town',{tick:'bad'},Town.valid),false);
  assert.equal(SaveManager.load(storage,'town',Town.valid).seed,9);
  map.set('town','{');
  assert.equal(SaveManager.load(storage,'town',Town.valid).seed,5);
});
test('inviting a suitable helper spends one die and the project resumes from a snapshot',()=>{
  const w=Town.create(18);to(w,15);
  assert.equal(Town.startStory(w,0,4),false);
  assert.ok(Town.startStory(w,0,1));
  assert.equal(Town.startStory(w,1,1),false);
  assert.ok(Town.inviteStory(w));
  assert.equal(w.tokens,2);
  assert.equal(Town.inviteStory(w),false);
  const restored=JSON.parse(JSON.stringify(w));
  assert.ok(Town.valid(restored));
  to(w,85);to(restored,85);
  assert.equal(JSON.stringify(w),JSON.stringify(restored));
  assert.equal(w.townStory.result,'done');
  assert.equal(w.keepsakes.join(','),'0');
  assert.equal(w.events.filter(e=>e.type==='story-done').length,1);
  assert.ok(NPCMemory.recall(w,1).some(m=>m.interpretation.includes('面包长桌')));
  assert.ok(w.people.find(p=>p.id===4).trust[1]>0);
});
test('attendance and relationships affect outcomes, and a timely redirect completes the other plan',()=>{
  const missed=Town.create(18);to(missed,15);
  assert.ok(Town.startStory(missed,0,1));
  to(missed,83);
  assert.equal(missed.townStory.result,'missed');
  assert.match(missed.events.find(e=>e.type==='story-missed').text,/没能在约定时间到场/);

  const redirected=Town.create(18);to(redirected,15);
  assert.ok(Town.startStory(redirected,1,1));
  to(redirected,82);
  assert.ok(Town.influence(redirected,1,'visit','square'));
  Town.step(redirected);
  assert.equal(redirected.townStory.result,'done');
  assert.equal(redirected.keepsakes.join(','),'1');

  const distrust=Town.create(18);to(distrust,15);
  distrust.people.find(p=>p.id===1).trust[4]=-50;
  assert.ok(Town.startStory(distrust,1,1));
  assert.equal(Town.inviteStory(distrust),false);
  to(distrust,82);
  assert.ok(Town.influence(distrust,1,'visit','square'));
  Town.step(distrust);
  assert.match(distrust.events.find(e=>e.type==='story-missed').text,/到了现场，还是没答应帮忙/);
  assert.equal(TownStories.offer(distrust).title,'没写地址的包裹');
});
test('the six project plans can each unlock their own collectible',()=>{
  for(let day=0;day<TownStories.stories.length;day++){
    for(let plan=0;plan<2;plan++){
      const w=Town.create(18);to(w,day*48+15);
      const helper=w.people.find(p=>TownStories.eligible(w,{story:day,plan},p));
      assert.ok(Town.startStory(w,plan,helper.id));
      assert.ok(Town.inviteStory(w));
      to(w,w.townStory.time);
      assert.equal(w.townStory.result,'done');
      assert.equal(w.keepsakes.join(','),String(day*2+plan));
    }
  }
});
