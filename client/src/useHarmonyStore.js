import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as Tone from 'tone';

const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/jam';
const STEPS = 16;
export const INSTRUMENTS = ['Kick', 'Snare', 'HiHat'];
export const NOTES = ['C4', 'A3', 'G3', 'E3', 'C3']; // Pentatonic scale for the melody

export function useHarmonyStore(projectId = 'jam-session-pro') {
    const [grid, setGrid] = useState({});
    const [melody, setMelody] = useState({});
    const [awarenessUsers, setAwarenessUsers] = useState([]);
    const [status, setStatus] = useState('disconnected');
    
    const ydocRef = useRef(null);
    const providerRef = useRef(null);

    useEffect(() => {
        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;
        
        const provider = new WebsocketProvider(WEBSOCKET_URL, projectId, ydoc);
        providerRef.current = provider;

        provider.on('status', event => setStatus(event.status));

        // --- FEATURE 1 & 2: THE GRIDS ---
        const yGridMap = ydoc.getMap('sequencer-grid');
        const yMelodyMap = ydoc.getMap('melody-grid');

        // Initialize Drums
        INSTRUMENTS.forEach(inst => {
            if (!yGridMap.has(inst)) {
                const yArray = new Y.Array();
                yArray.insert(0, Array(STEPS).fill(false));
                yGridMap.set(inst, yArray);
            }
        });

        // Initialize Melody (Piano Roll)
        NOTES.forEach(note => {
            if (!yMelodyMap.has(note)) {
                const yArray = new Y.Array();
                yArray.insert(0, Array(STEPS).fill(false));
                yMelodyMap.set(note, yArray);
            }
        });

        const syncReactState = () => {
            const newGrid = {};
            const newMelody = {};
            INSTRUMENTS.forEach(inst => { if (yGridMap.get(inst)) newGrid[inst] = yGridMap.get(inst).toArray(); });
            NOTES.forEach(note => { if (yMelodyMap.get(note)) newMelody[note] = yMelodyMap.get(note).toArray(); });
            setGrid(newGrid);
            setMelody(newMelody);
        };

        yGridMap.observeDeep(syncReactState);
        yMelodyMap.observeDeep(syncReactState);
        syncReactState();

        // --- FEATURE 3: LIVE AWARENESS (CURSORS) ---
        const awareness = provider.awareness;
        
        // Give this user a random color and name
        awareness.setLocalStateField('user', {
            name: `Producer_${Math.floor(Math.random() * 1000)}`,
            color: '#' + Math.floor(Math.random()*16777215).toString(16),
            cursor: { x: 0, y: 0 }
        });

        awareness.on('change', () => {
            // Get all active users in the room
            const users = Array.from(awareness.getStates().values())
                .filter(state => state.user)
                .map(state => state.user);
            setAwarenessUsers(users);
        });

        // --- FEATURE 4: TELEMETRY (Data Pipeline Prep) ---
        ydoc.on('update', (update) => {
             // In a full implementation, we would send this update to our Node server, 
             // which parses it and inserts it into our SQLite database for Power BI ingestion.
             // console.log("Telemetry Event Logged: State Mutated");
        });

        return () => {
            provider.disconnect();
            ydoc.destroy();
        };
    }, [projectId]);

    // Track mouse movements and broadcast to other users instantly
    const handleMouseMove = (e) => {
        if (providerRef.current && providerRef.current.awareness) {
            const state = providerRef.current.awareness.getLocalState();
            providerRef.current.awareness.setLocalState({
                ...state,
                user: { ...state.user, cursor: { x: e.clientX, y: e.clientY } }
            });
        }
    };

    const toggleDrum = (instrument, stepIndex) => {
        const yArr = ydocRef.current.getMap('sequencer-grid').get(instrument);
        if (yArr) {
            yArr.delete(stepIndex, 1);
            yArr.insert(stepIndex, [!yArr.get(stepIndex)]); // Toggles boolean
        }
    };

    const toggleMelody = (note, stepIndex) => {
        const yArr = ydocRef.current.getMap('melody-grid').get(note);
        if (yArr) {
            yArr.delete(stepIndex, 1);
            yArr.insert(stepIndex, [!yArr.get(stepIndex)]);
        }
    };

    return { 
        status, grid, melody, awarenessUsers, 
        toggleDrum, toggleMelody, handleMouseMove, 
        startAudio: async () => await Tone.start() 
    };
}