// Simple test utk audio functionality
import { timerAudio } from './audioUtils';

export const testAudio = () => {
  console.log('Testing audio functionality...');
  
  // Test countdown beeps
  setTimeout(() => timerAudio.playCountdownBeep(5), 100);
  setTimeout(() => timerAudio.playCountdownBeep(4), 1200);
  setTimeout(() => timerAudio.playCountdownBeep(3), 2300);
  setTimeout(() => timerAudio.playCountdownBeep(2), 3400);
  setTimeout(() => timerAudio.playCountdownBeep(1), 4500);
  
  // Test game start sound
  setTimeout(() => timerAudio.playGameStartSound(), 5600);
  
  console.log('Audio test sequence started!');
};

// Export for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testAudio = testAudio;
} 