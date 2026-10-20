'use strict';
const KANA = [
 ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o'],
 ['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko'],
 ['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so'],
 ['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to'],
 ['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no'],
 ['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho'],
 ['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo'],
 ['や','ya'],['ゆ','yu'],['よ','yo'],
 ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],
 ['わ','wa'],['を','wo'],['ん','n']
];
const $ = id => document.getElementById(id);
const shuffle = items => { const a = [...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; };
let pool=[], current=null, correct=0, mistakes=0, round=0, phase='briefing', missed=new Map(), sound=true, startedAt=0, clockInterval, slapTimeout;
function selectedPool(){const day=DailyStudy.peek();return (day?day.poolSize===46:$('difficulty').value==='full')?[...KANA]:KANA.slice(0,25);}
function syncDay(){const day=DailyStudy.peek();if(day){correct=day.correct;mistakes=day.mistakes;$('difficulty').value=day.poolSize===46?'full':'starter';$('difficulty').disabled=true;}else{$('difficulty').disabled=false;correct=0;mistakes=0;}return day;}
function updatePortrait(){
 const damage=Math.min(4,mistakes);$('subject').dataset.damage=damage;
 const states=['COMPOSED','STINGING CHEEK','BRUISED','SHAKEN','WORN OUT'];
 const descriptions=['No injuries.','Red slap marks on your left cheek.','A bruised eye and red cheek.','Both cheeks marked, with a swollen lip.','Bruises, red cheeks, and a bandage.'];
 $('injury-status').textContent=states[damage];$('subject').setAttribute('aria-label',`Your portrait. ${descriptions[damage]} Practice continues.`);
 $('player-mouth').setAttribute('d',damage>=3?'M49 89q11-10 22 0':'M49 87q11-3 22 0');
}
function updateStats(){
 const day=syncDay(),completed=day?day.targets.filter(k=>day.progress[k].complete).length:0,goal=day?.targets.length||DailyStudy.preferredGoal();
 $('score').textContent=String(completed).padStart(2,'0');$('goal-total').textContent=` / ${String(goal).padStart(2,'0')}`;$('goal-copy').textContent=goal;$('progress').style.width=`${completed/goal*100}%`;$('mistakes-count').textContent=mistakes;
 $('round').textContent=phase==='result'?'TODAY’S PRACTICE COMPLETE':phase==='briefing'?'DAILY TRAINING':`QUESTION ${String(round).padStart(2,'0')}`;
 updatePortrait();updateStudySummary();
 const chips=day?day.targets.map(k=>{const p=day.progress[k],b=document.createElement('div');b.className='target-chip'+(p.complete?' complete':'')+(current?.[0]===k?' active':'');b.setAttribute('aria-label',`${k}: ${p.recalls} spaced correct recalls today, ${p.complete?'complete':'learning'}`);const character=document.createElement('b');character.lang='ja';character.textContent=k;const progress=document.createElement('span');progress.textContent=p.complete?'✓ learned':`${Math.min(p.recalls,5)}/5 recalls`;if(!p.complete&&p.recalls>=5)progress.textContent=`${p.streak}/3 recovery`;b.append(character,progress);return b;}):[];
 $('daily-targets').replaceChildren(...chips);
 if(current&&day){const p=day.progress[current[0]],m=DailyStudy.cardProgress(current[0]);$('streak').textContent=p?`${current[0]} · ${p.recalls} spaced recalls today`:'MIXED KANA · OUTSIDE TODAY’S GOAL';$('streak-goal').textContent=recovered>=4?'All story cards recovered':`Card: ${Math.min(m.recalls,8)}/8 recalls · ${Math.min(m.days,3)}/3 days`;}else{$('streak').textContent='SAME KANA · SPACED RECALL';$('streak-goal').textContent='Card requires 8 recalls over 3 days';}
 $('start').textContent=day?.finished?"View today's results":day?"Resume today's goal":"Start today's goal";
}
function updateStudySummary(){
 const s=KanaPractice.summary(pool.length?pool:selectedPool());let next='';
 if(Number.isFinite(s.nextAt)){const minutes=Math.max(1,Math.ceil((s.nextAt-Date.now())/60000));next=minutes<60?` Next timed review in about ${minutes} min.`:minutes<1440?` Next timed review in about ${Math.ceil(minutes/60)} hours.`:` Next timed review in about ${Math.ceil(minutes/1440)} days.`;}
 $('study-summary').textContent=`${s.studied} kana studied · ${s.due} due for review.${next}`;
}
function tick(){const sec=Math.floor((Date.now()-startedAt)/1000);$('rec-time').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function start(){
 const existing=DailyStudy.peek();if((!existing||Number($('goal-count').value)!==existing.targets.length)&&!applyGoal())return;
 clearInterval(clockInterval);clearTimeout(slapTimeout);GameAudio.stop();GameAudio.setEnabled(sound);document.querySelector('.room').classList.remove('slapping','won','defeated');$('ending-banner').hidden=true;$('subject').classList.remove('just-hit');
 pool=selectedPool();const day=DailyStudy.begin(pool);current=null;correct=day.correct;mistakes=day.mistakes;round=day.attempts;missed=new Map();phase='answering';
 $('briefing').hidden=true;$('result').hidden=true;$('play').hidden=false;startedAt=Date.now();tick();clockInterval=setInterval(tick,1000);updateStats();nextQuestion();
}
function nextQuestion(){
 GameAudio.stopVoice();
 if(DailyStudy.complete()){finish();return;}
 const day=DailyStudy.begin(pool);if(day.poolSize!==pool.length)pool=selectedPool();phase='answering';round=day.attempts+1;current=DailyStudy.select(pool);
 if(!current){finish();return;}
 updateStats();$('kana').textContent=current[0];$('question-label').textContent=day.targets.includes(current[0])?'TODAY’S KANA · RECALL PRACTICE':`MIXED PRACTICE · ${KanaPractice.label(current[0])}`;$('feedback').textContent='';$('feedback').className='feedback';$('next').hidden=true;
 const options=shuffle([current,...shuffle(pool.filter(k=>k[0]!==current[0])).slice(0,2)]);
 $('choices').replaceChildren(...options.map((k,i)=>{const b=document.createElement('button');b.className='choice';b.dataset.reading=k[1];b.setAttribute('aria-label',`Option ${i+1}: ${k[1]}`);const small=document.createElement('small');small.textContent=i+1;b.append(small,document.createTextNode(k[1]));b.onclick=()=>answer(k[1],b);return b;}));
 $('dialogue').textContent=round===1?`“${day.targets.length} target characters today. Expect others mixed in.”`:mistakes?'“We keep going. Focus on remembering.”':'“Again, after a little space. Make it stick.”';$('choices').firstElementChild.focus({preventScroll:true});
}
function answer(reading,button){
 if(phase!=='answering')return;phase='feedback';const good=reading===current[1],review=KanaPractice.record(current[0],good),credit=DailyStudy.record(current[0],good,review?.scheduled);
 [...$('choices').children].forEach(b=>{b.disabled=true;b.classList.add(b.dataset.reading===current[1]?'correct':b===button?'wrong':'dim');});
 if(good){$('feedback').textContent=`Correct. ${current[0]} is “${current[1]}”. ${credit.qualified?'Spaced recall recorded.':'Extra practice — the next spaced recall is still ahead.'}`;$('dialogue').textContent=credit.completed?'“That character is sticking. Keep building the others.”':'“Good. You’ll need to remember it again.”';}
 else{missed.set(current[0],current[1]);$('feedback').textContent=`${current[0]} is “${current[1]}”. You’ll review it shortly. Practice continues.`;$('feedback').classList.add('bad');$('dialogue').textContent='“Wrong. We keep practicing until you remember.”';const room=document.querySelector('.room');room.classList.remove('slapping');void room.offsetWidth;room.classList.add('slapping');clearTimeout(slapTimeout);$('subject').classList.remove('just-hit');void $('subject').offsetWidth;$('subject').classList.add('just-hit');slapTimeout=setTimeout(()=>{room.classList.remove('slapping');$('subject').classList.remove('just-hit');},950);}
 GameAudio.stopVoice();GameAudio.effect(good?'correct':'wrong');if(good&&sound){const answered=current;GameAudio.pronounce(answered[1]).catch(()=>{if(phase==='feedback'&&current===answered)$('feedback').textContent+=' Audio unavailable.';});}
 updateStats();$('next').hidden=false;$('next').innerHTML=DailyStudy.complete()?"Finish today's goal <span>→</span>":'Next question <span>→</span>';$('next').focus({preventScroll:true});
 const earned=DailyStudy.readyCards()[0];if(recovered<4&&earned&&DailyStudy.claimCard(earned)&&recoverMemory(earned)){GameAudio.effect('memory');updateStats();}
}
function finish(){
 if(!DailyStudy.complete())return;phase='result';clearInterval(clockInterval);clearTimeout(slapTimeout);document.querySelector('.room').classList.remove('slapping');$('subject').classList.remove('just-hit');GameAudio.stopVoice();$('play').hidden=true;$('result').hidden=false;GameAudio.effect('win');document.querySelector('.room').classList.add('won');$('ending-banner').hidden=false;$('ending-banner').textContent='DAILY GOAL COMPLETE';
 const day=syncDay();$('round').textContent='TODAY’S PRACTICE COMPLETE';$('result-label').textContent=`${day.targets.length} / ${day.targets.length} HIRAGANA · DAILY GOAL COMPLETE`;$('result-title').textContent='Your goal, stronger memories.';$('more-goal').hidden=day.targets.length>=46;
 $('result-copy').textContent=`${day.attempts} answers today · ${day.correct} correct · ${day.mistakes} mistakes. Each of your ${day.targets.length} target kana passed repeated spaced recall, mixed with other characters. You can raise the goal to study more today, or return tomorrow for scheduled reviews.`;
 $('story-result').textContent=recovered===4?'All four story cards are recovered. Keep reviewing across the coming days to retain the kana.':`${recovered}/4 story cards recovered. A new card needs 8 spaced correct recalls of the same kana across 3 different days, including 3 consecutive correct recalls of that kana. Your progress is saved.`;
 $('dialogue').textContent='“Goal reached. Raise it if you want to keep going. I’ll be here.”';$('missed').replaceChildren();for(const k of day.targets){const row=document.createElement('div');row.className='missed-item';const b=document.createElement('b');b.textContent=k;const span=document.createElement('span');span.textContent=`${day.progress[k].recalls} spaced recalls · learned today`;row.append(b,span);$('missed').append(row);}updateStats();$('restart').focus({preventScroll:true});
}
function pause(){phase='briefing';clearInterval(clockInterval);GameAudio.stop();$('play').hidden=true;$('result').hidden=true;$('briefing').hidden=false;current=null;$('ending-banner').hidden=true;document.querySelector('.room').classList.remove('won');$('dialogue').textContent='“Your progress is on file. Pick up where you left off.”';updateStats();}
function applyGoal(event){
 event?.preventDefault();if(!$('goal-count').reportValidity())return false;const count=Number($('goal-count').value);
 const candidates=count>25||selectedPool().length===46?[...KANA]:KANA.slice(0,25);
 const day=DailyStudy.setGoal(candidates,count);pool=candidates;$('goal-count').value=count;updateStats();$('goal-message').textContent=`Goal saved: ${count} kana. ${day.targets.filter(k=>day.progress[k].complete).length} already complete. Other kana will be mixed in.`;return true;
}
$('goal-form').addEventListener('submit',applyGoal);$('more-goal').onclick=()=>{pause();$('goal-count').value=Math.min(46,(DailyStudy.peek()?.targets.length||5)+5);$('goal-count').focus();$('goal-count').scrollIntoView({block:'center',behavior:'smooth'});};
$('start').onclick=start;$('next').onclick=nextQuestion;$('pause').onclick=pause;$('restart').onclick=()=>$('file').showModal();$('change').onclick=pause;
$('sound').onclick=()=>{sound=!sound;GameAudio.setEnabled(sound);$('sound').textContent=`Sound: ${sound?'on':'off'}`;$('sound').setAttribute('aria-pressed',String(sound));if(sound)GameAudio.effect('correct');};
$('reference').onclick=()=>$('file').showModal();$('close-file').onclick=()=>$('file').close();$('file').addEventListener('click',e=>{if(e.target===$('file')){const r=$('file').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('file').close();}});
$('kana-grid').replaceChildren(...KANA.map(([kana,reading])=>{const cell=document.createElement('div');cell.className='kana-cell';const b=document.createElement('b');b.lang='ja';b.textContent=kana;const s=document.createElement('span');s.textContent=reading;cell.append(b,s);return cell;}));
 document.addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||$('file').open||$('memory-modal').open||/SELECT|INPUT|TEXTAREA/.test(e.target.tagName))return;if(phase==='answering'&&['1','2','3'].includes(e.key)){e.preventDefault();$('choices').children[Number(e.key)-1].click();}else if(phase==='feedback'&&e.code==='Space'){e.preventDefault();nextQuestion();}});
let displayedDate=DailyStudy.dayKey();
function refreshDailyView(){const date=DailyStudy.dayKey();if(date!==displayedDate){displayedDate=date;pool=[];pause();$('goal-count').value=DailyStudy.preferredGoal();}else updateStats();}
$('difficulty').addEventListener('change',()=>{pool=[];updateStats();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDailyView();});setInterval(refreshDailyView,30000);$('goal-count').value=DailyStudy.peek()?.targets.length||DailyStudy.preferredGoal();updateStats();
