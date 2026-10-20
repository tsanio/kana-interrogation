'use strict';
const MEMORIES = [
 {title:'The last train',symbol:'切符',tag:'01 / THE TICKET',text:'Rain on the platform. A blue ticket in your coat: North Station, 22:14. You weren’t running from the archive. You were on your way to meet someone.',clue:'You remember where you were going.'},
 {title:'A voice in the rain',symbol:'声',tag:'02 / THE CALL',text:'“Bring the original, not a copy.” Aya’s voice comes back to you. Your sister had found a ledger proving that station funds were being stolen. She asked you, the archive’s interpreter, to deliver it to an investigator.',clue:'You were carrying evidence, not stealing it.'},
 {title:'Locker number four',symbol:'鍵',tag:'03 / THE KEY',text:'A small brass key. Locker 04, beside the north exit. You hid the ledger there when someone started following you. Aya already had the duplicate key. The original evidence is still safe.',clue:'Locker 04 holds the ledger that can verify your story.'},
 {title:'Your own signature',symbol:'記録',tag:'04 / THE RECEIPT',text:'You can see it clearly now: the archive’s signed transfer receipt, tucked into the blue ticket. It authorizes you to deliver the ledger. The station camera can confirm the handover. You tell Kuroda where to look. Your story finally has proof.',clue:'The receipt, the camera, and the ledger clear your name.'}
];
const MEMORY_KEY='kana-room04-memories-v1';
function loadMemories(){try{const n=JSON.parse(localStorage.getItem(MEMORY_KEY));return Number.isInteger(n)&&n>=0&&n<=MEMORIES.length?n:0;}catch{return 0;}}
let recovered=loadMemories();
function saveMemories(){try{localStorage.setItem(MEMORY_KEY,JSON.stringify(recovered));}catch{}}
function renderMemories(){
 document.getElementById('memory-count').textContent=`${recovered} / 4 RECOVERED`;
 document.getElementById('memory-cards').replaceChildren(...MEMORIES.map((m,i)=>{const b=document.createElement('button');b.className='memory-card'+(i<recovered?' recovered':'');b.disabled=i>=recovered;const tag=document.createElement('small');tag.textContent=i<recovered?m.tag:`0${i+1} / MEMORY MISSING`;const symbol=document.createElement('span');symbol.className='card-symbol';symbol.lang='ja';symbol.textContent=i<recovered?m.symbol:'?';const title=document.createElement('b');title.textContent=i<recovered?m.title:'A gap in your memory';const sub=document.createElement('p');sub.textContent=i<recovered?'Read recovered memory ↗':'Same kana · 8 recalls · 3 days';b.append(tag,symbol,title,sub);b.onclick=()=>showMemory(i,false);return b;}));
}
function showMemory(index,isNew,kana){
 const m=MEMORIES[index];document.getElementById('memory-kind').textContent=isNew?`${kana} · A LASTING MEMORY RECOVERED`:'YOUR RECOVERED MEMORY';document.getElementById('memory-symbol').textContent=m.symbol;document.getElementById('memory-number').textContent=m.tag;document.getElementById('memory-title').textContent=m.title;document.getElementById('memory-text').textContent=m.text;document.getElementById('memory-clue').textContent=m.clue;document.getElementById('memory-modal').showModal();
}
function recoverMemory(kana){if(recovered>=MEMORIES.length)return false;const index=recovered++;saveMemories();renderMemories();showMemory(index,true,kana);return true;}
document.getElementById('close-memory').onclick=()=>document.getElementById('memory-modal').close();
renderMemories();
