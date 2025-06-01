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
  
  // Test victory sound
  setTimeout(() => timerAudio.playVictorySound(), 7000);
  
  // Test lose sound
  setTimeout(() => timerAudio.playLoseSound(), 9500);
  
  console.log('Audio test sequence started! Full sequence: countdown → game start → victory → defeat');
};

// Individual test functions
export const testVictory = () => {
  console.log('Testing victory sound...');
  timerAudio.playVictorySound();
};

export const testDefeat = () => {
  console.log('Testing defeat sound...');
  timerAudio.playLoseSound();
};

// Export for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testAudio = testAudio;
  (window as any).testVictory = testVictory;
  (window as any).testDefeat = testDefeat;
} 