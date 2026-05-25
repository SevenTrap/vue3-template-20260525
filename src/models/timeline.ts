type TickCallback = (time: number) => void;

interface TimeEngineOptions {
  startTime: number;
  endTime: number;
  currentTime: number;
  speed: number;
  loop: boolean;
  autoPauseAtStart: boolean;
}

export class TimeEngine {
  startTime: number;
  endTime: number;
  currentTime: number;
  speed: number;
  loop: boolean;
  autoPauseAtStart: boolean;

  private isPlaying = false;
  private rafId = 0;
  private lastRealTime = 0;
  private listeners = new Set<TickCallback>();

  constructor(options: TimeEngineOptions) {
    this.startTime = options.startTime;
    this.endTime = options.endTime;
    this.currentTime = options.currentTime ?? options.startTime;
    this.speed = options.speed ?? 1;
    this.loop = options.loop ?? true;
    this.autoPauseAtStart = options.autoPauseAtStart ?? true;
  }

  onTick(callback: TickCallback) {
    this.listeners.add(callback);
  }

  offTick(callback: TickCallback) {
    this.listeners.delete(callback);
  }

  private emit() {
    this.listeners.forEach((callback) => callback(this.currentTime));
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastRealTime = performance.now();
    this.tick();
  }

  pause() {
    this.isPlaying = false;
    cancelAnimationFrame(this.rafId);
  }

  reset() {
    this.speed = 1;
    this.currentTime = Date.now();
    this.emit();
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  setTime(time: number) {
    this.currentTime = Math.min(Math.max(time, this.startTime), this.endTime);
    this.emit();
  }

  getTime() {
    return this.currentTime;
  }

  private tick = () => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = now - this.lastRealTime;
    this.lastRealTime = now;

    this.currentTime += delta * this.speed;

    // 结束边界
    if (this.currentTime > this.endTime) {
      if (this.loop) {
        this.currentTime = this.startTime;
      } else {
        this.pause();
        return;
      }
    }

    // 开始边界（倒放）
    if (this.currentTime < this.startTime) {
      if (this.autoPauseAtStart) {
        this.pause();
        this.currentTime = this.startTime;
        this.emit();
        return;
      }
    }

    this.emit();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
