// Gesture-unlocked audio with audible transients and recovery after interruption.
(() => {
  'use strict';
  class Sound {
    constructor(){this.enabled=true;this.volume=.8;this.context=null;this.master=null;this.active=new Set();this.resumePromise=null;this.pending=null;this.error='';this.noiseBuffer=null;}
    unlock(){
      if(!this.enabled)return Promise.resolve(false);
      try{
        if(!this.context||this.context.state==='closed'){
          const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error('このブラウザでは音声を利用できません');
          this.context=new Context();this.master=this.context.createGain();
          const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=16;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.18;
          this.master.connect(limiter);limiter.connect(this.context.destination);this.noiseBuffer=null;
          this.context.onstatechange=()=>this.status();
        }
        this.master.gain.value=this.volume;this.error='';
        if(this.context.state==='running'){this.status();return Promise.resolve(true);}
        if(!this.resumePromise){
          this.resumePromise=this.context.resume().then(()=>{
            const ready=this.context.state==='running';this.status();
            if(ready&&this.enabled&&this.pending){const type=this.pending;this.pending=null;this.play(type);}
            return ready;
          }).catch(()=>{this.error='音声を開始できません。「音を出す」を押してください';this.status();return false;}).finally(()=>{this.resumePromise=null;});
        }
        this.status();return this.resumePromise;
      }catch(error){this.error=error.message;this.status();return Promise.resolve(false);}
    }
    status(){
      const ready=this.enabled&&this.context?.state==='running',state=this.enabled?(ready?'ON':'TAP'):'OFF',button=document.getElementById('sound');
      button?.setAttribute('aria-label','音量・サウンド設定。現在 '+state);if(button)button.title='音量・サウンド設定';
      document.querySelector('.sound-slash')?.classList.toggle('hidden',this.enabled);
      const label=document.getElementById('sound-state');if(label)label.textContent=state;
      const output=document.getElementById('sound-feedback');if(output)output.textContent=this.error||(ready?'音声ON · 音量 '+Math.round(this.volume*100)+'%':this.enabled?'音声は再開待ちです。「音を出す」を押してください':'消音中です。「音を出す」で再開できます');
    }
    enable(){this.enabled=true;if(this.volume===0)this.volume=.8;return this.unlock();}
    mute(){this.enabled=false;this.pending=null;this.stop();if(this.master)this.master.gain.value=0;this.status();}
    toggle(){if(this.enabled&&this.context?.state==='running')this.mute();else this.enable();}
    setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));if(this.volume===0)this.mute();else{this.enabled=true;if(this.master)this.master.gain.value=this.volume;this.unlock();}this.status();}
    stop(){this.pending=null;for(const node of this.active){try{node.stop();}catch{}}this.active.clear();}
    track(source,nodes){this.active.add(source);source.onended=()=>{this.active.delete(source);source.disconnect();for(const node of nodes)node.disconnect();};}
    envelope(g,t,duration,volume){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.003);g.gain.setValueAtTime(volume*.8,t+Math.min(.025,duration*.3));g.gain.exponentialRampToValueAtTime(.0001,t+duration);}
    note(frequency,duration,volume=.16,type='sine',delay=0,endFrequency=frequency){
      if(!this.enabled||this.context?.state!=='running')return;
      const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),t+duration);this.envelope(g,t,duration,volume);o.connect(g);g.connect(this.master);this.track(o,[g]);o.start(t);o.stop(t+duration+.02);
    }
    noise(duration,volume,cutoff){
      const c=this.context;if(!this.noiseBuffer){this.noiseBuffer=c.createBuffer(1,Math.ceil(c.sampleRate*.7),c.sampleRate);const data=this.noiseBuffer.getChannelData(0);let seed=431;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741823.5-1;}}
      const source=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime;source.buffer=this.noiseBuffer;filter.type='highpass';filter.frequency.value=cutoff;this.envelope(g,t,duration,volume);source.connect(filter);filter.connect(g);g.connect(this.master);this.track(source,[filter,g]);source.start(t);source.stop(t+duration+.02);
    }
    play(type){
      if(!this.enabled)return false;
      if(this.context?.state!=='running'){this.pending=type;this.unlock();return false;}
      if(type==='shot'){this.noise(.2,.5,850);this.note(220,.13,.32,'triangle',0,70);}
      else if(type==='smg'){this.noise(.075,.43,1900);this.note(380,.065,.16,'square',0,140);}
      else if(type==='shotgun'){this.noise(.48,.75,180);this.note(125,.32,.42,'triangle',0,45);this.note(700,.05,.22,'square');}
      else if(type==='rifle'){this.noise(.23,.64,1400);this.note(650,.1,.23,'sawtooth',0,90);}
      else if(type==='launcher'){this.note(190,.23,.5,'triangle',0,55);this.noise(.2,.28,400);}
      else if(type==='pulse'){this.note(1800,.2,.3,'sine',0,350);this.note(2300,.12,.13,'triangle',0,650);}
      else if(type==='reward'){for(let i=0;i<4;i++)this.note([330,440,554,660][i],.35,.22,'triangle',i*.13);}
      else if(type==='test'){this.note(660,.3,.35,'sine');this.note(880,.35,.32,'sine',.32);}
      else if(type==='hit')this.note(620,.12,.2,'triangle',0,180);
      else if(type==='hurt'){this.note(140,.5,.32,'sawtooth',0,50);this.noise(.25,.25,300);}
      else if(type==='reload'){this.noise(.055,.28,2600);this.note(1100,.08,.2,'square',.22);}
      else if(type==='warning'){this.note(580,.18,.22,'triangle');this.note(420,.2,.18,'triangle',.22);}
      else if(type==='blast'){this.noise(.65,.65,100);this.note(100,.55,.38,'triangle',0,28);}
      else if(type==='ambience'){this.note(110,1.8,.022,'sine');this.note(165,1.4,.012,'triangle',.2);}
      else {for(let i=0;i<3;i++)this.note([330,440,550][i],.28,.2,'sine',i*.16);}
      return true;
    }
  }
  window.DSSound=Sound;
})();