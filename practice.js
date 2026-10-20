'use strict';
// Transparent learning steps plus an adaptive, per-kana review schedule.
// The decay score is a heuristic; it is not a measured probability of recall.
const KanaPractice = (() => {
 const KEY='kana-room04-practice-v2', LEGACY='kana-room04-practice-v1';
 const MINUTE=60000, DAY=86400000, MAX_INTERVAL=180*DAY;
 let state={version:2,turn:0,items:{}};
 const integer=n=>Number.isSafeInteger(n)&&n>=0;
 function read(){
  try{
   const saved=JSON.parse(localStorage.getItem(KEY));
   if(saved?.version===2&&integer(saved.turn)&&saved.items&&typeof saved.items==='object'){
    const items={};
    for(const [kana,item] of Object.entries(saved.items)){
     const fields=['attempts','streak','lapses','step','interval','lastAnswerAt','dueAt','dueTurn','lastShownTurn'];
     if(item&&fields.every(f=>integer(item[f]))&&item.lastShownTurn<=saved.turn&&['learning','relearning','review'].includes(item.phase)&&item.step<=2&&Number.isFinite(item.ease)&&item.ease>=1.3&&item.ease<=3&&typeof item.lastCorrect==='boolean')items[kana]={...item};
    }
    state={version:2,turn:saved.turn,items};return;
   }
   const old=JSON.parse(localStorage.getItem(LEGACY));
   if(old?.version===1&&integer(old.turn)&&old.items&&typeof old.items==='object'){
    state={version:2,turn:old.turn,items:{}};
    for(const [kana,item] of Object.entries(old.items)){
     if(!item||!['attempts','streak','interval','lastAnswerAt','dueAt','lastShownTurn'].every(f=>integer(item[f]))||item.lastShownTurn>old.turn||typeof item.lastCorrect!=='boolean')continue;
     const mature=item.lastCorrect&&item.streak>=3;
     state.items[kana]={...item,lapses:0,step:mature?2:Math.min(item.streak,2),ease:2.3,phase:mature?'review':item.lastCorrect?'learning':'relearning',interval:mature?Math.max(DAY,item.interval):item.lastCorrect?MINUTE:30000,dueAt:mature?item.dueAt:Math.min(item.dueAt,item.lastAnswerAt+(item.lastCorrect?MINUTE:30000)),dueTurn:mature?0:old.turn};
    }
   }
  }catch{}
 }
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
 read();save();
 function isDue(item,now,turn=state.turn){return item.attempts>0&&(item.dueAt<=now||(item.phase!=='review'&&item.dueTurn<=turn));}
 function retention(item,now){return Math.exp(Math.log(.9)*Math.max(0,now-item.lastAnswerAt)/Math.max(30000,item.interval));}
 function select(pool,now=Date.now()){
  if(!pool.length)throw new Error('A kana pool is required.');read();
  const turn=state.turn+1;
  // Only prevent an immediate duplicate. Learning steps determine when to return.
  let candidates=pool.filter(([kana])=>!state.items[kana]||turn-state.items[kana].lastShownTurn>1);
  if(!candidates.length)candidates=pool;
  const ranked=candidates.map(pair=>{const item=state.items[pair[0]],kind=!item?.attempts?1:isDue(item,now,turn)?0:2;return {pair,kind,priority:kind===0?item.dueAt:kind===2?retention(item,now):0,tie:Math.random()};});
  ranked.sort((a,b)=>a.kind-b.kind||a.priority-b.priority||a.tie-b.tie);
  const chosen=ranked[0].pair;
  state.turn=turn;
  const item=state.items[chosen[0]]||{attempts:0,streak:0,lapses:0,step:0,phase:'learning',interval:0,lastAnswerAt:0,dueAt:0,dueTurn:0,lastShownTurn:0,lastCorrect:false,ease:2.3};
  item.lastShownTurn=turn;state.items[chosen[0]]=item;save();return chosen;
 }
 function record(kana,correct,now=Date.now()){
  read();const item=state.items[kana];if(!item)return;
  const scheduled=item.attempts===0||isDue(item,now);
  item.attempts++;item.lastCorrect=correct;
  if(!correct){
   item.lapses++;item.streak=0;item.step=0;item.phase='relearning';item.ease=Math.max(1.3,item.ease-.2);
   item.interval=30000;item.dueAt=now+30000;item.dueTurn=state.turn+3;
  }else if(scheduled){
   item.streak++;
   if(item.phase==='review'){
    item.interval=Math.min(MAX_INTERVAL,Math.max(DAY,Math.round(item.interval*item.ease)));item.ease=Math.min(3,item.ease+.05);item.dueAt=now+item.interval;item.dueTurn=0;
   }else if(item.step<2){
    item.step++;item.interval=item.step===1?MINUTE:10*MINUTE;item.dueAt=now+item.interval;item.dueTurn=state.turn+(item.step===1?4:8);
   }else{
    item.phase='review';item.interval=DAY;item.dueAt=now+DAY;item.dueTurn=0;
   }
  }
  // Extra practice is allowed but does not prematurely advance the review stage.
  item.lastAnswerAt=now;save();return {scheduled};
 }
 function label(kana,now=Date.now()){
  const item=state.items[kana];return !item?.attempts?'NEW KANA':isDue(item,now)?item.phase==='review'?'SCHEDULED REVIEW':'LEARNING REVIEW':'EXTRA PRACTICE';
 }
 function summary(pool,now=Date.now()){
  read();const items=pool.map(([kana])=>state.items[kana]).filter(item=>item?.attempts);
  return {studied:items.length,due:items.filter(item=>isDue(item,now)).length,learning:items.filter(item=>item.phase!=='review').length,nextAt:Math.min(...items.filter(item=>!isDue(item,now)).map(item=>item.dueAt))};
 }
 function info(pool,now=Date.now()){read();return pool.map(([kana,reading])=>{const item=state.items[kana];return {kana,reading,attempts:0,lastShownTurn:-1,dueAt:0,phase:'learning',...item,due:!!item&&isDue(item,now,state.turn+1)};});}
 function turn(){read();return state.turn;}
 return {select,record,label,summary,info,turn};
})();
