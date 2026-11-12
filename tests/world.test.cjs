const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const source=['npc-memory.js','save-manager.js','town-school.js','town-stories.js','town-routines.js','town-moments.js','town-visitors.js','town-rail.js','town-wishes.js','town-relations.js','town-ripples.js','town-skeptic.js','town-goals.js','town-watch.js','town-twilight.js','town-paper.js','world.js','town-homes.js','town-interiors.js','town-atmosphere.js','town-map.js','town-movement.js'].map(name=>readFileSync(require('node:path').join(__dirname,'..',name),'utf8')).join('\n');
const {Town,SaveManager,NPCMemory,TownMap,TownMovement,TownStories,TownRoutines,TownHomes,TownSchool,TownMoments,TownInteriors,TownRail,TownWishes,TownRelations,TownRipples,TownSkeptic,TownGoals,TownPaper,TownWatch,TownVisitors,TownTwilight,TownAtmosphere}=vm.runInNewContext(source+'\n({Town,SaveManager,NPCMemory,TownMap,TownMovement,TownStories,TownRoutines,TownHomes,TownSchool,TownMoments,TownInteriors,TownRail,TownWishes,TownRelations,TownRipples,TownSkeptic,TownGoals,TownPaper,TownWatch,TownVisitors,TownTwilight,TownAtmosphere})');
function to(w,t){while(w.tick<t)Town.step(w);}
function visualRandom(seed){
  return ()=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
}
test('redirect only meets residents who were scheduled at the destination',()=>{
  const w=Town.create(8);to(w,34);
  const expected=w.people.filter(p=>p.id!==3&&Town.forecast(w,p,35)==='cafe').map(p=>p.id);
  assert.equal(Town.influence(w,3,'visit','cafe'),true);Town.step(w);
  const event=w.events.find(e=>e.type==='meeting');
  assert.ok(event);assert.equal(w.events.find(e=>e.id===event.parent).type,'visit');
  assert.ok(event.ids.includes(3));
  assert.ok(expected.includes(event.ids[1]));
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
test('the same map encounter is not offered twice in one day',()=>{
  let offered=0;
  for(let seed=0;seed<12;seed++){
    const w=Town.create(seed);to(w,48*4);
    const seen=new Set();
    for(const e of w.events){
      if(e.type!=='moment-start')continue;
      offered++;
      const key=`${Math.floor(e.tick/48)}|${e.text}`;
      assert.ok(!seen.has(key),`same encounter twice in one day: ${key}`);
      seen.add(key);
    }
  }
  assert.ok(offered>0);
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
test('public buildings have indoor stops and use their entrances to move between street and room',()=>{
  const w=Town.create(8);
  for(const [i,[place,activity]] of [['bakery','work'],['cafe','coffee'],['market','shop'],['station','work'],['school','class']].entries()){
    Object.assign(w.people[i],{place,activity});
  }
  const crowd=TownMovement.create(w,visualRandom(4));
  for(const pin of crowd.pins().filter(p=>p.resident.id<=5)){
    assert.ok(pin.indoors&&TownInteriors.contains(pin.place,pin.x,pin.y));
  }
  const worker=w.people[3];
  worker.activity='commute';
  for(let i=0;i<300;i++)crowd.advance(.05,false);
  const pin=crowd.pins().find(p=>p.resident.id===worker.id);
  assert.equal(pin.place,'station');
  assert.equal(pin.indoors,false);
  const entry=TownInteriors.entry('station');
  const [x,y]=TownInteriors.stops('station')[0];
  const path=TownMap.route(pin,{place:'station',x,y});
  assert.deepEqual(path.slice(1,3),entry);
});
test('train arrival, boarding, and return traffic follow the same timetable',()=>{
  const morning=TownRail.services(0)[0],{start,arrivals,departures}=morning;
  assert.equal(TownRail.train(start,0).phase,'approach');
  assert.ok(TownRail.train(start,.7).nose<TownRail.train(start,0).nose);
  assert.equal(TownRail.train(start+1,.3).nose,TownRail.train(start+1,.8).nose);
  assert.ok(TownRail.train(start+2,.7).nose<TownRail.train(start+2,.2).nose);
  assert.equal(TownRail.train(start+3,0),null);
  assert.equal(TownRail.passengers(start+1,.5).filter(p=>p.phase==='alight').length,arrivals);
  assert.equal(TownRail.passengers(start+1,.66).filter(p=>p.phase==='board').length,departures);
  const guests=TownRail.passengers(start+6,0).filter(p=>p.phase==='visit');
  assert.equal(guests.length,arrivals);
  const w=Town.create(8);to(w,start+2);
  assert.deepEqual(w.events.filter(e=>e.type==='rail').map(e=>e.tick).join(','),`${start+1},${start+2}`);
});
test('followed residents show shared appointments and the paper prints only new developments',()=>{
  const w=Town.create(8);to(w,17);
  assert.equal(TownWatch.toggle(w,6),true);
  assert.equal(TownWatch.toggle(w,8),true);
  assert.equal(TownWatch.toggle(w,1),false);
  assert.equal(TownWatch.appointments(w,w.people[5])[0].at,34);
  assert.equal(TownWatch.appointments(w,w.people[7])[0].place,'cafe');
  to(w,48);
  const first=w.papers[0].sections.find(s=>s.label==='关注的人 · 后来');
  assert.match(first.text,/Nora/);
  assert.equal(first.text.split('\n').length,1);
  assert.equal(TownWatch.toggle(w,6),true);
  assert.equal(TownWatch.toggle(w,8),true);
  to(w,96);
  assert.ok(!w.papers[1].sections.some(s=>s.label==='关注的人 · 后来'));
  assert.ok(!Town.valid({...w,followedResidents:[6,6]}));
});
test('visitors ride actual trains and a returning visitor remembers the same resident',()=>{
  const w=Town.create(8);
  const arrival=TownRail.services(0)[0].start+1;
  assert.equal(TownRail.passengers(arrival,.5).find(p=>p.visitor)?.visitor.id,'lin');
  assert.equal(TownRail.passengers(arrival+10,.66).find(p=>p.visitor)?.phase,'board');
  to(w,24);
  const first=w.visitors.lin.lastMeeting;
  assert.equal(w.visitors.lin.visits,1);
  assert.ok(NPCMemory.recall(w,first.resident).some(m=>m.subject==='visitor:lin'));
  assert.ok(!NPCMemory.recall(w,2).some(m=>m.subject==='visitor:lin'));
  const loaded=JSON.parse(JSON.stringify(w));
  assert.ok(Town.valid(loaded));
  to(loaded,7*48+24);
  assert.equal(loaded.visitors.lin.visits,2);
  assert.equal(loaded.visitors.lin.lastMeeting.resident,first.resident);
  assert.equal(loaded.events.filter(e=>e.type==='visitor-reunion').length,1);
  assert.equal(loaded.visitors.yue.visits,1);
  assert.equal(TownVisitors.timetable(loaded).find(v=>v.profile.id==='yue').trip,null);
  assert.ok(!Town.valid({...loaded,visitors:{lin:{...loaded.visitors.lin,lastDay:8}}}));
});
test('a visitor leaves without a new memory when no eligible resident was at the stop',()=>{
  const w=Town.create(8);
  const events=[];
  const log=(text,parent,type)=>{events.push(type);};
  for(w.tick=18;w.tick<30;w.tick++)TownVisitors.step(w,log,()=>assert.fail('unexpected visitor memory'));
  assert.deepEqual(events,['visitor-arrival']);
  assert.equal(w.visitors.lin.lastMeeting,undefined);
});
test('a rainy lantern evening moves indoors and a successful invitation survives a reload',()=>{
  const w=Town.create(8);to(w,33);
  w.weather='细雨';w.seed=1000;
  assert.equal(TownTwilight.plan(w).place,'cafe');
  assert.equal(TownTwilight.lit(w),null);
  const root=Town.inviteTwilight(w,17);
  assert.ok(root);assert.equal(w.tokens,2);
  assert.equal(Town.inviteTwilight(w,2),null);
  const copy=JSON.parse(JSON.stringify(w));
  assert.ok(Town.valid(copy));
  to(copy,36);
  assert.equal(TownTwilight.lit(copy),'cafe');
  assert.equal(copy.twilight.current.result.guest,17);
  assert.equal(copy.events.find(e=>e.type==='twilight-meet').parent,root);
  assert.equal(copy.twilight.cards[0].title,'一页旧河岸速写');
  assert.ok(NPCMemory.recall(copy,17).some(m=>m.type==='twilight'));
  const pins=TownMovement.create(copy,visualRandom(2)).pins();
  assert.ok(pins.filter(p=>[7,17].includes(p.resident.id)).every(p=>p.indoors&&p.activity==='twilight'));
  to(copy,48);
  assert.equal(TownTwilight.lit(copy),null);
  assert.equal(copy.twilight.cards.length,1);
  assert.ok(copy.papers[0].sections.some(s=>s.label==='河畔灯笺'));
});
test('an evening still ends when no guest comes and lighting interpolates within a tick',()=>{
  const w=Town.create(8);to(w,33);
  w.weather='晴朗';w.seed=0;
  const root=Town.inviteTwilight(w,17);
  assert.equal(w.twilight.current.invite.die,2);
  assert.equal(TownTwilight.destination({...w,tick:36},w.people[16],{place:'homes',activity:'read'}).place,'homes');
  for(const id of [2,17])w.people[id-1].override={place:'homes',until:42};
  to(w,41);
  assert.equal(w.twilight.cards.length,0);
  assert.equal(w.events.find(e=>e.type==='twilight-quiet').parent,root);
  assert.equal(TownAtmosphere.light(24,0).night,0);
  assert.ok(TownAtmosphere.light(39,.6).night>TownAtmosphere.light(39,0).night);
  assert.ok(TownAtmosphere.light(36,0).dusk>.5);
});
test('wish dice preserve the resident’s hesitation on a low roll and a solo attempt on a middle roll',()=>{
  const low=Town.create(0);to(low,17);
  const root=Town.rollWish(low,1);
  assert.ok(root);
  assert.equal(TownWishes.state(low,1).die,2);
  assert.equal(low.tokens,2);
  assert.equal(Town.rollWish(low,1),null);
  assert.match(low.events.find(e=>e.parent===root).text,/把话咽了回去/);
  const middle=Town.create(1000);to(middle,17);
  assert.ok(Town.rollWish(middle,1));
  assert.equal(TownWishes.state(middle,1).die,4);
  to(middle,39);
  assert.equal(TownWishes.state(middle,1).stage,0);
  assert.match(TownWishes.state(middle,1).latest,/没有碰上/);
});
test('a strong roll creates an opportunity, respects distrust, and survives a round trip',()=>{
  const w=Town.create(1200);to(w,17);
  const root=Town.rollWish(w,1),state=TownWishes.state(w,1);
  assert.equal(state.die,5);
  const restored=JSON.parse(JSON.stringify(w));
  assert.ok(Town.valid(restored));
  const refused=JSON.parse(JSON.stringify(w));
  refused.people.find(p=>p.id===2).trust[1]=-90;
  to(w,39);to(restored,39);to(refused,39);
  assert.equal(JSON.stringify(w),JSON.stringify(restored));
  assert.equal(state.stage,1);
  assert.match(TownWishes.thought(w,w.people[0],w.people[0].activity),/糖放多了/);
  assert.equal(w.events.filter(e=>e.parent===root&&e.type==='wish-result').length,1);
  assert.equal(TownWishes.state(refused,1).stage,0);
  assert.ok(NPCMemory.recall(w,1).some(m=>m.type==='wish-progress'));
});
test('wish dice explain the roll band in the log',()=>{
  const low=Town.create(0);to(low,17);
  const lowRoot=Town.rollWish(low,1);
  assert.ok(lowRoot);
  assert.match(low.events.find(e=>e.id===lowRoot).text,/1–2 点/);
  const middle=Town.create(1000);to(middle,17);
  const midRoot=Town.rollWish(middle,1);
  assert.ok(midRoot);
  assert.match(middle.events.find(e=>e.id===midRoot).text,/3–4 点/);
});
test('intervention budget starts at three and a wish die spends one of them',()=>{
  const w=Town.create(8);to(w,17);
  assert.equal(w.tokens,3);
  assert.equal(Town.dailyTotal(w),3);
  assert.ok(Town.rollWish(w,1));
  assert.equal(w.tokens,2);
  assert.equal(Town.dailyTotal(w),3);
});
test('a missed date gives both partners distinct perspectives and a later chance to talk',()=>{
  const w=Town.create(8);to(w,34);
  const nora=w.people.find(p=>p.id===6),owen=w.people.find(p=>p.id===8);
  assert.equal(nora.place,'cafe');
  assert.equal(owen.activity,'dateOvertime');
  assert.equal(TownRelations.connections(w,nora)[0].label,'恋人');
  to(w,36);
  assert.equal(TownRelations.date(w,nora).plan.result.kind,'missed');
  assert.match(TownRelations.thought(w,nora),/咖啡都凉了/);
  assert.match(TownRelations.thought(w,owen),/收完摊/);
  assert.ok(nora.trust[owen.id]<owen.trust[nora.id]);
  const save=JSON.parse(JSON.stringify(w));
  assert.ok(Town.valid(save));
  to(save,84);to(w,84);
  assert.equal(JSON.stringify(w),JSON.stringify(save));
  assert.equal(TownRelations.date(w,nora).plan.result.kind,'repaired');
  assert.equal(w.events.filter(e=>e.type==='date-result'&&e.ids.includes(nora.id)).length,2);
});
test('a good roll clears a work conflict but a competing redirect can still prevent the date',()=>{
  const w=Town.create(1200);to(w,17);
  assert.ok(Town.nudgeDate(w,6));
  assert.equal(TownRelations.date(w,w.people[5]).plan.die,5);
  assert.equal(w.tokens,2);
  assert.equal(Town.nudgeDate(w,8),null);
  const diverted=JSON.parse(JSON.stringify(w));
  to(w,36);
  assert.equal(TownRelations.date(w,w.people[5]).plan.result.kind,'kept');
  to(diverted,33);
  assert.ok(Town.influence(diverted,8,'visit','forest'));
  to(diverted,36);
  assert.equal(TownRelations.date(diverted,diverted.people[5]).plan.result.kind,'missed');
});
test('profiles distinguish family, classmates, and friends in a legacy save',()=>{
  const w=Town.create(8);to(w,17);
  delete w.relationshipDates;
  assert.ok(Town.valid(w));
  const forId=id=>TownRelations.connections(w,w.people.find(p=>p.id===id));
  assert.equal(forId(26).find(c=>c.person.id===2).label,'家人');
  assert.equal(forId(26).find(c=>c.person.id===27).label,'同学');
  assert.equal(forId(3).find(c=>c.person.id===7).label,'朋友');
  assert.ok(w.people.every(p=>TownRelations.connections(w,p).length>0));
});
function manualLog(w){
  return (text,parent,type,ids)=>{const e={id:++w.sequence,tick:w.tick,text,parent,type,ids};w.events.push(e);return e.id;};
}
test('fate ripples grow from real events and replay identically from a snapshot',()=>{
  const w=Town.create(42);to(w,20);
  assert.ok(Town.influence(w,5,'lottery'));assert.ok(Town.influence(w,2,'lost'));
  const copy=JSON.parse(JSON.stringify(w));
  to(w,48*3);to(copy,48*3);
  assert.equal(JSON.stringify(copy),JSON.stringify(w));
  const spontaneous=new Set(['umbrella','snowman','meteor-start','kind-turn']);
  const ripples=w.events.filter(e=>['treat','flowers','gossip','rumor','thanks','repay','unpaid','cover','reunion','share','platform','bond','crush','stargaze'].includes(e.type));
  assert.ok(ripples.length>0);
  assert.ok(ripples.every(e=>e.parent!=null||spontaneous.has(e.type)));
  const lottery=w.events.find(e=>e.type==='lottery');
  assert.ok(TownRipples.summary(w,lottery.id).people.length>=2);
  assert.ok(Town.valid(w));
});
test('gossip only reaches someone who shares a place with the teller and may be misheard',()=>{
  const w=Town.create(8);to(w,20);
  const [teller,subject,near,far]=[w.people[0],w.people[1],w.people[3],w.people[4]];
  for(const p of w.people){p.place='homes';p.activity='rest';}
  teller.place='cafe';near.place='cafe';teller.activity=near.activity='coffee';
  TownRipples.step(w,manualLog(w));
  w.ripples.plans.push({kind:'gossip',ids:[teller.id,subject.id],parent:null,at:w.tick,until:w.tick+5,tone:-1,claim:`${subject.name} 欠钱不还。`,hops:0,told:[]});
  const before=far.trust[subject.id]||0;
  TownRipples.step(w,manualLog(w));
  const told=w.events.findLast(e=>['gossip','rumor'].includes(e.type));
  assert.ok(told);assert.equal(JSON.stringify(told.ids),JSON.stringify([teller.id,near.id,subject.id]));
  assert.ok((near.trust[subject.id]||0)<0);
  assert.equal(far.trust[subject.id]||0,before);
  assert.ok(NPCMemory.recall(w,near.id).some(m=>m.channel==='hearsay'&&m.confidence<1));
});
test('Newton only writes down coincidences he could plausibly notice',()=>{
  const w=Town.create(8);to(w,20);
  const newton=w.people.find(p=>p.id===TownSkeptic.NEWTON),stranger=w.people.find(p=>p.id===11);
  TownSkeptic.step(w,manualLog(w),()=>{});
  newton.place='bakery';newton.activity='work';stranger.place='forest';stranger.activity='walk';
  newton.trust[stranger.id]=0;stranger.trust[newton.id]=0;
  manualLog(w)(`${stranger.name} 捡到两枚硬币。`,null,'coin',[stranger.id]);
  TownSkeptic.step(w,manualLog(w),()=>{});
  assert.equal(w.skeptic.notes.length,0);
  stranger.place='bakery';
  manualLog(w)(`${stranger.name} 捡到两枚硬币。`,null,'coin',[stranger.id]);
  TownSkeptic.step(w,manualLog(w),()=>{});
  assert.equal(w.skeptic.notes.length,1);
  assert.ok(w.skeptic.awareness>0);
  assert.equal(w.events.at(-1).type,'note');
});
test('midnight prints the daily paper and finished requests add tomorrow interventions',()=>{
  const w=Town.create(42);to(w,20);
  TownGoals.state(w);
  w.goals.quests=[{kind:'mood',a:1,text:'让 Alice 的心情升到 85',hint:'',done:false}];
  w.people[0].mood=95;
  Town.influence(w,5,'coin');
  to(w,48);
  assert.equal(w.goals.completed,1);
  assert.equal(w.tokens,4);
  assert.equal(Town.dailyTotal(w),4);
  assert.equal(w.papers.length,1);
  const paper=w.papers[0];
  assert.equal(paper.day,0);assert.equal(paper.weekday,'星期一');
  assert.ok(paper.headline.title&&paper.headline.text);
  assert.ok(paper.sections.some(s=>s.label==='蝴蝶效应'));
  assert.ok(paper.sections.some(s=>s.label==='命运委托'&&s.text.includes('1 / 1')));
  assert.ok(Town.valid(w));
});
test('the daily paper reports the weather of the day it covers',()=>{
  const w=Town.create(1);to(w,48);
  const paper=w.papers[0];
  assert.equal(paper.day,0);
  // Day 0 was sunny; the next day's rain must not leak into this paper's footer.
  assert.equal(paper.weather,'晴朗');
  assert.equal(paper.today,undefined);
});
test('a missed request names what would have helped',()=>{
  const w=Town.create(42);to(w,20);
  TownGoals.state(w);
  w.goals.quests=[{kind:'mood',a:1,text:'让 Alice 的心情升到 85',hint:'捡到硬币、赶上公交、被人帮一把，都会让人高兴。',done:false}];
  w.people[0].mood=50;
  to(w,48);
  assert.equal(w.goals.last.missed.length,1);
  assert.equal(w.goals.last.missed[0].text,'让 Alice 的心情升到 85');
  assert.equal(w.goals.last.missed[0].hint,'捡到硬币、赶上公交、被人帮一把，都会让人高兴。');
  const section=w.papers[0].sections.find(s=>s.label==='命运委托');
  assert.match(section.text,/没完成「让 Alice 的心情升到 85」/);
  assert.match(section.text,/捡到硬币/);
  assert.ok(Town.valid(w));
});
test('save manager migrates version 1 saves, rejects future versions and rewinds to snapshots',()=>{
  const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
  const legacy=Town.create(5);to(legacy,30);
  for(const key of ['ripples','skeptic','goals','papers','paperDay'])delete legacy[key];
  legacy.saveVersion=1;
  map.set('town',JSON.stringify(legacy));
  const loaded=SaveManager.load(storage,'town',Town.valid,Town.migrate);
  assert.equal(loaded.tick,30);
  map.set('town',JSON.stringify({...legacy,saveVersion:99}));
  assert.equal(SaveManager.load(storage,'town',Town.valid,Town.migrate),null);
  const morning=Town.create(6);to(morning,48);
  assert.ok(SaveManager.snapshot(storage,'town',morning,Town.valid,{label:'day-1',day:1,tick:morning.tick}));
  to(morning,96);
  assert.ok(SaveManager.snapshot(storage,'town',morning,Town.valid,{label:'day-2',day:2,tick:morning.tick}));
  assert.ok(SaveManager.snapshot(storage,'town',morning,Town.valid,{label:'day-2',day:2,tick:morning.tick}));
  const list=SaveManager.snapshots(storage,'town');
  assert.equal(JSON.stringify(list.map(s=>s.day)),'[1,2]');
  assert.equal(SaveManager.restore(storage,'town',0,Town.valid,Town.migrate).tick,48);
});
