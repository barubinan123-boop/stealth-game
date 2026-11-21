// Sound, synthesised with WebAudio and nothing else: no audio files, no
// network, just oscillators and filtered noise. The game starts silent until
// the first key or click, as browsers require, and M toggles it.

export function makeAudio() {
  let ctx = null;
  let muted = false;
  let stepFlip = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(frequency, duration, type, gainValue, slideTo) {
    const audio = ensure();
    if (!audio || muted) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noiseBurst(duration, gainValue, lowpass) {
    const audio = ensure();
    if (!audio || muted) return;
    const now = audio.currentTime;
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    source.start(now);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    play(event) {
      if (event === 'pickup') {
        tone(660, 0.12, 'sine', 0.16);
        setTimeout(() => tone(990, 0.18, 'sine', 0.16), 90);
      } else if (event === 'caught') {
        tone(220, 0.5, 'sawtooth', 0.18, 55);
        noiseBurst(0.3, 0.2, 800);
      } else if (event === 'clear' || event === 'win') {
        [523, 659, 784, 1047].forEach((freq, i) => setTimeout(() => tone(freq, 0.22, 'triangle', 0.16), i * 110));
      } else if (event === 'spotted') {
        tone(880, 0.14, 'square', 0.1, 1240);
      } else if (event === 'noise') {
        stepFlip = !stepFlip;
        noiseBurst(0.05, 0.05, 500 + (stepFlip ? 200 : 0));
      } else if (event === 'click') {
        tone(440, 0.06, 'sine', 0.08);
      }
    },
  };
}
