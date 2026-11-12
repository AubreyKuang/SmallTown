const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const source=['npc-memory.js','save-manager.js','world.js'].map(name=>readFileSync(require('node:path').join(__dirname,'..',name),'utf8')).join('\n');
const {Town,SaveManager,NPCMemory}=vm.runInNewContext(source+'\n({Town,SaveManager,NPCMemory})');
function to(w,t){while(w.tick<t)Town.step(w);}
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
