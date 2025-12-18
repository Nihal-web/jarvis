let audioCtx: AudioContext | null = null;
let ambientNodes: { osc1: OscillatorNode, osc2: OscillatorNode, gain: GainNode } | null = null;

const getCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
}

export const playSystemStart = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.5);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
};

export const playConnectChime = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2);

    // Futuristic Major Chord Arpeggio
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { 
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(t + i * 0.05);
        osc.stop(t + 2);
    });
};

export const playDisconnectChime = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    // Descending sequence
    [1046.50, 783.99, 659.25, 523.25].forEach((freq, i) => { 
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(t + i * 0.05);
        osc.stop(t + 0.8);
    });
};

export const playWakeWordDetected = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // High tech chirp
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.15);
}

export const startAmbientHum = () => {
    if (ambientNodes) return;
    const ctx = getCtx();
    const t = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Create a beating effect for a "power hum"
    osc1.type = 'sine';
    osc1.frequency.value = 60; 

    osc2.type = 'sine';
    osc2.frequency.value = 62; // 2Hz beat
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.02, t + 3); // Slow fade in, very subtle volume
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start(t);
    osc2.start(t);
    
    ambientNodes = { osc1, osc2, gain };
}

export const stopAmbientHum = () => {
    if (ambientNodes) {
        const ctx = getCtx();
        const t = ctx.currentTime;
        const { osc1, osc2, gain } = ambientNodes;
        
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + 1);
        
        osc1.stop(t + 1);
        osc2.stop(t + 1);
        
        ambientNodes = null;
    }
}
