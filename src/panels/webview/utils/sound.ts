/**
 * Sound Manager for webview games
 * Returns JavaScript code as a string for the webview
 */

export function getSoundManagerScript(): string {
  return `
// ===================== SOUND MANAGER =====================
const SoundManager = {
  ctx: null,
  enabled: true,
  volume: 0.3,
  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this.enabled = false;
      }
    }
  },
  play(type) {
    if (!this.enabled) return;
    if (!this.ctx) this.init();
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.ctx?.resume();
      return;
    }
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      const sounds = {
        eat: [440, 0.1, 'square', 1.5],
        crash: [150, 0.2, 'sawtooth', 0.5],
        merge: [520, 0.15, 'sine', 1.2],
        clear: [660, 0.25, 'triangle', 1.3],
        jump: [380, 0.08, 'square', 1.4],
        flip: [300, 0.1, 'sine', 1.0],
        spin: [200, 0.05, 'square', 1.0],
        win: [523, 0.3, 'sine', 1.5],
        bigwin: [659, 0.4, 'sine', 1.8],
        lose: [180, 0.25, 'sawtooth', 0.6],
        drop: [250, 0.08, 'triangle', 1.2],
        click: [600, 0.04, 'square', 1.0],
        move: [350, 0.05, 'sine', 1.0],
        lock: [220, 0.1, 'triangle', 0.8],
        levelup: [440, 0.3, 'sine', 1.4]
      };
      const [freq, dur, wave, pitchMult] = sounds[type] || [440, 0.1, 'sine', 1.0];
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * pitchMult, this.ctx.currentTime + dur * 0.5);
      gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (e) { /* Audio error - ignore */ }
  },
  playSequence(notes, interval = 100) {
    notes.forEach((note, i) => {
      setTimeout(() => this.play(note), i * interval);
    });
  }
};
`;
}
