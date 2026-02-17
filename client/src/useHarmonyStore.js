import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as Tone from 'tone';

const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/jam';
const STEPS = 16;
export const INSTRUMENTS = ['Kick', 'Snare', 'HiHat'];
export const NOTES = ['C4', 'A3', 'G3', 'E3', 'C3'];

export function useHarmonyStore(projectId = 'jam-session-pro') {
    const [grid, setGrid] = useState({});
    const [melody, setMelody] = useState({});
    const [awarenessUsers, setAwarenessUsers] = useState([]);
    
    // NEW: Mixer State
    const [mixer, setMixer] = useState({
        Kick_vol: 0, Snare_vol: 0, HiHat_vol: -10, Synth_vol: -5, Custom_vol: 0,
        reverb: 0, delay: 0
    });
    
    const [status, setStatus] = useState('disconnected');
    const ydocRef = useRef(null);
    const providerRef = useRef(null);

    useEffect(() => {
        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;
        
        const provider = new WebsocketProvider(WEBSOCKET_URL, projectId, ydoc);
        providerRef.current = provider;

        provider.on('status', event => setStatus(event.status));

        const yGridMap = ydoc.getMap('sequencer-grid');
        const yMelodyMap = ydoc.getMap('melody-grid');
        const yMixerMap = ydoc.getMap('mixer-settings'); // NEW Yjs Map

        INSTRUMENTS.forEach(inst => {
            if (!yGridMap.has(inst)) {
                const yArray = new Y.Array();
                yArray.insert(0, Array(STEPS).fill(false));
                yGridMap.set(inst, yArray);
            }
        });

        NOTES.forEach(note => {
            if (!yMelodyMap.has(note)) {
                const yArray = new Y.Array();
                yArray.insert(0, Array(STEPS).fill(false));
                yMelodyMap.set(note, yArray);
            }
        });

        // Initialize default mixer values if they don't exist
        if (!yMixerMap.has('reverb')) {
            ['Kick_vol', 'Snare_vol', 'HiHat_vol', 'Synth_vol', 'Custom_vol', 'reverb', 'delay'].forEach(key => {
                yMixerMap.set(key, key.includes('vol') ? (key === 'HiHat_vol' ? -10 : 0) : 0);
            });
        }

        const syncReactState = () => {
            const newGrid = {};
            const newMelody = {};
            INSTRUMENTS.forEach(inst => { if (yGridMap.get(inst)) newGrid[inst] = yGridMap.get(inst).toArray(); });
            NOTES.forEach(note => { if (yMelodyMap.get(note)) newMelody[note] = yMelodyMap.get(note).toArray(); });
            setGrid(newGrid);
            setMelody(newMelody);
            setMixer(yMixerMap.toJSON()); // Sync mixer state
        };

        yGridMap.observeDeep(syncReactState);
        yMelodyMap.observeDeep(syncReactState);
        yMixerMap.observe(syncReactState); // Listen to knob turns
        syncReactState();

        const awareness = provider.awareness;
        awareness.setLocalStateField('user', {
            name: `Producer_${Math.floor(Math.random() * 1000)}`,
            color: '#' + Math.floor(Math.random()*16777215).toString(16),
            cursor: { x: 0, y: 0 }
        });

        awareness.on('change', () => {
            const users = Array.from(awareness.getStates().values()).filter(state => state.user).map(state => state.user);
            setAwarenessUsers(users);
        });

        return () => {
            provider.disconnect();
            ydoc.destroy();
        };
    }, [projectId]);

    const handleMouseMove = (e) => {
        if (providerRef.current && providerRef.current.awareness) {
            const state = providerRef.current.awareness.getLocalState();
            providerRef.current.awareness.setLocalState({ ...state, user: { ...state.user, cursor: { x: e.clientX, y: e.clientY } } });
        }
    };

    const toggleDrum = (instrument, stepIndex) => {
        const yArr = ydocRef.current.getMap('sequencer-grid').get(instrument);
        if (yArr) {
            yArr.delete(stepIndex, 1);
            yArr.insert(stepIndex, [!yArr.get(stepIndex)]);
        }
    };

    const toggleMelody = (note, stepIndex) => {
        const yArr = ydocRef.current.getMap('melody-grid').get(note);
        if (yArr) {
            yArr.delete(stepIndex, 1);
            yArr.insert(stepIndex, [!yArr.get(stepIndex)]);
        }
    };

    // NEW: Function to broadcast knob turns
    const changeMixer = (key, value) => {
        ydocRef.current.getMap('mixer-settings').set(key, parseFloat(value));
    };

    return { 
        status, grid, melody, mixer, awarenessUsers, 
        toggleDrum, toggleMelody, changeMixer, handleMouseMove, 
        startAudio: async () => await Tone.start() 
    };
}