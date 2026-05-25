import { TimeEngine } from "@/models/timeline";

let timeEngineInstance = null;
export function initTimeEngine() {
  const now = Date.now();
  timeEngineInstance = new TimeEngine({
    startTime: now - 1000 * 60 * 60 * 24 * 365 * 50,
    endTime: now + 1000 * 60 * 60 * 24 * 365 * 50,
    currentTime: now,
    speed: 1,
    loop: true,
    autoPauseAtStart: false,
  });

  timeEngineInstance.play();

  return timeEngineInstance;
}

export { timeEngineInstance };
