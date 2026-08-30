/**
 * Web Audio API Oscillator Synthesizer & Speech Synthesis Utility
 * Generates custom sound chimes and text-to-speech voice alerts without external MP3 assets.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private voiceEnabled: boolean = true;
  private volume: number = 0.8;
  private rate: number = 1.0;

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
  }

  public getVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Play an urgent dual-tone alert chime (for fast expiring food < 2h)
   */
  public playUrgentChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      // Frequency sequence: High alert tones (880Hz -> 1174Hz)
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1174, now + 0.15);

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(587, now + 0.15);

      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.warn('AudioContext chime error:', e);
    }
  }

  /**
   * Play a pleasant success chime (for donation claim / proof of delivery)
   */
  public playSuccessChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.2 * this.volume, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch (e) {
      console.warn('AudioContext chime error:', e);
    }
  }

  /**
   * Text-to-Speech Voice Announcement
   */
  public speak(text: string) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.volume;
      utterance.rate = this.rate;
      utterance.pitch = 1.0;

      // Pick a natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Karen')));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }
}

export const soundManager = new SoundManager();
