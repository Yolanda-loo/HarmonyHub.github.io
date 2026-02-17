import React, { useEffect, useRef, useState } from 'react';
import { useHarmonyStore, INSTRUMENTS, NOTES } from './useHarmonyStore';
import * as Tone from 'tone';

function App() {
  const { status, grid, melody, awarenessUsers, toggleDrum, toggleMelody, handleMouseMove, startAudio } = useHarmonyStore();
  
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // NEW: Recording State
  const [currentStep, setCurrentStep] = useState(0);
  const [customSampleName, setCustomSampleName] = useState("No custom sample loaded");

  const synthsRef = useRef({});
  const gridRef = useRef(grid);
  const melodyRef = useRef(melody);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const recorderRef = useRef(null); // NEW: Recorder Reference

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { melodyRef.current = melody; }, [melody]);

  const initSystem = async () => {
    await startAudio();
    
    // --- VISUALIZER SETUP ---
    analyserRef.current = new Tone.Analyser("fft", 64);
    Tone.Destination.connect(analyserRef.current);

    // --- RECORDER SETUP ---
    recorderRef.current = new Tone.Recorder();
    Tone.Destination.connect(recorderRef.current);

    synthsRef.current = {
      Kick: new Tone.MembraneSynth().toDestination(),
      Snare: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination(),
      HiHat: new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
      Synth: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" } }).toDestination(),
      Custom: null 
    };

    Tone.Transport.bpm.value = 120;
    
    new Tone.Sequence((time, step) => {
      Tone.Draw.schedule(() => setCurrentStep(step), time);

      const cGrid = gridRef.current;
      const cMelody = melodyRef.current;
      
      // Play built-in drums
      if (cGrid.Kick && cGrid.Kick[step]) synthsRef.current.Kick.triggerAttackRelease("C1", "8n", time);
      if (cGrid.Snare && cGrid.Snare[step]) synthsRef.current.Snare.triggerAttackRelease("8n", time);
      if (cGrid.HiHat && cGrid.HiHat[step]) synthsRef.current.HiHat.triggerAttackRelease("32n", time, 0.3);
      
      // Play custom sample
      if (cGrid.Custom && cGrid.Custom[step] && synthsRef.current.Custom) {
          synthsRef.current.Custom.start(time);
      }
      
      // Play Melody
      const notesToPlay = [];
      NOTES.forEach(note => { if (cMelody[note] && cMelody[note][step]) notesToPlay.push(note); });
      if (notesToPlay.length > 0) synthsRef.current.Synth.triggerAttackRelease(notesToPlay, "8n", time, 0.5);

    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n").start(0);

    setIsReady(true);
    drawVisualizer(); 
  };

  // --- THE GLOWING VISUALIZER ENGINE ---
  const drawVisualizer = () => {
    requestAnimationFrame(drawVisualizer);
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const values = analyserRef.current.getValue();
    
    ctx.fillStyle = 'rgba(18, 18, 18, 0.2)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = canvas.width / values.length;
    for (let i = 0; i < values.length; i++) {
        const val = Math.max(0, values[i] + 100); 
        const barHeight = (val * canvas.height) / 100;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#ff00ff'); 
        gradient.addColorStop(1, '#00ffff'); 
        
        ctx.fillStyle = gradient;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
    }
  };

  // --- AUDIO RECORDING HANDLER ---
  const handleRecord = async () => {
    if (!recorderRef.current) return;
    
    if (isRecording) {
      // Stop recording and download
      const recording = await recorderRef.current.stop();
      const url = URL.createObjectURL(recording);
      const anchor = document.createElement("a");
      anchor.download = "HarmonyHub_Beat.webm"; 
      anchor.href = url;
      anchor.click();
      setIsRecording(false);
    } else {
      // Start recording
      recorderRef.current.start();
      setIsRecording(true);
    }
  };

  // --- CUSTOM AUDIO UPLOAD HANDLER ---
  const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setCustomSampleName(file.name);
          synthsRef.current.Custom = new Tone.Player(url).toDestination();
          alert(`${file.name} loaded successfully! Map it on the 'Custom' grid track.`);
      }
  };

  const togglePlay = () => {
    isPlaying ? Tone.Transport.pause() : Tone.Transport.start();
    setIsPlaying(!isPlaying);
  };

  const displayInstruments = [...INSTRUMENTS, 'Custom'];

  return (
    <div onMouseMove={handleMouseMove} style={{ padding: '30px', fontFamily: 'sans-serif', background: '#121212', color: 'white', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* Live Ghost Cursors */}
      {awarenessUsers.map((user, i) => (
         <div key={i} style={{ position: 'absolute', left: user.cursor.x, top: user.cursor.y, pointerEvents: 'none', zIndex: 9999, transition: 'left 0.1s linear, top 0.1s linear' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill={user.color} xmlns="http://www.w3.org/2000/svg">
                 <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
             </svg>
             <span style={{ background: user.color, color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginLeft: '12px' }}>{user.name}</span>
         </div>
      ))}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, textShadow: '0 0 10px #ff00ff' }}>🎵 HarmonyHub Pro</h1>
        <div style={{ background: status === 'connected' ? '#1b5e20' : '#b71c1c', padding: '8px 15px', borderRadius: '20px', fontSize: '14px' }}>{status.toUpperCase()}</div>
      </header>

      {/* --- THE NEON VISUALIZER CANVAS --- */}
      <canvas ref={canvasRef} width="1000" height="150" style={{ width: '100%', background: '#0a0a0a', borderRadius: '12px', border: '1px solid #333', marginBottom: '30px', boxShadow: '0 0 20px rgba(0, 255, 255, 0.1)' }} />

      {!isReady ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <button onClick={initSystem} style={btnStyle('#FF00FF')}>🎧 Initialize Studio Engine</button>
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 10 }}>
          
          {/* Controls & Upload */}
          <div style={{ marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={togglePlay} style={btnStyle(isPlaying ? '#ff3366' : '#00e676')}>{isPlaying ? '⏹ Pause' : '▶ Play'}</button>
            
            {/* RECORD BUTTON */}
            <button onClick={handleRecord} style={btnStyle(isRecording ? '#ff0000' : '#444444')}>
              {isRecording ? '🛑 Stop & Save' : '⏺ Record Audio'}
            </button>

            <div style={{ padding: '15px', background: '#222', borderRadius: '8px' }}>Tempo: 120 BPM</div>
            
            {/* Custom Audio Upload */}
            <div style={{ padding: '10px 15px', background: '#333', borderRadius: '8px', border: '1px dashed #00FFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ cursor: 'pointer', color: '#00FFFF', fontWeight: 'bold' }}>
                    📁 Upload Custom Sound
                    <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
                <span style={{ fontSize: '12px', color: '#aaa' }}>{customSampleName}</span>
            </div>
          </div>

          {/* Sequences Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(30, 30, 30, 0.8)', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid #444', marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>🥁 Drum Machine & Custom Sampler</h3>
            {displayInstruments.map((inst) => (
              <div key={inst} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '90px', fontWeight: 'bold', color: inst === 'Custom' ? '#00FFFF' : '#888' }}>{inst}</div>
                <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                  {(grid[inst] || Array(16).fill(false)).map((isActive, i) => (
                      <button key={i} onClick={() => toggleDrum(inst, i)} style={gridBtnStyle(isActive, currentStep === i, inst === 'Custom' ? '#00FFFF' : '#ffb300')} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Piano Roll Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(30, 30, 30, 0.8)', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid #444' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>🎹 Synthesizer (Chords & Melody)</h3>
            {NOTES.map((note) => (
              <div key={note} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '90px', fontWeight: 'bold', color: '#888' }}>{note}</div>
                <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                  {(melody[note] || Array(16).fill(false)).map((isActive, i) => (
                      <button key={i} onClick={() => toggleMelody(note, i)} style={gridBtnStyle(isActive, currentStep === i, '#ff00ff')} />
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

const btnStyle = (bg) => ({ padding: '15px 30px', fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', background: bg, color: 'white', boxShadow: `0 0 15px ${bg}40` });
const gridBtnStyle = (isActive, isCurrentStep, activeColor) => ({
    flex: 1, height: '40px', border: '1px solid #111', borderRadius: '4px', cursor: 'pointer',
    background: isActive ? activeColor : (isCurrentStep ? '#555' : '#222'),
    transform: isCurrentStep ? 'scale(1.05)' : 'scale(1)',
    boxShadow: isActive ? `0 0 10px ${activeColor}` : 'none',
    transition: 'all 0.1s ease'
});

export default App;