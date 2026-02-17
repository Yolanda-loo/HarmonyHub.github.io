import React, { useEffect, useRef, useState } from 'react';
import { useHarmonyStore, INSTRUMENTS } from './useHarmonyStore';
import * as Tone from 'tone';

function App() {
  const { status, grid, toggleStep, startAudio } = useHarmonyStore();
  
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // We use Refs for audio nodes and state that changes rapidly 
  // so we don't cause React to re-render the whole page 120 times a minute.
  const synthsRef = useRef({});
  const gridRef = useRef(grid);

  // Keep the Ref in sync with the live Yjs grid
  useEffect(() => { gridRef.current = grid; }, [grid]);

  const initSystem = async () => {
    await startAudio();
    
    // Create the drum sounds
    synthsRef.current = {
      Kick: new Tone.MembraneSynth().toDestination(),
      Snare: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination(),
      HiHat: new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination()
    };

    // Setup the Loop (The clock that ticks 16 times per measure)
    Tone.Transport.bpm.value = 120;
    
    new Tone.Sequence((time, step) => {
      // Update UI (safely triggering a render)
      Tone.Draw.schedule(() => setCurrentStep(step), time);

      // Check the grid for this exact step and play sounds if they are marked 'true'
      const currentGrid = gridRef.current;
      
      if (currentGrid.Kick && currentGrid.Kick[step]) {
        synthsRef.current.Kick.triggerAttackRelease("C1", "8n", time);
      }
      if (currentGrid.Snare && currentGrid.Snare[step]) {
        synthsRef.current.Snare.triggerAttackRelease("8n", time);
      }
      if (currentGrid.HiHat && currentGrid.HiHat[step]) {
        synthsRef.current.HiHat.triggerAttackRelease("32n", time, 0.3); // 0.3 is lower volume
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n").start(0);

    setIsReady(true);
  };

  const togglePlay = () => {
    if (isPlaying) {
      Tone.Transport.pause();
    } else {
      Tone.Transport.start();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', background: '#121212', color: 'white', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ margin: 0 }}>🎵 HarmonyHub</h1>
        <div style={{ background: status === 'connected' ? '#1b5e20' : '#b71c1c', padding: '5px 15px', borderRadius: '20px', fontSize: '14px' }}>
          {status.toUpperCase()}
        </div>
      </header>

      {!isReady ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h2>Ready to Jam?</h2>
          <button onClick={initSystem} style={btnStyle('#FF00FF')}>🎧 Initialize Studio</button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '30px', display: 'flex', gap: '15px' }}>
            <button onClick={togglePlay} style={btnStyle(isPlaying ? '#ff3366' : '#00e676')}>
              {isPlaying ? '⏹ Pause' : '▶ Play'}
            </button>
            <div style={{ padding: '15px', background: '#222', borderRadius: '8px' }}>Tempo: 120 BPM</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#1e1e1e', padding: '20px', borderRadius: '12px' }}>
            {/* Render the Sequencer Grid */}
            {INSTRUMENTS.map((inst) => (
              <div key={inst} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '80px', fontWeight: 'bold', color: '#888' }}>{inst}</div>
                
                <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                  {(grid[inst] || []).map((isActive, i) => {
                    const isCurrentStep = currentStep === i;
                    return (
                      <button
                        key={i}
                        onClick={() => toggleStep(inst, i)}
                        style={{
                          flex: 1,
                          height: '50px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: isActive 
                            ? (inst === 'Kick' ? '#ff3366' : inst === 'Snare' ? '#00e676' : '#00b0ff') 
                            : (isCurrentStep ? '#333' : '#2a2a2a'),
                          transform: isCurrentStep ? 'scale(1.05)' : 'scale(1)',
                          transition: 'background 0.1s, transform 0.1s'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper styling function
const btnStyle = (bg) => ({
  padding: '15px 30px',
  fontSize: '16px',
  fontWeight: 'bold',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  background: bg,
  color: 'white'
});

export default App;