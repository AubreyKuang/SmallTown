const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const source=['npc-memory.js','save-manager.js','town-school.js','town-stories.js','town-routines.js','town-moments.js','world.js','town-homes.js','town-map.js','town-movement.js'].map(name=>readFileSync(require('node:path').join(__dirname,'..',name),'utf8')).join('\n');
const {Town,SaveManager,NPCMemory,TownMap,TownMovement,TownStories,TownRoutines,TownHomes,TownSchool,TownMoments}=vm.runInNewContext(source+'\n({Town,SaveManager,NPCMemory,TownMap,TownMovement,TownStories,TownRoutines,TownHomes,TownSchool,TownMoments})');
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
  assert.ok(NPCMemory.recall(w,3).some(memory=>memory.interpretation===event.text));
  const empty=Town.create(7);assert.ok(Town.influence(empty,3,'visit','cafe'));to(empty,5);
  assert.equal(empty.events.some(e=>e.type==='meeting'),false);
  const quiet=empty.events.find(e=>e.type==='quiet');
  assert.equal(quiet?.parent,empty.events.find(e=>e.type==='visit').id);
});
test('staggered commuters animate along the street after their destination changes',()=>{
  const w=Town.create(8);to(w,TownRoutines.shift(w.people[0],0).start-4);
  const crowd=TownMovement.create(w,visualRandom(12));
  const from=crowd.pins().find(pin=>pin.resident.id===1);
  Town.step(w);
  assert.equal(from.place,'homes');
  assert.equal(w.people.find(p=>p.id===1).place,'station');
  assert.equal(w.people.find(p=>p.id===4).place,'homes');
  assert.equal(from.indoors,true);
  crowd.advance(.5);
  const mid=crowd.pins().find(pin=>pin.resident.id===1);
  assert.equal(mid.place,'homes');
  assert.ok(mid.x!==from.x||mid.y!==from.y);
  for(let i=0;i<700;i++)crowd.advance(.05,false);
  const target=crowd.pins().find(pin=>pin.resident.id===1);
  assert.equal(target.place,'station');
  assert.equal(target.indoors,false);
  const points=TownMap.route(from,target);
  assert.ok(points.length>2);
  const path=TownMap.plan(points);
  assert.notDeepEqual(TownMap.position(path,.5),points[0]);
  assert.notDeepEqual(TownMap.position(path,.5),points.at(-1));
  assert.deepEqual(TownMap.position(path,1),points.at(-1));
});
test('residents roam at different times and have distinct stops without advancing the world',()=>{
  const w=Town.create(8);
  to(w,34);
  const snapshot=JSON.stringify(w);
  const crowd=TownMovement.create(w,visualRandom(3));
  const before=new Map(crowd.pins().map(pin=>[pin.resident.id,pin]));
  assert.equal(new Set(crowd.pins().map(pin=>`${pin.x},${pin.y}`)).size,w.people.length);
  for(let i=0;i<14;i++)crowd.advance(.05);
  const moved=crowd.pins().filter(pin=>pin.x!==before.get(pin.resident.id).x||pin.y!==before.get(pin.resident.id).y);
  assert.ok(moved.length>0&&moved.length<w.people.length);
  for(let i=0;i<100;i++)crowd.advance(.05);
  assert.ok(crowd.pins().some(pin=>pin.x!==before.get(pin.resident.id).x||pin.y!==before.get(pin.resident.id).y));
  assert.equal(JSON.stringify(w),snapshot);
});
test('home residents have their own rooms, and sleeping stays stationary',()=>{
  const w=Town.create(8),crowd=TownMovement.create(w,visualRandom(3));
  const before=crowd.pins();
  assert.equal(new Set(before.map(pin=>`${pin.x},${pin.y}`)).size,w.people.length);
  assert.ok(before.every(pin=>pin.indoors&&pin.activity==='sleep'));
  for(let i=0;i<100;i++)crowd.advance(.05);
  assert.deepEqual(crowd.pins(),before);
});
test('residents independently cook, walk and work at the same time',()=>{
  const w=Town.create(8);to(w,34);
  assert.ok(w.people.some(p=>p.place==='homes'&&p.activity==='cook'));
  assert.ok(w.people.some(p=>p.place==='forest'&&p.activity==='walk'));
  assert.ok(w.people.some(p=>p.activity==='work'));
  const before=w.people.map(p=>p.place);
  Town.step(w);
  const moves=w.people.filter((p,i)=>p.place!==before[i]).length;
  assert.ok(moves>0&&moves<12);
  const dayOff=w.people.filter(p=>TownRoutines.shift(p,w.tick).off);
  assert.ok(dayOff.length>0&&dayOff.every(p=>p.activity!=='work'));
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
  const w=Town.create(8);
  while(w.tick<42&&!w.events.some(event=>event.type==='chat'))Town.step(w);
  const chat=w.events.find(event=>event.type==='chat');
  assert.ok(chat);
  const [a,b]=chat.ids.map(id=>w.people.find(p=>p.id===id));
  assert.equal(a.place,b.place);
  assert.match(NPCMemory.recall(w,a.id)[0].interpretation,new RegExp(b.name));
  assert.match(NPCMemory.recall(w,b.id)[0].interpretation,new RegExp(a.name));
  assert.ok(w.people.filter(p=>!chat.ids.includes(p.id)).every(p=>
    NPCMemory.recall(w,p.id).every(memory=>memory.type!=='chat')));
});
test('legacy towns gain the school roster exactly once and keep their progress',()=>{
  const legacy=Town.create(8);to(legacy,18);
  legacy.people=legacy.people.slice(0,24);
  legacy.people[0].money=75;
  assert.ok(Town.valid(legacy));
  Town.upgrade(legacy);Town.upgrade(legacy);
  assert.equal(legacy.people.length,29);
  assert.equal(legacy.people[0].money,75);
  assert.equal(legacy.tick,18);
  assert.ok(legacy.people.filter(TownSchool.student).every(p=>p.place==='school'));
  assert.ok(Town.valid(legacy));
});
test('students attend class, move recess indoors in rain, and leave for different activities',()=>{
  const sunny=Town.create(8);to(sunny,18);
  assert.ok(sunny.people.filter(TownSchool.student).every(p=>p.activity==='class'));
  const rain=JSON.parse(JSON.stringify(sunny));rain.weather='细雨';
  to(sunny,22);to(rain,22);
  assert.ok(sunny.people.filter(TownSchool.student).every(p=>p.place==='schoolyard'));
  assert.ok(rain.people.filter(TownSchool.student).every(p=>p.place==='school'&&p.activity==='indoorRecess'));
  const recess=sunny.events.find(e=>e.type==='school-recess');
  assert.ok(recess.ids.every(id=>NPCMemory.recall(sunny,id).some(memory=>memory.type==='school-recess')));
  to(sunny,30);
  const children=sunny.people.filter(TownSchool.student);
  assert.ok(children.some(p=>p.activity==='homework'));
  assert.ok(children.some(p=>p.activity==='play'));
  assert.ok(children.some(p=>p.activity==='recess'));
  assert.equal(Town.influence(sunny,children[0].id,'lottery'),false);
  to(sunny,5*48+18);
  assert.ok(sunny.people.filter(TownSchool.student).every(p=>p.activity!=='class'));
});
test('school improvements change later recess activities',()=>{
  const garden=Town.create(8);garden.keepsakes=[6];to(garden,22);
  assert.match(garden.events.find(e=>e.type==='school-recess').text,/给新花坛浇水/);
  const books=Town.create(8);books.keepsakes=[7];books.weather='细雨';to(books,22);
  assert.match(books.events.find(e=>e.type==='school-recess').text,/从故事书架抽出一本书/);
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
test('each town and school plan can unlock its own collectible',()=>{
  for(let day=0;day<TownStories.stories.length;day++){
    for(let plan=0;plan<2;plan++){
      const w=Town.create(18);to(w,day*48+15);
      const helper=w.people.find(p=>TownStories.eligible(w,{story:day,plan},p));
      assert.ok(Town.startStory(w,plan,helper.id,day===3));
      assert.ok(Town.inviteStory(w));
      to(w,w.townStory.time);
      assert.equal(w.townStory.result,'done');
      assert.equal(w.keepsakes.join(','),String(day*2+plan));
    }
  }
});
test('an immediate nudge spends one die, creates two memories and produces at most one later favor',()=>{
  const w=Town.create(8);to(w,17);
  const {root,a,b}=w.moment;
  assert.ok(Town.chooseMoment(w,root,'hint'));
  assert.equal(w.tokens,2);
  assert.equal(Town.chooseMoment(w,root,'hint'),false);
  for(const id of [a,b])assert.ok(NPCMemory.recall(w,id).some(memory=>memory.type==='town-moment'));
  const restored=JSON.parse(JSON.stringify(w));
  assert.ok(Town.valid(restored));
  to(w,175);to(restored,175);
  assert.equal(JSON.stringify(w),JSON.stringify(restored));
  const outcome=w.events.find(e=>e.parent===root&&e.type==='moment-result');
  assert.equal(w.events.filter(e=>e.parent===outcome.id&&e.type==='moment-favor').length,1);
});
test('the same encounter ends differently when a hesitant neighbor is left alone or trusts the other resident',()=>{
  const w=Town.create(8);to(w,17);
  const copy=JSON.parse(JSON.stringify(w));
  assert.ok(Town.chooseMoment(w,w.moment.root,'leave'));
  assert.equal(w.tokens,3);
  assert.equal(w.moment.success,false);
  copy.people.find(p=>p.id===copy.moment.b).trust[copy.moment.a]=10;
  assert.ok(Town.chooseMoment(copy,copy.moment.root,'leave'));
  assert.equal(copy.tokens,3);
  assert.equal(copy.moment.success,true);
});
test('a booked reunion can be missed or rescued by an actual same-place arrival',()=>{
  const w=Town.create(8);to(w,17);
  assert.ok(Town.chooseMoment(w,w.moment.root,'reunion'));
  const alternate=JSON.parse(JSON.stringify(w));
  const {until,b}=w.moment,place=TownMoments.sceneFor(w.moment).place;
  to(w,until);
  assert.equal(w.moment.success,false);
  to(alternate,until-1);
  assert.ok(Town.influence(alternate,b,'visit',place));
  Town.step(alternate);
  assert.equal(alternate.moment.success,true);
});
test('slower walkers can reroute in mid-journey without jumping or visiting the old destination',()=>{
  const w=Town.create(8),p=w.people[0];
  const crowd=TownMovement.create(w,visualRandom(12));
  const pin=()=>crowd.pins().find(item=>item.resident.id===p.id);
  p.place='station';p.activity='commute';
  for(let i=0;i<140;i++)crowd.advance(.05,false);
  const before=pin();
  assert.equal(before.movingTo,'station');
  assert.equal(before.indoors,false);
  p.place='cafe';p.activity='coffee';
  crowd.advance(.05,false);
  assert.equal(pin().movingTo,'cafe');
  assert.ok(Math.hypot(pin().x-before.x,pin().y-before.y)<=46*.05+.001);
  for(let i=0;i<700;i++){
    crowd.advance(.05,false);
    assert.notEqual(pin().place,'station');
  }
  assert.equal(pin().place,'cafe');
});
test('people can match walking pace and stop for a conversation that becomes a memory',()=>{
  const w=Town.create(8);to(w,17);
  const crowd=TownMovement.create(w,visualRandom(3),(a,b)=>Town.roadTalk(w,a,b));
  let sharedSteps=0,talkingStops=0;
  for(let i=0;i<1500;i++){
    if(i>0&&i%144===0)Town.step(w);
    const before=new Map(crowd.pins().map(p=>[p.resident.id,p]));
    crowd.advance(.05);
    const after=crowd.pins(),byId=new Map(after.map(p=>[p.resident.id,p]));
    for(const p of after){
      const old=before.get(p.resident.id);
      const moved=Math.hypot(p.x-old.x,p.y-old.y);
      assert.ok(moved<=46*.05+.001);
      if(p.social==='walk'&&old.partner===p.partner&&moved>0){
        const peer=byId.get(p.partner),previous=before.get(p.partner);
        assert.equal(peer.partner,p.resident.id);
        if(Math.hypot(peer.x-previous.x,peer.y-previous.y)>0)sharedSteps++;
      }
      if(p.social==='talk'&&old.social==='talk'&&old.partner===p.partner){
        assert.equal(moved,0);
        talkingStops++;
      }
    }
  }
  assert.ok(sharedSteps>50);
  assert.ok(talkingStops>50);
  const chat=w.events.find(e=>e.type==='road-talk');
  assert.ok(chat);
  assert.ok(chat.ids.every(id=>NPCMemory.recall(w,id).some(memory=>memory.type==='road-talk')));
  assert.equal(Town.roadTalk(w,...chat.ids),false);
});
