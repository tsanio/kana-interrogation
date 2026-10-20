'use strict';
const DailyStudy = (() => {
 const KEY='kana-room04-daily-v1', REQUIRED=5, CARD_RECALLS=8, CARD_DAYS=3;
 let state={version:1,today:null,mastery:{},settings:{goal:5}};
 const int=n=>Number.isSafeInteger(n)&&n>=0;
 function dayKey(now=Date.now()){const d=new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 function read(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.version!==1||!s.mastery||typeof s.mastery!=='object')return;const mastery={};for(const [k,m] of Object.entries(s.mastery)){if(m&&int(m.recalls)&&int(m.streak)&&Array.isArray(m.days)&&m.days.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d))&&typeof m.awarded==='boolean')mastery[k]={...m,days:[...new Set(m.days)].slice(-365)};}let today=null;const t=s.today;if(t&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&[25,46].includes(t.poolSize)&&Array.isArray(t.targets)&&t.targets.length>=1&&t.targets.length<=t.poolSize&&new Set(t.targets).size===t.targets.length&&t.targets.every(k=>typeof k==='string')&&t.progress&&int(t.attempts)&&int(t.correct)&&int(t.mistakes)&&t.correct+t.mistakes===t.attempts&&t.targets.every(k=>{const p=t.progress[k];return p&&int(p.recalls)&&int(p.streak)&&int(p.dueTurn)&&int(p.dueAt)&&typeof p.complete==='boolean';}))today=t;state={version:1,today,mastery,settings:{goal:int(s.settings?.goal)&&s.settings.goal>=1&&s.settings.goal<=46?s.settings.goal:5}};}catch{}}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
 read();
 function peek(now=Date.now()){read();return state.today?.date===dayKey(now)?structuredClone(state.today):null;}
 function begin(pool,now=Date.now()){
  read();if(state.today?.date===dayKey(now))return structuredClone(state.today);
  const infos=KanaPractice.info(pool,now);const rank=i=>i.attempts?(i.phase==='review'?2:0):1;
  infos.sort((a,b)=>rank(a)-rank(b)||(a.attempts&&b.attempts?a.dueAt-b.dueAt:0));
  const targets=infos.slice(0,Math.min(state.settings.goal,pool.length)).map(i=>i.kana),progress={};for(const k of targets)progress[k]={recalls:0,streak:0,dueTurn:0,dueAt:0,complete:false};
  state.today={date:dayKey(now),poolSize:pool.length,targets,progress,attempts:0,correct:0,mistakes:0,finished:false,goalSinceMix:0};save();return structuredClone(state.today);
 }
 function ready(p,turn,now){return !p.complete&&(p.dueTurn<=turn||p.dueAt<=now);}
 function complete(now=Date.now()){const t=peek(now);return !!t&&t.targets.every(k=>t.progress[k].complete);}
 function preferredGoal(){read();return state.settings.goal;}
 function setGoal(pool,count,now=Date.now()){
  if(!Number.isInteger(count)||count<1||count>pool.length)throw new Error(`Choose between 1 and ${pool.length} kana.`);
  begin(pool,now);read();const t=state.today,allowed=new Set(pool.map(([k])=>k));
  if(t.targets.some(k=>!allowed.has(k)))throw new Error('Keep the file that contains your current targets.');
  if(count<t.targets.length)t.targets=[...t.targets].sort((a,b)=>Number(t.progress[b].complete)-Number(t.progress[a].complete)).slice(0,count);
  else if(count>t.targets.length){
   const infos=KanaPractice.info(pool,now);const rank=i=>i.attempts?(i.phase==='review'?2:0):1;infos.sort((a,b)=>rank(a)-rank(b)||(a.attempts&&b.attempts?a.dueAt-b.dueAt:0));
   const extras=[...Object.keys(t.progress),...infos.map(i=>i.kana)];
   for(const k of extras){if(t.targets.length>=count)break;if(!allowed.has(k)||t.targets.includes(k))continue;t.targets.push(k);t.progress[k]||={recalls:0,streak:0,dueTurn:0,dueAt:0,complete:false};}
  }
  t.poolSize=pool.length;t.finished=t.targets.every(k=>t.progress[k].complete);state.settings.goal=count;save();return structuredClone(t);
 }
 function select(pool,now=Date.now()){
  const today=begin(pool,now);if(complete(now))return null;
  const turn=KanaPractice.turn()+1,infos=KanaPractice.info(pool,now).filter(i=>turn-i.lastShownTurn>1);
  const targets=infos.filter(i=>today.targets.includes(i.kana)),outside=infos.filter(i=>!today.targets.includes(i.kana));
  const due=outside.filter(i=>i.attempts>0&&i.due),readyTargets=targets.filter(i=>ready(today.progress[i.kana],turn,now));
  // Interleave a non-target prompt about every third question, or to fill a spacing gap.
  // These are actual questions from the rest of the file, not just wrong-choice labels.
  let candidates;
  if(outside.length&&((today.goalSinceMix||0)>=2||!readyTargets.length))candidates=due.length?due:outside;
  else if(readyTargets.length)candidates=readyTargets;
  else candidates=targets.length?targets:infos;
  const allowed=new Set(candidates.map(i=>i.kana)),chosen=KanaPractice.select(pool.filter(([k])=>allowed.has(k)),now);
  read();state.today.goalSinceMix=state.today.targets.includes(chosen[0])?(state.today.goalSinceMix||0)+1:0;save();return chosen;
 }
 function record(kana,good,scheduled,now=Date.now()){
  read();const t=state.today;if(!t||t.date!==dayKey(now)||t.finished)return {qualified:false};
  const p=t.progress[kana],turn=KanaPractice.turn(),qualified=!!scheduled||!!p&&ready(p,turn,now);
  t.attempts++;if(good)t.correct++;else t.mistakes++;
  if(p){
   if(!good){p.streak=0;p.complete=false;p.dueTurn=turn+3;p.dueAt=now+30000;}
   else if(qualified&&!p.complete){p.recalls++;p.streak++;p.complete=p.recalls>=REQUIRED&&p.streak>=3;const stage=Math.min(p.recalls-1,3);p.dueTurn=turn+[3,4,5,6][stage];p.dueAt=now+[30000,60000,180000,600000][stage];}
  }
  let m=state.mastery[kana];if(!m)m=state.mastery[kana]={recalls:0,streak:0,days:[],awarded:false};
  if(!good)m.streak=0;
  else if(qualified){m.recalls++;m.streak++;const date=dayKey(now);if(!m.days.includes(date))m.days.push(date);}
  t.finished=t.targets.every(k=>t.progress[k].complete);save();return {qualified,completed:!!p?.complete};
 }
 function readyCards(){read();return Object.entries(state.mastery).filter(([,m])=>!m.awarded&&m.recalls>=CARD_RECALLS&&m.days.length>=CARD_DAYS&&m.streak>=3).map(([k])=>k);}
 function claimCard(kana){read();const m=state.mastery[kana];if(!m||m.awarded||m.recalls<CARD_RECALLS||m.days.length<CARD_DAYS||m.streak<3)return false;m.awarded=true;save();return true;}
 function cardProgress(kana){read();const m=state.mastery[kana]||{recalls:0,streak:0,days:[]};return {recalls:m.recalls,days:m.days.length,streak:m.streak};}
 return {begin,peek,complete,select,record,readyCards,claimCard,cardProgress,dayKey,setGoal,preferredGoal};
})();
