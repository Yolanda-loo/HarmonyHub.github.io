import React, { useEffect, useRef, useState } from 'react';
import { useHarmonyStore, INSTRUMENTS, NOTES } from './useHarmonyStore';
import * as Tone from 'tone';

function App() {
  const { 
    status, grid, melody, awarenessUsers, 
    toggleDrum, toggleMelody, handleMouseMove, startAudio 
  } = useHarmonyStore();
  
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [likes, setLikes] = useState(124); // Mock data for favorites

  const synthsRef = useRef({});
  const gridRef = useRef(grid);
  const melodyRef = useRef(melody);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { melodyRef.current = melody; }, [melody]);

  const initSystem = async () => {
    await startAudio();
    
    synthsRef.current = {
      Kick: new Tone.MembraneSynth().toDestination(),
      Snare: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination(),
      HiHat: new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
      // New PolySynth for the melody capable of playing multiple notes at once
      Synth: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" } }).toDestination()
    };

    Tone.Transport.bpm.value = 120;
    
    new Tone.Sequence((time, step) => {
      Tone.Draw.schedule(() => setCurrentStep(step), time);

      const cGrid = gridRef.current;
      const cMelody = melodyRef.current;
      
      // Play Drums
      if (cGrid.Kick && cGrid.Kick[step]) synthsRef.current.Kick.triggerAttackRelease("C1", "8n", time);
      if (cGrid.Snare && cGrid.Snare[step]) synthsRef.current.Snare.triggerAttackRelease("8n", time);
      if (cGrid.HiHat && cGrid.HiHat[step]) synthsRef.current.HiHat.triggerAttackRelease("32n", time, 0.3);
      
      // Play Melody (Piano Roll)
      const notesToPlay = [];
      NOTES.forEach(note => {
          if (cMelody[note] && cMelody[note][step]) notesToPlay.push(note);
      });
      if (notesToPlay.length > 0) {
          synthsRef.current.Synth.triggerAttackRelease(notesToPlay, "8n", time, 0.5);
      }

    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n").start(0);

    setIsReady(true);
  };

  const togglePlay = () => {
    isPlaying ? Tone.Transport.pause() : Tone.Transport.start();
    setIsPlaying(!isPlaying);
  };

  const handleShare = () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      alert("Jam Session URL copied! Send this to a friend to collab or share the track.");
  };

  return (
    // The main div tracks the mouse to broadcast to WebSockets
    <div onMouseMove={handleMouseMove} style={{ padding: '30px', fontFamily: 'sans-serif', background: '#121212', color: 'white', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* --- LIVE CURSORS RENDERER --- */}
      {awarenessUsers.map((user, i) => (
         <div key={i} style={{
             position: 'absolute',
             left: user.cursor.x, top: user.cursor.y,
             pointerEvents: 'none', zIndex: 9999,
             transition: 'left 0.1s linear, top 0.1s linear'
         }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill={user.color} xmlns="http://www.w3.org/2000/svg">
                 <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
             </svg>
             <span style={{ background: user.color, color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginLeft: '12px' }}>
                 {user.name}
             </span>
         </div>
      ))}

      {/* --- HEADER & SOCIAL --- */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
            <h1 style={{ margin: 0 }}>🎵 HarmonyHub</h1>
            <p style={{ color: '#888', margin: '5px 0 0 0' }}>Chill Lo-Fi Beat #849</p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button onClick={() => setLikes(likes + 1)} style={socialBtnStyle}>
                ❤️ {likes}
            </button>
            <button onClick={handleShare} style={socialBtnStyle}>
                🔗 Share
            </button>
            <div style={{ background: status === 'connected' ? '#1b5e20' : '#b71c1c', padding: '8px 15px', borderRadius: '20px', fontSize: '14px' }}>
                {status.toUpperCase()}
            </div>
        </div>
      </header>

      {!isReady ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h2>Ready to Jam?</h2>
          <button onClick={initSystem} style={btnStyle('#FF00FF')}>🎧 Initialize Studio</button>
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ marginBottom: '30px', display: 'flex', gap: '15px' }}>
            <button onClick={togglePlay} style={btnStyle(isPlaying ? '#ff3366' : '#00e676')}>
              {isPlaying ? '⏹ Pause' : '▶ Play'}
            </button>
            <div style={{ padding: '15px', background: '#222', borderRadius: '8px' }}>Tempo: 120 BPM</div>
            <div style={{ padding: '15px', background: '#222', borderRadius: '8px', color: '#00FFFF' }}>Active Jammers: {awarenessUsers.length}</div>
          </div>

          {/* --- DRUM SEQUENCER --- */}
          <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>🥁 Drums</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#1e1e1e', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
            {INSTRUMENTS.map((inst) => (
              <div key={inst} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '80px', fontWeight: 'bold', color: '#888' }}>{inst}</div>
                <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                  {(grid[inst] || []).map((isActive, i) => (
                      <button key={i} onClick={() => toggleDrum(inst, i)} style={gridBtnStyle(isActive, currentStep === i, '#ffb300')} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* --- PIANO ROLL (MELODY) --- */}
          <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>🎹 Synth Melody</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#1e1e1e', padding: '20px', borderRadius: '12px' }}>
            {NOTES.map((note) => (
              <div key={note} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '80px', fontWeight: 'bold', color: '#888' }}>{note}</div>
                <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                  {(melody[note] || []).map((isActive, i) => (
                      <button key={i} onClick={() => toggleMelody(note, i)} style={gridBtnStyle(isActive, currentStep === i, '#00FFFF')} />
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

// Helper Styles
const btnStyle = (bg) => ({ padding: '15px 30px', fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', background: bg, color: 'white' });
const socialBtnStyle = { padding: '8px 15px', background: '#333', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' };
const gridBtnStyle = (isActive, isCurrentStep, activeColor) => ({
    flex: 1, height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer',
    background: isActive ? activeColor : (isCurrentStep ? '#444' : '#2a2a2a'),
    transform: isCurrentStep ? 'scale(1.05)' : 'scale(1)',
    transition: 'background 0.1s, transform 0.1s'
});

export default App;