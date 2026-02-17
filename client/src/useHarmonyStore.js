import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as Tone from 'tone';

// Uses your live URL if deployed, otherwise falls back to localhost
const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/jam';
const STEPS = 16;
export const INSTRUMENTS = ['Kick', 'Snare', 'HiHat'];

export function useHarmonyStore(projectId = 'jam-session-1') {
    const [grid, setGrid] = useState({});
    const [status, setStatus] = useState('disconnected');
    const ydocRef = useRef(null);
    const providerRef = useRef(null);

    useEffect(() => {
        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;
        
        const provider = new WebsocketProvider(WEBSOCKET_URL, projectId, ydoc);
        providerRef.current = provider;

        provider.on('status', event => setStatus(event.status));

        // Create a Y.Map to hold our drum grid
        const yGridMap = ydoc.getMap('sequencer-grid');

        // Initialize the grid with empty arrays if they don't exist yet
        INSTRUMENTS.forEach(inst => {
            if (!yGridMap.has(inst)) {
                const yArray = new Y.Array();
                yArray.insert(0, Array(STEPS).fill(false)); // 16 steps, all false (off)
                yGridMap.set(inst, yArray);
            }
        });

        const syncReactState = () => {
            const newGrid = {};
            INSTRUMENTS.forEach(inst => {
                const yArr = yGridMap.get(inst);
                if (yArr) newGrid[inst] = yArr.toArray();
            });
            setGrid(newGrid);
        };

        // ObserveDeep watches for ANY changes inside the arrays and triggers a re-render
        yGridMap.observeDeep(() => syncReactState());
        
        // Initial load
        syncReactState();

        return () => {
            provider.disconnect();
            ydoc.destroy();
        };
    }, [projectId]);

    // Function to toggle a beat on/off
    const toggleStep = (instrument, stepIndex) => {
        const yGridMap = ydocRef.current.getMap('sequencer-grid');
        const yArr = yGridMap.get(instrument);
        if (yArr) {
            const currentValue = yArr.get(stepIndex);
            // Yjs arrays require delete/insert to update a specific index
            yArr.delete(stepIndex, 1);
            yArr.insert(stepIndex, [!currentValue]);
        }
    };

    return { 
        status, 
        grid, 
        toggleStep, 
        startAudio: async () => await Tone.start() 
    };
}