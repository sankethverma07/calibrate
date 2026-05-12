import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LivingOrganism from '../components/LivingOrganism';
import {
  MoodType, MoodState, MOOD_EQ, EQ_LABELS, MOOD_LABELS, MOOD_ACCENT, moodEngine,
} from '../lib/moodEngine';
import { getCalendarEvents, CalendarEvent, getCurrentEvent, getNextEvent, formatTime } from '../lib/calendarEngine';
import {
  Radio, Activity, Eye, Sun, Zap, Calendar, Clock, ChevronRight,
  Keyboard, Play, Pause, SkipBack, SkipForward, Volume2, Plus, Music, X,
} from 'lucide-react';

const ALL_MOODS: MoodType[] = ['cruising', 'locked', 'drift', 'restless'];

const TRACKS = [
  { title: 'Weightless', artist: 'Marconi Union', duration: 480, color: '#7c6fc4' },
  { title: 'Clair de Lune', artist: 'Debussy', duration: 312, color: '#5c8db8' },
  { title: 'Midnight City', artist: 'M83', duration: 243, color: '#c46f8a' },
  { title: 'Intro', artist: 'The xx', duration: 128, color: '#8a8a6f' },
];

export default function Home() {
  const [moodState, setMoodState] = useState<MoodState>({
    mood: 'drift', confidence: 0.3,
    vibes: { tension: 0, focus: 0, energy: 0, environment: 0.5 },
    raw: { typingSpeed: 0, errorRate: 0, mouseJitter: 0, directionEntropy: 0,
           clickRate: 0, idleTime: 0, keystrokeRhythm: 0, tensionTrend: 0 },
  });
  const [eqBands, setEqBands] = useState<number[]>(MOOD_EQ.drift);
  const [senseMode, setSenseMode] = useState(true);
  const [source, setSource] = useState<'sense' | 'manual'>('sense');
  const [events, setEvents] = useState<CalendarEvent[]>(getCalendarEvents());
  const [text, setText] = useState('');
  const targetBandsRef = useRef(MOOD_EQ.drift);
  const eqAnimRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const track = TRACKS[trackIdx];
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newMood, setNewMood] = useState<MoodType>('locked');

  const accent = MOOD_ACCENT[moodState.mood];

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setProgress(p => { if (p >= track.duration) { setTrackIdx(i => (i+1) % TRACKS.length); return 0; } return p+1; });
    }, 1000);
    return () => clearInterval(iv);
  }, [playing, track.duration]);

  useEffect(() => {
    const tick = () => {
      setEqBands(prev => prev.map((v, i) => {
        const d = targetBandsRef.current[i] - v;
        return Math.abs(d) < 0.01 ? targetBandsRef.current[i] : v + d * 0.04;
      }));
      eqAnimRef.current = requestAnimationFrame(tick);
    };
    eqAnimRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(eqAnimRef.current);
  }, []);

  useEffect(() => {
    moodEngine.start();
    const unsub = moodEngine.onMoodChange((s) => {
      if (source === 'sense') { setMoodState(s); if (senseMode) targetBandsRef.current = MOOD_EQ[s.mood]; }
    });
    return () => { unsub(); moodEngine.stop(); };
  }, [source, senseMode]);

  useEffect(() => {
    const iv = setInterval(() => {
      const c = moodEngine.getMood();
      setMoodState(prev => ({ ...prev, vibes: c.vibes, raw: c.raw,
        confidence: source === 'sense' ? c.confidence : prev.confidence,
        mood: source === 'sense' ? c.mood : prev.mood }));
      if (source === 'sense' && senseMode) targetBandsRef.current = MOOD_EQ[c.mood];
    }, 300);
    return () => clearInterval(iv);
  }, [source, senseMode]);

  const selectMood = useCallback((mood: MoodType) => {
    setSource('manual'); setMoodState(prev => ({ ...prev, mood, confidence: 1 }));
    targetBandsRef.current = MOOD_EQ[mood];
  }, []);

  const toggleSense = useCallback(() => {
    setSenseMode(prev => { if (!prev) { setSource('sense'); targetBandsRef.current = MOOD_EQ[moodState.mood]; } return !prev; });
  }, [moodState.mood]);

  const addCustomEvent = useCallback(() => {
    if (!newTitle.trim() || !newTime) return;
    const today = new Date();
    const [h, m] = newTime.split(':').map(Number);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
    const end = new Date(start.getTime() + 3600000);
    setEvents(prev => [...prev, { id: `c-${Date.now()}`, title: newTitle.trim(), startTime: start, endTime: end, predictedMood: newMood, isCustom: true }].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    setNewTitle(''); setNewTime(''); setShowAddEvent(false);
  }, [newTitle, newTime, newMood]);

  const v = moodState.vibes;
  const currentEvent = getCurrentEvent(events);
  const nextEvent = getNextEvent(events);
  const fmtDur = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  return (
    <div className="relative w-screen h-screen overflow-hidden" data-testid="home-page">
      <div className="absolute inset-0 z-0"><LivingOrganism mood={moodState.mood} vibes={v} /></div>

      <div className="relative z-10 w-full h-full flex flex-col pointer-events-none">
        {/* TOP BAR */}
        <header className="flex items-center justify-between px-6 pt-5 pb-2 pointer-events-auto flex-shrink-0">
          <span className="text-base font-medium tracking-[0.3em] uppercase text-white/60">Mood</span>
          <div className="flex items-center gap-2">
            {ALL_MOODS.map(m => {
              const a = MOOD_ACCENT[m];
              const active = moodState.mood === m;
              return (
                <button key={m} onClick={() => selectMood(m)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-300 ${
                    active ? 'text-white/90' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                  }`}
                  style={active ? { backgroundColor: `${a.color}18`, color: a.color, boxShadow: `0 0 14px ${a.color}15` } : {}}
                  data-testid={`mood-chip-${m}`}>{MOOD_LABELS[m]}</button>
              );
            })}
            <div className="w-px h-5 bg-white/[0.08] mx-1" />
            <button onClick={toggleSense}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-300`}
              style={senseMode ? { backgroundColor: `${accent.color}15`, color: `${accent.color}cc`, border: `1px solid ${accent.color}30` } : { color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
              data-testid="sense-toggle">
              <Radio size={11} /> Sense
              {senseMode && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent.color }} />}
            </button>
          </div>
        </header>

        {/* CENTER LABEL */}
        <div className="flex-1 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div key={moodState.mood}
              initial={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center select-none">
              <div className="text-[13px] uppercase tracking-[0.35em] mb-2 font-medium" style={{ color: `${accent.color}40` }}>
                {source === 'sense' ? 'sensing' : 'manual'}
              </div>
              <div className="text-4xl font-medium tracking-wide leading-none" style={{ color: `${accent.color}60` }}>
                {MOOD_LABELS[moodState.mood]}
              </div>
              <div className="text-[13px] font-mono mt-2.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
                {Math.round(moodState.confidence * 100)}% confidence
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* BOTTOM HUD — mood-colored accents, bigger text, better contrast */}
        <div className="grid grid-cols-4 gap-3 px-5 pb-5 pointer-events-auto flex-shrink-0">

          {/* VIBE INPUTS */}
          <div className="glass px-5 py-5" data-testid="vibe-panel">
            <div className="text-[12px] uppercase tracking-[0.16em] font-medium mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>Vibe Inputs</div>
            {[
              { label: 'Tension', value: v.tension, icon: Activity, warn: v.tension > 0.5 },
              { label: 'Focus', value: v.focus, icon: Eye },
              { label: 'Energy', value: v.energy, icon: Zap },
              { label: 'Environment', value: v.environment, icon: Sun },
            ].map(({ label, value, icon: Icon, warn }) => (
              <div key={label} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: `${accent.color}50` }} />
                    <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.58)' }}>{label}</span>
                  </div>
                  <span className="text-[14px] font-mono font-medium" style={{ color: warn ? '#f0a050' : `${accent.color}90` }}>
                    {(value * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: warn ? 'linear-gradient(90deg,rgba(240,160,80,0.4),rgba(240,160,80,0.9))' : accent.bar }}
                    animate={{ width: `${value * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }} />
                </div>
              </div>
            ))}
            <div className="mt-5 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>Tension trend</span>
              <span className="text-[13px] font-mono font-medium" style={{
                color: moodState.raw.tensionTrend > 0.2 ? '#f0a050' : moodState.raw.tensionTrend < -0.2 ? '#5eead4' : 'rgba(255,255,255,0.3)'
              }}>{moodState.raw.tensionTrend > 0.2 ? '↑ rising' : moodState.raw.tensionTrend < -0.2 ? '↓ falling' : '→ stable'}</span>
            </div>
          </div>

          {/* SCHEDULE */}
          <div className="glass px-5 py-5" data-testid="schedule-panel">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[12px] uppercase tracking-[0.16em] font-medium flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <Calendar size={13} style={{ color: `${accent.color}40` }} /> Schedule
              </div>
              <button onClick={() => setShowAddEvent(!showAddEvent)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                data-testid="add-event-btn">
                {showAddEvent ? <X size={13} style={{ color: 'rgba(255,255,255,0.5)' }} /> : <Plus size={13} style={{ color: accent.dim }} />}
              </button>
            </div>

            <AnimatePresence>
              {showAddEvent && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                  <div className="space-y-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Event name"
                      className="w-full rounded-lg px-3 py-2 text-[13px] placeholder:text-white/20 focus:outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
                      data-testid="new-event-title" />
                    <div className="flex gap-2">
                      <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                        className="flex-1 rounded-lg px-3 py-2 text-[12px] focus:outline-none"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
                        data-testid="new-event-time" />
                      <select value={newMood} onChange={e => setNewMood(e.target.value as MoodType)}
                        className="flex-1 rounded-lg px-2 py-2 text-[12px] focus:outline-none"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>
                        {ALL_MOODS.map(m => <option key={m} value={m}>{MOOD_LABELS[m]}</option>)}
                      </select>
                    </div>
                    <button onClick={addCustomEvent} className="w-full py-2 rounded-lg text-[12px] font-medium transition-colors"
                      style={{ backgroundColor: `${accent.color}18`, color: `${accent.color}cc` }}
                      data-testid="add-event-submit">Add Event</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {currentEvent && (
              <div className="mb-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent.color }} />
                  <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Now</span>
                </div>
                <div className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{currentEvent.title}</div>
                <div className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>{formatTime(currentEvent.startTime)} – {formatTime(currentEvent.endTime)}</div>
              </div>
            )}
            {nextEvent && !currentEvent && (
              <div className="flex items-center gap-1.5 text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.38)' }}>
                <Clock size={11} /><span>Next: {nextEvent.title}</span>
              </div>
            )}
            <div className="space-y-0.5 max-h-[130px] overflow-y-auto">
              {events.filter(e => !currentEvent || e.id !== currentEvent.id).map(ev => (
                <button key={ev.id} onClick={() => selectMood(ev.predictedMood)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors group"
                  style={{ }}
                  data-testid={`cal-${ev.id}`}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.58)' }}>{ev.title}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{formatTime(ev.startTime)}</div>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-medium" style={{ color: MOOD_ACCENT[ev.predictedMood].dim }}>{MOOD_LABELS[ev.predictedMood]}</span>
                  <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.15)' }} />
                </button>
              ))}
            </div>
          </div>

          {/* EQ + INPUT */}
          <div className="glass px-5 py-5" data-testid="eq-panel">
            <div className="text-[12px] uppercase tracking-[0.16em] font-medium mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Equalizer</div>
            <div className="flex items-end gap-1.5 h-[90px]">
              {eqBands.map((val, i) => {
                const h = Math.max(4, ((val+12)/24)*80);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                    <span className="text-[10px] font-mono font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>{val>0?'+':''}{val.toFixed(0)}</span>
                    <motion.div className="w-full rounded-sm"
                      style={{ background: `linear-gradient(to top, ${accent.color}15, ${accent.color}70)` }}
                      animate={{ height: h }} transition={{ type: 'spring', damping: 20, stiffness: 200 }} />
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>{EQ_LABELS[i]}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between mb-4">
              <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>{MOOD_LABELS[moodState.mood]} preset</span>
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.18)' }}>{senseMode ? 'auto' : 'manual'}</span>
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[12px] uppercase tracking-[0.16em] font-medium mb-2.5 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <Keyboard size={12} style={{ color: `${accent.color}40` }} /> Input
              </div>
              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder="Start typing to sense your mood..."
                className="w-full h-[52px] rounded-xl px-3 py-2 text-[12px] resize-none focus:outline-none font-mono leading-relaxed"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', }}
                data-testid="input-textarea" />
              <div className="flex gap-4 mt-2">
                <span className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>{Math.round(moodState.raw.typingSpeed)} wpm</span>
                <span className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>rhythm {(moodState.raw.keystrokeRhythm*100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* MEDIA PLAYER */}
          <div className="glass px-5 py-5" data-testid="media-panel">
            <div className="text-[12px] uppercase tracking-[0.16em] font-medium mb-4 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Music size={13} style={{ color: `${accent.color}40` }} /> Now Playing
            </div>
            <div className="relative w-full aspect-[2/1] max-h-[90px] rounded-xl overflow-hidden mb-4"
              style={{ background: `linear-gradient(135deg, ${track.color}30, ${track.color}10)` }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Music size={26} style={{ color: `${track.color}70` }} />
              </div>
              {playing && (
                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: accent.color }}
                  animate={{ scaleX: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
              )}
            </div>
            <div className="mb-3">
              <div className="text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{track.title}</div>
              <div className="text-[12px]" style={{ color: 'rgba(255,255,255,0.38)' }}>{track.artist}</div>
            </div>
            <div className="mb-3">
              <div className="h-[3px] rounded-full overflow-hidden cursor-pointer" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setProgress(Math.floor((e.clientX-r.left)/r.width*track.duration)); }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(progress/track.duration)*100}%`, background: accent.color }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>{fmtDur(progress)}</span>
                <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>{fmtDur(track.duration)}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-5">
              <button onClick={() => { setTrackIdx(i => i>0?i-1:TRACKS.length-1); setProgress(0); }}
                style={{ color: 'rgba(255,255,255,0.38)' }} data-testid="media-prev"><SkipBack size={18} /></button>
              <button onClick={() => setPlaying(!playing)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${accent.color}15` }}
                data-testid="media-play">
                {playing ? <Pause size={18} style={{ color: accent.color }} /> : <Play size={18} style={{ color: accent.color }} className="ml-0.5" />}
              </button>
              <button onClick={() => { setTrackIdx(i => (i+1)%TRACKS.length); setProgress(0); }}
                style={{ color: 'rgba(255,255,255,0.38)' }} data-testid="media-next"><SkipForward size={18} /></button>
            </div>
            <div className="flex items-center gap-2 mt-3 justify-center">
              <Volume2 size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <div className="w-16 h-[2px] rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full w-3/4 rounded-full" style={{ backgroundColor: `${accent.color}40` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
