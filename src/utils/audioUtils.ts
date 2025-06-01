// Audio utility utk timer sounds dgn Web Audio API
export class TimerAudio {
  public audioContext: AudioContext | null = null; // Make public for audio state checks

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializeAudioContext();
    }
  }

  private initializeAudioContext() {
    try {
      if (typeof window !== 'undefined') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  // Play countdown beep - higher pitch for early counts, lower for final countdown
  playCountdownBeep(count: number, totalCount: number = 5) {
    if (!this.audioContext || typeof window === 'undefined') return;

    // Resume audio context if suspended (iOS requirement)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Calculate frequency based on countdown - higher pitch for early, lower for final
    const baseFreq = count <= 3 ? 800 : 400; // Final 3 seconds get higher pitch
    const frequency = baseFreq + (count * 50);
    
    // Oscillator utk tone generation
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Set frequency and waveform
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = count <= 3 ? 'square' : 'sine'; // Square wave for urgency
    
    // Set volume envelope - quick attack, sustained, quick decay
    const currentTime = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
    
    // Play beep
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.3);
  }

  // Play game start sound - celebratory tone
  playGameStartSound() {
    if (!this.audioContext || typeof window === 'undefined') return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Play ascending chord progression
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    const currentTime = this.audioContext.currentTime;

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.frequency.setValueAtTime(freq, currentTime);
      oscillator.type = 'sine';
      
      const startTime = currentTime + (index * 0.1);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.4);
    });
  }

  // Play ready notification sound - gentle ping
  playReadySound() {
    if (!this.audioContext || typeof window === 'undefined') return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
    oscillator.type = 'sine';
    
    const currentTime = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.2);
  }

  // Play victory song - celebratory melody
  playVictorySound() {
    if (!this.audioContext || typeof window === 'undefined') return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Victory melody: C5-E5-G5-C6 (major chord ascending) 
    const victoryMelody = [
      { freq: 523.25, start: 0, duration: 0.3 },     // C5
      { freq: 659.25, start: 0.2, duration: 0.3 },   // E5  
      { freq: 783.99, start: 0.4, duration: 0.3 },   // G5
      { freq: 1046.5, start: 0.6, duration: 0.5 },   // C6 (octave)
      { freq: 1046.5, start: 1.0, duration: 0.2 },   // C6 repeat
      { freq: 783.99, start: 1.2, duration: 0.2 },   // G5
      { freq: 1046.5, start: 1.4, duration: 0.6 }    // C6 finale
    ];

    const currentTime = this.audioContext.currentTime;

    victoryMelody.forEach(note => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.frequency.setValueAtTime(note.freq, currentTime + note.start);
      oscillator.type = 'triangle'; // Warm, celebratory tone
      
      const startTime = currentTime + note.start;
      const endTime = startTime + note.duration;
      
      // Volume envelope for musical expression
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.2, endTime - 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }

  // Play lose song - sad descending melody
  playLoseSound() {
    if (!this.audioContext || typeof window === 'undefined') return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Sad melody: C5-A4-F4-D4 (descending minor)
    const sadMelody = [
      { freq: 523.25, start: 0, duration: 0.4 },     // C5
      { freq: 440.00, start: 0.35, duration: 0.4 },  // A4
      { freq: 349.23, start: 0.7, duration: 0.4 },   // F4
      { freq: 293.66, start: 1.05, duration: 0.6 },  // D4 (long, sad ending)
      { freq: 261.63, start: 1.6, duration: 0.8 }    // C4 (final descent)
    ];

    const currentTime = this.audioContext.currentTime;

    sadMelody.forEach(note => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.frequency.setValueAtTime(note.freq, currentTime + note.start);
      oscillator.type = 'sawtooth'; // Slightly harsh, melancholic tone
      
      const startTime = currentTime + note.start;
      const endTime = startTime + note.duration;
      
      // Slower, sadder volume envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.1, endTime - 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }
}

// Singleton instance - only create in browser environment
export const timerAudio = typeof window !== 'undefined' ? new TimerAudio() : null as any; 