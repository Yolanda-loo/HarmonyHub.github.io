import React, { useRef, useState } from 'react';
import { useHarmonyStore } from './useHarmonyStore';
import * as Tone from 'tone';

function App() {
  const { status, tracks, addTrack, startAudio } = useHarmonyStore('room-1');
  
  // We use useRef so the synth persists across React re-renders without multiplying
  const synthRef = useRef(null);
  const [isAudioReady, setIsAudioReady] = useState(false);

  // 1. Unlock the browser's audio engine
  const initAudio = async () => {
    await startAudio();
    
    // Create a kick drum synthesizer and route it to the speakers
    if (!synthRef.current) {
        synthRef.current = new Tone.MembraneSynth().toDestination();
    }
    
    setIsAudioReady(true);
    console.log("Audio Engine Ready!");
  };

  // 2. Play the sound AND sync the track to other users
  const handleAddDrum = () => {
    if (!isAudioReady) {
      alert("Please click 'Start Audio Engine' first!");
      return;
    }

    // Play a low C note (C1) for an 8th note duration ("8n")
    synthRef.current.triggerAttackRelease("C1", "8n");
    
    // Broadcast this action to the Yjs store
    addTrack("Kick Drum Drop");
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#121212', color: 'white', height: '100vh' }}>
      <h1>🎵 HarmonyHub <span style={{fontSize: '0.5em', color: status === 'connected' ? '#0f0' : '#f00'}}>● {status}</span></h1>
      
      {!isAudioReady ? (
        <button 
          onClick={initAudio} 
          style={{ padding: '15px 30px', cursor: 'pointer', fontWeight: 'bold', background: '#FF00FF', color: 'white', border: 'none', borderRadius: '5px' }}>
          🔊 Start Audio Engine
        </button>
      ) : (
        <button 
          onClick={handleAddDrum} 
          style={{ padding: '15px 30px', cursor: 'pointer', fontWeight: 'bold', background: '#00FFFF', color: 'black', border: 'none', borderRadius: '5px' }}>
          🥁 Drop a Kick Drum
        </button>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>Arrangement View</h2>
        <hr style={{ borderColor: '#333' }} />
        
        {tracks.length === 0 && <p style={{ color: '#666' }}>No tracks yet. Drop a beat!</p>}

        {tracks.map(track => (
          <div key={track.id} style={{ 
            borderLeft: `5px solid ${track.color}`, 
            background: '#222', 
            margin: '10px 0', 
            padding: '15px',
            borderRadius: '0 5px 5px 0'
          }}>
            <h3 style={{ margin: '0 0 5px 0' }}>{track.name}</h3>
            <small style={{ color: '#888' }}>ID: {track.id}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;