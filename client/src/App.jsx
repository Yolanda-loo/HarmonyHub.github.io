import React, { useEffect, useRef, useState } from 'react';
import { useHarmonyStore, INSTRUMENTS, NOTES } from './useHarmonyStore';
import * as Tone from 'tone';

function App() {
  const { status, grid, melody, mixer, awarenessUsers, toggleDrum, toggleMelody, changeMixer, handleMouseMove, startAudio } = useHarmonyStore();
  
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPattern, setCurrentPattern] = useState('A'); 
  const [customSampleName, setCustomSampleName] = useState("No sample loaded");

  // --- MOCK DATABASE FOR COMMUNITY UPLOADS ---
  const [communityFeed, setCommunityFeed] = useState([
      { id: 1, name: "Heavy Sub Bass", author: "Producer_Leo", url: "https://tonejs.github.io/audio/loop/bass.mp3" },
      { id: 2, name: "Glitchy Fwip Loop", author: "DJ_Tebogo", url: "https://tonejs.github.io/audio/loop/fwip.mp3" },
      { id: 3, name: "Acapella Vocal Chop", author: "SarahSings", url: "https://tonejs.github.io/audio/salamander/A4.mp3" }
  ]);

  const synthsRef = useRef({});
  const channelsRef = useRef({});
  const fxRef = useRef({});
  const micRef = useRef(null);
  const gridRef = useRef(grid);
  const melodyRef = useRef(melody);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const recorderRef = useRef(null);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { melodyRef.current = melody; }, [melody]);

  useEffect(() => {
      if (!isReady) return;
      if (channelsRef.current.Kick) channelsRef.current.Kick.volume.value = mixer.Kick_vol;
      if (channelsRef.current.Snare) channelsRef.current.Snare.volume.value = mixer.Snare_vol;
      if (channelsRef.current.HiHat) channelsRef.current.HiHat.volume.value = mixer.HiHat_vol;
      if (channelsRef.current.Synth) channelsRef.current.Synth.volume.value = mixer.Synth_vol;
      if (channelsRef.current.Custom) channelsRef.current.Custom.volume.value = mixer.Custom_vol; 
      
      if (fxRef.current.reverb) fxRef.current.reverb.wet.value = mixer.reverb;
      if (fxRef.current.delay) fxRef.current.delay.wet.value = mixer.delay;
  }, [mixer, isReady]);

  const initSystem = async () => {
    await startAudio();
    
    analyserRef.current = new Tone.Analyser("fft", 64);
    recorderRef.current = new Tone.Recorder();
    Tone.Destination.connect(analyserRef.current);
    Tone.Destination.connect(recorderRef.current);

    fxRef.current = {
        reverb: new Tone.Reverb({ decay: 4, wet: mixer.reverb }).toDestination(),
        delay: new Tone.PingPongDelay({ delayTime: "8n", feedback: 0.3, wet: mixer.delay })
    };
    fxRef.current.delay.connect(fxRef.current.reverb);

    channelsRef.current = {
        Kick: new Tone.Channel(mixer.Kick_vol).connect(fxRef.current.delay),
        Snare: new Tone.Channel(mixer.Snare_vol).connect(fxRef.current.delay),
        HiHat: new Tone.Channel(mixer.HiHat_vol).connect(fxRef.current.delay),
        Synth: new Tone.Channel(mixer.Synth_vol).connect(fxRef.current.delay),
        Custom: new Tone.Channel(mixer.Custom_vol).connect(fxRef.current.delay),
        Mic: new Tone.Channel(0).connect(fxRef.current.delay) // Mic gets its own static channel for now
    };

    synthsRef.current = {
      Kick: new Tone.MembraneSynth().connect(channelsRef.current.Kick),
      Snare: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).connect(channelsRef.current.Snare),
      HiHat: new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).connect(channelsRef.current.HiHat),
      Synth: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" } }).connect(channelsRef.current.Synth),
      Custom: null
    };

    micRef.current = new Tone.UserMedia();
    micRef.current.connect(channelsRef.current.Mic); 

    Tone.Transport.bpm.value = 120;
    
    new Tone.Sequence((time, step) => {
      Tone.Draw.schedule(() => setCurrentStep(step), time);
      const cGrid = gridRef.current;
      const cMelody = melodyRef.current;
      
      if (cGrid.Kick && cGrid.Kick[step]) synthsRef.current.Kick.triggerAttackRelease("C1", "8n", time);
      if (cGrid.Snare && cGrid.Snare[step]) synthsRef.current.Snare.triggerAttackRelease("8n", time);
      if (cGrid.HiHat && cGrid.HiHat[step]) synthsRef.current.HiHat.triggerAttackRelease("32n", time, 0.3);
      if (cGrid.Custom && cGrid.Custom[step] && synthsRef.current.Custom) synthsRef.current.Custom.start(time);
      
      const notesToPlay = [];
      NOTES.forEach(note => { if (cMelody[note] && cMelody[note][step]) notesToPlay.push(note); });
      if (notesToPlay.length > 0) synthsRef.current.Synth.triggerAttackRelease(notesToPlay, "8n", time, 0.5);
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n").start(0);

    setIsReady(true);
    drawVisualizer(); 
  };

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

  const handleRecord = async () => {
    if (!recorderRef.current) return;
    if (isRecording) {
      const recording = await recorderRef.current.stop();
      const url = URL.createObjectURL(recording);
      const anchor = document.createElement("a");
      anchor.download = "HarmonyHub_FullTrack.webm"; 
      anchor.href = url;
      anchor.click();
      setIsRecording(false);
    } else {
      recorderRef.current.start();
      setIsRecording(true);
    }
  };

  const toggleMic = async () => {
      if (!micRef.current) return;
      if (isMicActive) {
          micRef.current.close();
          setIsMicActive(false);
      } else {
          try {
              await micRef.current.open();
              setIsMicActive(true);
          } catch (e) {
              alert("Microphone permission denied or device not found.");
          }
      }
  };

  const loadCommunitySample = (sample) => {
      setCustomSampleName(sample.name);
      synthsRef.current.Custom = new Tone.Player(sample.url).connect(channelsRef.current.Custom);
      alert(`Downloaded "${sample.name}". Map it on the Custom track!`);
  };

  const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setCustomSampleName(file.name);
          synthsRef.current.Custom = new Tone.Player(url).connect(channelsRef.current.Custom);
          
          const newContribution = {
              id: Date.now(), name: file.name, author: "You", url: url 
          };
          setCommunityFeed([newContribution, ...communityFeed]);
          alert(`Successfully contributed ${file.name} to the Community Feed!`);
      }
  };

  const togglePlay = () => {
    isPlaying ? Tone.Transport.pause() : Tone.Transport.start();
    setIsPlaying(!isPlaying);
  };

  const displayInstruments = [...INSTRUMENTS, 'Custom'];

  return (
    <div onMouseMove={handleMouseMove} style={{ padding: '30px', fontFamily: 'sans-serif', background: '#121212', color: 'white', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {awarenessUsers.map((user, i) => (
         <div key={i} style={{ position: 'absolute', left: user.cursor.x, top: user.cursor.y, pointerEvents: 'none', zIndex: 9999, transition: 'left 0.1s linear, top 0.1s linear' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill={user.color} xmlns="http://www.w3.org/2000/svg">
                 <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
             </svg>
             <span style={{ background: user.color, color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginLeft: '12px' }}>{user.name}</span>
         </div>
      ))}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, textShadow: '0 0 10px #ff00ff' }}>🎵 HarmonyHub: Studio V2</h1>
        <div style={{ background: status === 'connected' ? '#1b5e20' : '#b71c1c', padding: '8px 15px', borderRadius: '20px', fontSize: '14px' }}>{status.toUpperCase()}</div>
      </header>

      <canvas ref={canvasRef} width="1000" height="100" style={{ width: '100%', background: '#0a0a0a', borderRadius: '12px', border: '1px solid #333', marginBottom: '20px', boxShadow: '0 0 20px rgba(0, 255, 255, 0.1)' }} />

      {!isReady ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <button onClick={initSystem} style={btnStyle('#FF00FF')}>🎧 Power On Studio</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '30px', position: 'relative', zIndex: 10 }}>
          
          {/* --- LEFT COLUMN: THE STUDIO --- */}
          <div style={{ flex: 3 }}>
              {/* ARRANGER TIMELINE */}
              <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '12px', border: '1px solid #444', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <h3 style={{ margin: 0, color: '#00FFFF' }}>🛤️ Arranger</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                      {['A', 'B', 'C', 'D'].map(pattern => (
                          <button key={pattern} onClick={() => setCurrentPattern(pattern)} style={{ padding: '10px 20px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', border: 'none', background: currentPattern === pattern ? '#FF00FF' : '#333', color: 'white', transition: 'background 0.2s' }}>
                              Pattern {pattern}
                          </button>
                      ))}
                  </div>
              </div>

              {/* TRANSPORT & MIC CONTROLS */}
              <div style={{ marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={togglePlay} style={btnStyle(isPlaying ? '#ff3366' : '#00e676')}>{isPlaying ? '⏹ Pause' : '▶ Play'}</button>
                <button onClick={handleRecord} style={btnStyle(isRecording ? '#ff0000' : '#444')}>{isRecording ? '🛑 Stop & Save' : '⏺ Record Track'}</button>
                <button onClick={toggleMic} style={btnStyle(isMicActive ? '#00FFFF' : '#333', isMicActive ? 'black' : 'white')}>{isMicActive ? '🎤 Mic Live (Sing!)' : '🎙️ Enable Mic'}</button>
              </div>

              {/* THE GRIDS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(30, 30, 30, 0.8)', padding: '20px', borderRadius: '12px', border: '1px solid #444', marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>🥁 Drums & Custom Audio</h3>
                {displayInstruments.map((inst) => (
                  <div key={inst} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '110px', fontWeight: 'bold', color: inst === 'Custom' ? '#00FFFF' : '#888' }}>
                        {inst}
                        {inst === 'Custom' && <div style={{ fontSize: '10px', fontWeight: 'normal' }}>{customSampleName.substring(0,12)}...</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                      {(grid[inst] || Array(16).fill(false)).map((isActive, i) => (
                          <button key={i} onClick={() => toggleDrum(inst, i)} style={gridBtnStyle(isActive, currentStep === i, inst === 'Custom' ? '#00FFFF' : '#ffb300')} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(30, 30, 30, 0.8)', padding: '20px', borderRadius: '12px', border: '1px solid #444', marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>🎹 Synth Melody</h3>
                {NOTES.map((note) => (
                  <div key={note} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '110px', fontWeight: 'bold', color: '#888' }}>{note}</div>
                    <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                      {(melody[note] || Array(16).fill(false)).map((isActive, i) => (
                          <button key={i} onClick={() => toggleMelody(note, i)} style={gridBtnStyle(isActive, currentStep === i, '#ff00ff')} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* MIXING CONSOLE */}
              <div style={{ display: 'flex', gap: '20px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #444', overflowX: 'auto' }}>
                  <div style={{ borderRight: '1px dashed #555', paddingRight: '20px', display: 'flex', gap: '20px' }}>
                      <div style={mixerChannelStyle}><span style={{ fontSize: '12px', color: '#00FFFF' }}>REVERB</span><input type="range" min="0" max="1" step="0.05" value={mixer.reverb} onChange={(e) => changeMixer('reverb', e.target.value)} style={sliderStyle} /></div>
                      <div style={mixerChannelStyle}><span style={{ fontSize: '12px', color: '#00FFFF' }}>DELAY</span><input type="range" min="0" max="1" step="0.05" value={mixer.delay} onChange={(e) => changeMixer('delay', e.target.value)} style={sliderStyle} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '20px' }}>
                      {['Kick', 'Snare', 'HiHat', 'Synth', 'Custom'].map(inst => (
                          <div key={inst} style={mixerChannelStyle}>
                              <span style={{ fontSize: '12px', color: inst === 'Custom' ? '#00FFFF' : '#888' }}>{inst} Vol</span>
                              <input type="range" min="-60" max="10" step="1" value={mixer[`${inst}_vol`]} onChange={(e) => changeMixer(`${inst}_vol`, e.target.value)} style={sliderStyle} />
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* --- RIGHT COLUMN: COMMUNITY FEED --- */}
          <div style={{ flex: 1, background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333', maxHeight: '750px', overflowY: 'auto' }}>
              <h3 style={{ marginTop: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>🌍 Community Library</h3>
              <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>Pull contributions from other artists into your session.</p>

              {communityFeed.map((sample) => (
                  <div key={sample.id} style={{ background: '#222', padding: '15px', borderRadius: '8px', marginBottom: '10px', borderLeft: '3px solid #00FFFF' }}>
                      <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>{sample.name}</h4>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#aaa' }}>By: {sample.author}</p>
                      <button onClick={() => loadCommunitySample(sample)} style={{ padding: '8px 12px', background: '#333', color: '#00FFFF', border: '1px solid #00FFFF', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', width: '100%' }}>
                          ⬇️ Load to Custom Track
                      </button>
                  </div>
              ))}

              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed #444' }}>
                  <h4 style={{ marginTop: 0 }}>Contribute Your Own</h4>
                  <label style={{ cursor: 'pointer', display: 'block', padding: '10px', background: '#FF00FF', color: 'white', textAlign: 'center', borderRadius: '6px', fontWeight: 'bold' }}>
                      + Upload to Community
                      <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
              </div>
          </div>

        </div>
      )}
    </div>
  );
}

const btnStyle = (bg, color='white') => ({ padding: '15px 30px', fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', background: bg, color: color, boxShadow: `0 0 15px ${bg}40` });
const gridBtnStyle = (isActive, isCurrentStep, activeColor) => ({ flex: 1, height: '40px', border: '1px solid #111', borderRadius: '4px', cursor: 'pointer', background: isActive ? activeColor : (isCurrentStep ? '#555' : '#222'), transform: isCurrentStep ? 'scale(1.05)' : 'scale(1)', boxShadow: isActive ? `0 0 10px ${activeColor}` : 'none' });
const mixerChannelStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: '#222', padding: '15px 10px', borderRadius: '8px', minWidth: '80px' };
const sliderStyle = { width: '80px', cursor: 'pointer' };

export default App;