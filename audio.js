'use strict';
// Original procedural game effects. Pronunciation uses bundled Japanese TTS clips.
const GameAudio = (() => {
 let context, enabled=true, activeNodes=new Set(), voice=null, playbackId=0;
 function getContext(){context ||= new (window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});return context;}
 function track(node){activeNodes.add(node);node.onended=()=>activeNodes.delete(node);return node;}
 function note(ctx,freq,offset,duration=.2,type='sine',volume=.07,endFreq=freq){
  const t=ctx.currentTime+offset,o=track(ctx.createOscillator()),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+duration+.01);
 }
 function slap(ctx){
  const t=ctx.currentTime+.09,duration=.19,buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.032));
  const n=track(ctx.createBufferSource()),filter=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=buffer;filter.type='highpass';filter.frequency.value=650;g.gain.value=.55;n.connect(filter).connect(g).connect(ctx.destination);n.start(t);note(ctx,155,.09,.16,'triangle',.2,43);
 }
 function groan(ctx){
  // A short voiced “augh”: falling pitch, breath noise, and three vowel formants.
  const t=ctx.currentTime+.22,d=.72,source=track(ctx.createOscillator()),amp=ctx.createGain();source.type='sawtooth';source.frequency.setValueAtTime(155,t);source.frequency.exponentialRampToValueAtTime(88,t+d);
  const vibrato=track(ctx.createOscillator()),depth=ctx.createGain();vibrato.frequency.value=28;depth.gain.value=6;vibrato.connect(depth).connect(source.frequency);vibrato.start(t);vibrato.stop(t+d);
  amp.gain.setValueAtTime(.001,t);amp.gain.linearRampToValueAtTime(.4,t+.07);amp.gain.exponentialRampToValueAtTime(.001,t+d);amp.connect(ctx.destination);
  [[650,3,1],[1080,5,.5],[2450,9,.2]].forEach(([f,q,level])=>{const filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='bandpass';filter.frequency.setValueAtTime(f,t);filter.frequency.linearRampToValueAtTime(f*.7,t+d);filter.Q.value=q;gain.gain.value=level;source.connect(filter).connect(gain).connect(amp);});source.start(t);source.stop(t+d);
 }
 function effect(kind){
  if(!enabled)return;try{const ctx=getContext();
   if(kind==='correct'){note(ctx,523,0,.13,'sine');note(ctx,784,.1,.2,'sine');}
   if(kind==='wrong'){note(ctx,185,0,.16,'triangle',.1,110);note(ctx,138,.075,.2,'triangle',.07,82);slap(ctx);groan(ctx);}
   if(kind==='memory'){[392,523,659,784].forEach((f,i)=>note(ctx,f,i*.12,.55,'sine',.045));}
   if(kind==='win'){[392,523,659,784,1047].forEach((f,i)=>note(ctx,f,i*.14,.35,'triangle',.06));[523,659,784].forEach(f=>note(ctx,f,.75,.9,'sine',.035));}
   if(kind==='lose'){[220,196,155,110].forEach((f,i)=>note(ctx,f,i*.24,.5,'triangle',.08,f*.8));note(ctx,55,.65,1,'sine',.13);}
  }catch{}
 }
 function stopVoice(){playbackId++;if(voice){voice.pause();voice.currentTime=0;voice=null;}}
 function stop(){activeNodes.forEach(n=>{try{n.stop();}catch{}});activeNodes.clear();stopVoice();}
 function setEnabled(value){enabled=value;if(!value)stop();else try{getContext();}catch{}}
 async function pronounce(reading){
  if(!enabled)return false;
  stopVoice();const id=playbackId;voice=new Audio(`audio/${reading}.mp3`);voice.volume=.85;
  try{await voice.play();return id===playbackId;}catch{if(id===playbackId)throw new Error('Pronunciation could not play. Try again.');return false;}
 }
 return {effect,setEnabled,pronounce,stopVoice,stop};
})();
