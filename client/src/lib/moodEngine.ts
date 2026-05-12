// Mood v5 — Cruising / Locked In / Drifting / Restless
// Now with per-mood accent colors for HUD + boosted saturation

export type MoodType = 'cruising' | 'locked' | 'drift' | 'restless';

export const MOOD_LABELS: Record<MoodType, string> = {
  cruising: 'Cruising', locked: 'Locked In', drift: 'Drifting', restless: 'Restless',
};

// Per-mood HUD accent colors (CSS color strings)
export const MOOD_ACCENT: Record<MoodType, { color: string; glow: string; bar: string; dim: string }> = {
  cruising: { color: '#2dd4bf', glow: 'rgba(45,212,191,0.15)', bar: 'linear-gradient(90deg,rgba(45,212,191,0.3),rgba(45,212,191,0.8))', dim: 'rgba(45,212,191,0.5)' },
  locked:   { color: '#93b4f5', glow: 'rgba(147,180,245,0.12)', bar: 'linear-gradient(90deg,rgba(147,180,245,0.3),rgba(147,180,245,0.8))', dim: 'rgba(147,180,245,0.5)' },
  drift:    { color: '#e09dd8', glow: 'rgba(224,157,216,0.12)', bar: 'linear-gradient(90deg,rgba(224,157,216,0.3),rgba(224,157,216,0.8))', dim: 'rgba(224,157,216,0.5)' },
  restless: { color: '#f0a050', glow: 'rgba(240,160,80,0.15)', bar: 'linear-gradient(90deg,rgba(240,160,80,0.3),rgba(240,160,80,0.8))', dim: 'rgba(240,160,80,0.5)' },
};

export interface VibeInputs { tension: number; focus: number; energy: number; environment: number; }

export interface MoodState {
  mood: MoodType; confidence: number; vibes: VibeInputs;
  raw: { typingSpeed: number; errorRate: number; mouseJitter: number; directionEntropy: number;
         clickRate: number; idleTime: number; keystrokeRhythm: number; tensionTrend: number; };
}

export interface OrganismConfig {
  cohesion: number; speed: number; turbulence: number; orbitalStrength: number; repelRadius: number;
  hueA: number; hueB: number; saturation: number; brightness: number; warmth: number;
  pulseRate: number; density: number;
  focusBrightness: number; bokehDimming: number; trailAlpha: number;
}

export const MOOD_CONFIGS: Record<MoodType, OrganismConfig> = {
  cruising: {
    cohesion: 0.55, speed: 0.7, turbulence: 0.08, orbitalStrength: 0.001, repelRadius: 0.08,
    hueA: 170, hueB: 190, saturation: 85, brightness: 85, warmth: 0,
    pulseRate: 1.2, density: 0.55, focusBrightness: 1.1, bokehDimming: 0.12, trailAlpha: 0.12,
  },
  locked: {
    cohesion: 0.98, speed: 0.03, turbulence: 0.01, orbitalStrength: 0.00005, repelRadius: 0.02,
    hueA: 215, hueB: 240, saturation: 45, brightness: 95, warmth: 0,
    pulseRate: 0.3, density: 0.95, focusBrightness: 1.3, bokehDimming: 0.06, trailAlpha: 0.06,
  },
  drift: {
    cohesion: 0.25, speed: 0.04, turbulence: 0.02, orbitalStrength: 0.0001, repelRadius: 0.12,
    hueA: 295, hueB: 330, saturation: 55, brightness: 60, warmth: 0.15,
    pulseRate: 0.2, density: 0.25, focusBrightness: 0.8, bokehDimming: 0.2, trailAlpha: 0.08,
  },
  restless: {
    cohesion: 0.08, speed: 1.0, turbulence: 0.7, orbitalStrength: 0.00002, repelRadius: 0.2,
    hueA: 20, hueB: 38, saturation: 72, brightness: 72, warmth: 0.95,
    pulseRate: 2.2, density: 0.12, focusBrightness: 1.0, bokehDimming: 0.25, trailAlpha: 0.18,
  },
};

