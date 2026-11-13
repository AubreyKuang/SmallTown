'use strict';

const TownInteriors=(()=>{
  const rooms={
    bakery:{bounds:[382,168,470,213],door:[430,214],stops:[[397,195],[409,194],[422,202],[437,194],[451,200],[462,191],[397,205],[450,186],[463,204]]},
    cafe:{bounds:[521,151,618,197],door:[610,198],stops:[[535,179],[549,186],[561,178],[574,190],[588,179],[601,185],[609,190],[536,191],[574,174]]},
    market:{bounds:[724,166,803,216],door:[761,217],stops:[[737,201],[748,196],[761,205],[775,198],[789,204],[737,187],[786,188],[758,186],[795,211]]},
    station:{bounds:[775,408,862,446],door:[818,447],stops:[[787,433],[799,437],[812,433],[825,435],[837,429],[850,436],[788,421],[849,421]]},
    school:{bounds:[670,58,770,92],door:[725,94],stops:[[684,82],[700,84],[716,83],[734,84],[748,82],[761,82],[698,76],[744,76]]}
  };
  const outdoor=new Set(['walk','stars','recess','play','commute','breadCart','moveIn','trainBoard','trainReturn']);
  const uses=(place,activity)=>!!rooms[place]&&!outdoor.has(activity);
  const contains=(place,x,y)=>{
    const b=rooms[place]?.bounds;
    return !!b&&x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3];
  };
  function entry(place){
    const [x,y]=rooms[place].door;
    return [[x,y+13],[x,y]];
  }
  function draw(ctx,lit,{ellipse,line}){
    const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    const stroke=(points,color,width=1)=>line(ctx,points,color,width);
    const oval=(x,y,w,h,color)=>ellipse(ctx,x,y,w,h,color);
    function table(x,y,color){
      oval(x,y+3,10,4,'#684f3940');oval(x,y,8,4,color);
      box(x-2,y-2,3,2,'#fcf1d4');box(x+2,y-1,3,2,'#e6ab74');
    }
    for(const [place,{bounds}] of Object.entries(rooms)){
      if(place==='school')continue;
      const [x,y,right,bottom]=bounds,w=right-x,h=bottom-y;
      box(x-2,y-1,w+4,h+3,'#705b4b');
      box(x,y,w,h,lit?'#ecd19a':'#e7cc9c');
      box(x,y+13,w,h-13,'#c9a576');
      for(let i=0;i<w;i+=11)box(x+i,y+13,Math.min(1,w-i),h-13,'#ac865a');
      box(x,bottom-1,w,2,'#f1d7a5');
      if(place==='bakery'){
        box(389,174,18,15,'#9b6150');oval(398,182,5,4,'#714b3b');oval(399,184,3,2,'#e9a66b');
        box(418,179,40,7,'#986b48');
        for(const px of [422,429,437,444,452])oval(px,178,3,2,'#edbc78');
        box(442,199,18,7,'#af774b');box(444,200,7,3,'#f4dfaa');
      }else if(place==='cafe'){
        box(526,157,31,9,'#6b886e');box(530,158,17,3,'#dfca99');
        for(const [px,py] of [[543,178],[566,181],[590,174],[602,190]])table(px,py,'#9d7157');
        box(567,154,19,6,'#819f97');stroke([[576,154],[576,160]],'#f0dfb0');
      }else if(place==='market'){
        for(const [px,py,color] of [[731,175,'#db9b5f'],[775,174,'#9eae6c'],[733,198,'#d5bc7c'],[777,200,'#c68261']]){
          box(px,py,17,8,'#9e7956');
          for(let i=0;i<3;i++)oval(px+3+i*5,py+2,2.5,2,color);
        }
        box(751,173,13,7,'#6b7461');stroke([[752,176],[762,176]],'#e9dba7');
      }else{
        box(780,414,23,9,'#8a7159');box(782,415,10,4,'#ddca9f');
        box(833,413,20,8,'#656b5b');
        for(let i=0;i<3;i++)stroke([[835,415+i*2],[850,415+i*2]],'#e6d6ad');
        for(const px of [786,833]){box(px,434,15,4,'#a07c55');box(px+2,438,2,3,'#655649');}
      }
    }
  }
  return {uses,contains,entry,draw,stops:place=>rooms[place].stops};
})();
