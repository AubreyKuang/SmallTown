'use strict';

const TownWatch=(()=>{
  const limit=2;
  const followups=new Set(['date-result','wish-result','moment-result','moment-favor','story-done','story-missed',
    'reunion','couple','confess-no','bond','conflict','thanks','visitor-meeting','visitor-reunion','twilight-meet','supply-help','travel-depart','travel-return']);
  const ids=w=>w.followedResidents??[];
  function toggle(w,id){
    const selected=ids(w);
    if(selected.includes(id))w.followedResidents=selected.filter(other=>other!==id);
    else if(selected.length<limit&&w.people.some(p=>p.id===id))w.followedResidents=[...selected,id];
    else return false;
    return true;
  }
  function appointments(w,p){
    const entries=[];
    const add=(title,at,until,place)=>{
      if(until>=w.tick)entries.push({title,at,place});
    };
    const date=TownRelations.date(w,p);
    if(date&&!date.plan.result)add(`和 ${date.other.name} ${date.plan.kind==='repair'?'把话说开':'见面'}`,date.plan.at,date.plan.until,date.place);
    for(const id of TownWishes.ids){
      const wish=TownWishes.profile(id),state=TownWishes.state(w,id),plan=state.plan;
      if(!plan||(id!==p.id&&wish.other!==p.id))continue;
      const other=w.people.find(person=>person.id===(id===p.id?wish.other:id));
      add(id===p.id?`想见 ${other.name}`:`${other.name} 想来见面`,plan.at,plan.until,TownWishes.beat(id,state).place);
    }
    const moment=TownMoments.active(w);
    if(moment?.state==='waiting'&&[moment.a,moment.b].includes(p.id)){
      const scene=TownMoments.sceneFor(moment);
      add(scene.title,moment.until-2,moment.until,scene.place);
    }
    const story=TownStories.active(w);
    if(story){
      const host=w.events.find(e=>e.id===story.root)?.ids[0];
      const plan=TownStories.planFor(story);
      if(p.id===host||p.id===story.helper)add(plan.name,story.time,story.time,plan.place);
    }
    const twilight=TownTwilight.plan(w);
    const current=twilight&&TownTwilight.state(w,twilight);
    if(twilight&&!current?.result&&(twilight.host===p.id||current?.invite?.id===p.id))
      add('河畔灯笺',twilight.at,twilight.until,twilight.place);
    return entries.sort((a,b)=>Math.max(a.at,w.tick)-Math.max(b.at,w.tick));
  }
  const developments=(events,id)=>events.filter(e=>followups.has(e.type)&&e.ids.includes(id));
  function daily(w,events){
    return [...new Set(ids(w).map(id=>developments(events,id).at(-1)?.text).filter(Boolean))];
  }
  function valid(w){
    const selected=w.followedResidents;
    return selected==null||Array.isArray(selected)&&selected.length<=limit&&new Set(selected).size===selected.length&&
      selected.every(id=>w.people.some(p=>p.id===id));
  }
  return {limit,ids,toggle,appointments,developments,daily,valid};
})();
