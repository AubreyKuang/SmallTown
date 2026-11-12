'use strict';

const TownSchool=(()=>{
  const teacher=25;
  const pupils=[
    {id:26,name:'Mia',family:2,outing:'bakery'},
    {id:27,name:'Kit',family:7,outing:'forest'},
    {id:28,name:'Pip',family:16,outing:'square'},
    {id:29,name:'Rue',family:23,outing:'market'}
  ];
  const roster=[
    {id:teacher,name:'Marin',family:10,job:'school',habit:'cafe',temperament:'generous'},
    ...pupils.map(p=>({...p,job:'school',habit:'schoolyard',temperament:'practical'}))
  ];
  const student=p=>p.id>=26;
  const household=id=>roster.find(p=>p.id===id)?.family??id;
  const at=(place,activity)=>({place,activity});
  function routine(w,p){
    if(p.id<teacher)return;
    const hour=w.tick%48,day=Math.floor(w.tick/48);
    const weekend=day%7>=5,clear=w.weather==='晴朗';
    if(p.id===teacher){
      if(hour<13||hour>=44)return at('homes','sleep');
      if(!weekend&&hour>=16&&hour<33)return at('school',hour<18?'prepare':'teach');
      return hour<16?at('homes','breakfast'):hour<37?at('cafe','coffee'):at('homes','read');
    }
    const pupil=pupils.find(item=>item.id===p.id),i=p.id-26;
    const arrival=16+i%3,recess=21+(i%2),release=29+(i%2);
    if(hour<12+i||hour>=39+i)return at('homes','sleep');
    if(!weekend&&hour>=arrival&&hour<release){
      if(hour>=recess&&hour<recess+2)return clear?at('schoolyard','recess'):at('school','indoorRecess');
      return at('school',hour<18?'prepare':'class');
    }
    if(hour<arrival)return at('homes','breakfast');
    if(hour>=release&&hour<release+3&&i===2&&clear&&!weekend)return at('schoolyard','recess');
    if(hour>=release&&hour<release+4&&i===0&&!weekend)return at('homes','homework');
    if(hour>=release+(i===2?3:0)&&hour<release+6+i&&clear)return at(pupil.outing,'play');
    if(weekend&&clear&&hour>=20+i&&hour<25+i)return at(pupil.outing,'play');
    return at('homes',hour<36?'homework':'read');
  }
  function encounter(w,log,remember){
    const hour=w.tick%48,day=Math.floor(w.tick/48);
    if(hour===37){
      const families=pupils.flatMap(({id,family})=>{
        const child=w.people.find(p=>p.id===id),adult=w.people.find(p=>p.id===family);
        return child?.place==='homes'&&adult?.place==='homes'&&child.activity!=='sleep'&&adult.activity!=='sleep'?[[child,adult]]:[];
      });
      if(families.length){
        const [child,adult]=families[(day+w.seed)%families.length];
        const source=log(`${child.name} 回家后和 ${adult.name} 分享了今天最有意思的一件事。`,null,'school-family',[child.id,adult.id]);
        remember(child,adult,'school-family',.4,`${adult.name} 听我讲了今天的事。`,source);
        remember(adult,child,'school-family',.35,`${child.name} 回家后跟我聊起了今天的事。`,source);
      }
    }
    if(hour!==22||day%7>=5)return;
    const atSchool=w.people.filter(p=>student(p)&&['recess','indoorRecess'].includes(p.activity));
    if(atSchool.length<2)return;
    const offset=(day+w.seed)%atSchool.length;
    const a=atSchool[offset],b=atSchool[(offset+1)%atSchool.length];
    if(a.place!==b.place)return;
    const outside=a.place==='schoolyard';
    const actions=outside?['一起跳格子，第二轮才分出胜负','蹲在花坛边数新开的花','把纸飞机飞过了院子']:[
      '在教室里交换了课外书','留在屋里一起画窗外的雨','在黑板上轮流画谜题'];
    if(outside&&w.keepsakes?.includes(6))actions[0]='给新花坛浇水，又在观察本上画下新长的叶子';
    if(!outside&&w.keepsakes?.includes(7))actions[0]='从故事书架抽出一本书，轮流念给对方听';
    const action=actions[day%actions.length];
    const source=log(`课间，${a.name} 和 ${b.name} ${action}。`,null,'school-recess',[a.id,b.id]);
    remember(a,b,'school-recess',.35,`课间我和 ${b.name} ${action}。`,source);
    remember(b,a,'school-recess',.35,`课间我和 ${a.name} ${action}。`,source);
  }
  return {roster,teacher,student,household,routine,encounter};
})();
