/** Original generative score. No files, third-party samples, or network requests. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private step = 0;
  music = false;
  effects = true;
  volume = 0.3;
  battle = false;
  async unlock(): Promise<void> {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.master!.gain.value = this.volume * 0.25;
      if (!this.timer) this.timer = setInterval(() => this.tick(), 240);
    } catch {
      /* Audio is optional on unsupported browsers. */
    }
  }
  private tone(
    frequency: number,
    start: number,
    length: number,
    gain: number,
    type: OscillatorType = 'sine',
  ): void {
    if (!this.ctx || !this.master || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(gain, start + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.001, start + length);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(start);
    osc.stop(start + length + 0.03);
    osc.onended = () => {
      osc.disconnect();
      amp.disconnect();
    };
  }
  private tick(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.value = this.volume * 0.25;
    if (!this.music || document.hidden) return;
    const notes = this.battle
      ? [57, 60, 64, 69, 64, 60, 67, 64, 53, 57, 60, 65, 60, 57, 64, 60]
      : [
          69, 76, 72, 0, 67, 72, 71, 0, 65, 72, 69, 0, 64, 71, 67, 0, 62, 69, 65, 0, 64, 71, 67, 0,
          69, 72, 76, 0, 71, 67, 64, 0,
        ];
    const midi = notes[this.step % notes.length];
    const now = this.ctx.currentTime;
    if (midi)
      this.tone(440 * 2 ** ((midi - 69) / 12), now, this.battle ? 0.27 : 1.3, 0.23, 'triangle');
    if (this.step % 8 === 0) {
      const root = [45, 41, 38, 40][Math.floor(this.step / 8) % 4];
      for (const offset of [0, 7, 12])
        this.tone(440 * 2 ** ((root + offset - 69) / 12), now, 2.1, 0.15);
    }
    if (this.battle && this.step % 2 === 0) this.tone(65, now, 0.1, 0.3, 'triangle');
    this.step++;
  }
  sfx(kind: 'click' | 'hit' | 'magic' | 'heal' | 'victory' | 'step'): void {
    if (!this.effects || !this.ctx) return;
    const now = this.ctx.currentTime;
    const sequences = {
      click: [660],
      hit: [130, 65],
      magic: [440, 660, 880],
      heal: [523, 659, 784],
      victory: [523, 659, 784, 1047],
      step: [90],
    };
    sequences[kind].forEach((n, i) =>
      this.tone(
        n,
        now + i * 0.075,
        kind === 'victory' ? 0.5 : 0.16,
        kind === 'step' ? 0.06 : 0.3,
        kind === 'hit' ? 'sawtooth' : 'triangle',
      ),
    );
  }
  destroy(): void {
    clearInterval(this.timer);
    void this.ctx?.close();
  }
}