export const EQ_LABELS = ['60', '170', '310', '600', '1K', '3K', '6K', '12K'];
export const MOOD_EQ: Record<MoodType, number[]> = {
  cruising: [-1,  0,  1,  2,  2,  1,  0, -1],
  locked:   [-2, -1,  1,  3,  3,  1, -1, -2],
  drift:    [ 0,  1,  2,  1,  2,  3,  3,  2],
  restless: [-2, -1,  0, -1, -1,  0,  1,  2],
};

const WINDOW_MS = 10_000;

interface RawEvent { type: 'key'|'backspace'|'mouse'|'click'|'scroll'; timestamp: number; data?: { dx?: number; dy?: number }; }
interface TrendSample { t: number; tension: number; }

class MoodEngine {
  private events: RawEvent[] = [];
  private lastMousePos = { x: 0, y: 0 };
  private lastInputTime = Date.now();
  private keyTimestamps: number[] = [];
  private trendSamples: TrendSample[] = [];
  private listeners: ((s: MoodState) => void)[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentMood: MoodState;
  private smoothVibes: VibeInputs = { tension: 0, focus: 0, energy: 0, environment: 0.5 };

  constructor() {
    this.currentMood = { mood: 'drift', confidence: 0.3,
      vibes: { tension: 0, focus: 0, energy: 0, environment: this.getEnv() },
      raw: { typingSpeed: 0, errorRate: 0, mouseJitter: 0, directionEntropy: 0, clickRate: 0, idleTime: 0, keystrokeRhythm: 0, tensionTrend: 0 } };
  }

  start() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('mousemove', this.onMouse);
    window.addEventListener('click', this.onClick);
    window.addEventListener('wheel', this.onScroll);
    this.intervalId = setInterval(() => { this.prune(); this.analyze(); }, 300);
  }
  stop() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('mousemove', this.onMouse);
    window.removeEventListener('click', this.onClick);
    window.removeEventListener('wheel', this.onScroll);
    if (this.intervalId) clearInterval(this.intervalId);
  }
  onMoodChange(cb: (s: MoodState) => void) { this.listeners.push(cb); return () => { this.listeners = this.listeners.filter(l => l !== cb); }; }
  getMood(): MoodState { return this.currentMood; }
  setMood(mood: MoodType) { this.currentMood = { ...this.currentMood, mood, confidence: 1 }; this.notify(); }

  private getEnv(): number { const h = new Date().getHours(); if (h<6||h>22) return 0.1; if (h<9) return 0.3+(h-6)*0.1; if (h<17) return 0.7+Math.sin((h-9)*Math.PI/8)*0.3; return Math.max(0.2,0.7-(h-17)*0.1); }
  private onKey = (e: KeyboardEvent) => { this.lastInputTime = Date.now(); if (e.key==='Backspace'||e.key==='Delete') this.events.push({type:'backspace',timestamp:Date.now()}); else if (e.key.length===1){this.events.push({type:'key',timestamp:Date.now()});this.keyTimestamps.push(Date.now());} };
  private onMouse = (e: MouseEvent) => { this.lastInputTime = Date.now(); this.events.push({type:'mouse',timestamp:Date.now(),data:{dx:e.clientX-this.lastMousePos.x,dy:e.clientY-this.lastMousePos.y}}); this.lastMousePos={x:e.clientX,y:e.clientY}; };
  private onClick = () => { this.lastInputTime = Date.now(); this.events.push({type:'click',timestamp:Date.now()}); };
  private onScroll = () => { this.lastInputTime = Date.now(); this.events.push({type:'scroll',timestamp:Date.now()}); };

  private prune() { const c=Date.now()-WINDOW_MS; this.events=this.events.filter(e=>e.timestamp>c); this.keyTimestamps=this.keyTimestamps.filter(t=>t>c); this.trendSamples=this.trendSamples.filter(s=>s.t>Date.now()-60000); }

  private analyze() {
    const now=Date.now(),ws=WINDOW_MS/1000;
    const keys=this.events.filter(e=>e.type==='key'), bksp=this.events.filter(e=>e.type==='backspace');
    const mice=this.events.filter(e=>e.type==='mouse'), clicks=this.events.filter(e=>e.type==='click');
    const typingSpeed=(keys.length/ws)*60, total=keys.length+bksp.length, errorRate=total>0?bksp.length/total:0;
    const speeds:number[]=[]; for(const ev of mice) if(ev.data?.dx!==undefined) speeds.push(Math.sqrt(ev.data.dx!**2+ev.data.dy!**2));
    let mouseJitter=0; if(speeds.length>2){const m=speeds.reduce((a,b)=>a+b,0)/speeds.length;mouseJitter=Math.min(1,Math.sqrt(speeds.reduce((a,b)=>a+(b-m)**2,0)/speeds.length)/25);}
    let directionEntropy=0; if(mice.length>3){let ac=0;for(let i=1;i<mice.length;i++){let d=Math.abs(Math.atan2(mice[i].data!.dy!,mice[i].data!.dx!)-Math.atan2(mice[i-1].data!.dy!,mice[i-1].data!.dx!));if(d>Math.PI)d=2*Math.PI-d;if(d>Math.PI/3)ac++;}directionEntropy=Math.min(1,ac/(mice.length*0.4));}
    let keystrokeRhythm=0; if(this.keyTimestamps.length>4){const iv:number[]=[];for(let i=1;i<this.keyTimestamps.length;i++)iv.push(this.keyTimestamps[i]-this.keyTimestamps[i-1]);const m=iv.reduce((a,b)=>a+b,0)/iv.length;if(m>0)keystrokeRhythm=Math.max(0,Math.min(1,1-Math.sqrt(iv.reduce((a,b)=>a+(b-m)**2,0)/iv.length)/m/1.5));}
    const clickRate=(clicks.length/ws)*60, idleTime=(now-this.lastInputTime)/1000;
    const rawT=Math.min(1,mouseJitter*0.35+directionEntropy*0.25+errorRate*0.2+(clickRate>30?0.15:clickRate/200));
    const rawF=Math.min(1,Math.max(0,(keystrokeRhythm>0.5?0.35:keystrokeRhythm*0.5)+(typingSpeed>20?0.25:typingSpeed/80)+(errorRate<0.08?0.2:Math.max(0,0.2-errorRate))+(mouseJitter<0.2?0.15:0)+(idleTime<2?0.05:0)));
    const rawE=Math.min(1,(typingSpeed/200)*0.4+(clickRate/60)*0.2+(speeds.length>0?Math.min(1,speeds.reduce((a,b)=>a+b,0)/speeds.length/30)*0.3:0)+(idleTime<1?0.1:0));
    const a=0.12; this.smoothVibes={tension:this.smoothVibes.tension+(rawT-this.smoothVibes.tension)*a,focus:this.smoothVibes.focus+(rawF-this.smoothVibes.focus)*a,energy:this.smoothVibes.energy+(rawE-this.smoothVibes.energy)*a,environment:this.getEnv()};
    this.trendSamples.push({t:now,tension:this.smoothVibes.tension});
    let tensionTrend=0; if(this.trendSamples.length>5){const s=this.trendSamples,n=s.length,t0=s[0].t;let sx=0,sy=0,sxy=0,sx2=0;for(const p of s){const x=(p.t-t0)/1000;sx+=x;sy+=p.tension;sxy+=x*p.tension;sx2+=x*x;}tensionTrend=Math.max(-1,Math.min(1,((n*sxy-sx*sy)/(n*sx2-sx*sx))*30));}
    const v=this.smoothVibes; let mood:MoodType='drift',confidence=0.3;
    if(v.tension>0.5){mood='restless';confidence=Math.min(1,0.4+v.tension*0.6);}
    else if(v.focus>0.6&&v.tension<0.2&&v.energy>0.3){mood='cruising';confidence=Math.min(1,0.4+v.focus*0.6);}
    else if(v.focus>0.3&&v.tension<0.35&&v.energy>0.15){mood='locked';confidence=Math.min(1,0.3+v.focus*0.5);}
    else if(v.energy<0.1||idleTime>5){mood='drift';confidence=Math.min(1,0.3+(1-v.energy)*0.4);}
    const prev=this.currentMood.mood;
    this.currentMood={mood,confidence,vibes:v,raw:{typingSpeed,errorRate,mouseJitter,directionEntropy,clickRate,idleTime,keystrokeRhythm,tensionTrend}};
    if(mood!==prev)this.notify();
  }
  private notify(){for(const cb of this.listeners)cb(this.currentMood);}
}

export const moodEngine = new MoodEngine();
