// Tiny WebAudio sound effects, synthesised on the spot — no audio files, no
// network. Created lazily on the first gesture, so autoplay rules never block
// the game and a browser without audio just stays silent.
export function createAudio() {
  let context = null;
  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }
  function tone(freq, dur, type, vol, slideTo) {
    const ac = ensure();
    if (!ac) return;
    try {
      if (ac.state === 'suspended') void ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur);
    } catch {
      // Sound is garnish; a failure here must never stop the game.
    }
  }
  return {
    unlock() { ensure(); },
    jump() { tone(320, 0.16, 'square', 0.08, 640); },
    coin() { tone(880, 0.1, 'sine', 0.1, 1320); },
    feather() { tone(660, 0.22, 'triangle', 0.1, 1320); },
    hit() { tone(160, 0.25, 'sawtooth', 0.12, 60); },
    hidden() { tone(520, 0.18, 'sine', 0.08, 780); },
    stage() { tone(440, 0.12, 'triangle', 0.08, 660); tone(660, 0.16, 'triangle', 0.08, 880); },
    caught() { tone(220, 0.5, 'sawtooth', 0.12, 55); },
    escaped() {
      tone(523, 0.14, 'triangle', 0.1);
      setTimeout(() => tone(659, 0.14, 'triangle', 0.1), 140);
      setTimeout(() => tone(784, 0.26, 'triangle', 0.1), 280);
    },
  };
}
