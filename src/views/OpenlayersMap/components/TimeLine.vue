<template>
  <AircasPanel title="时间轴" width="1200" height="160" bottom="20" left="calc(50% - 600px)" :isTitle="false" @close="handlePanelClose">
    <div class="aircas-timeline">
      <header>
        <div class="state-controls">
          <button :class="{ active: stepIndex === 3 }" @click="setStep(3)">日制</button>
          <button :class="{ active: stepIndex === 2 }" @click="setStep(2)">时制</button>
          <button :class="{ active: stepIndex === 1 }" @click="setStep(1)">分制</button>
          <button :class="{ active: stepIndex === 0 }" @click="setStep(0)">秒制</button>
        </div>

        <div class="time-controls">
          <div class="start-and-stop" v-show="!isPlaying" @click="handleToggleTimeline(1)">
            <img src="/assets/svg/start-btn.svg" />
          </div>

          <div class="start-and-stop" v-show="isPlaying" @click="handleToggleTimeline(0)">
            <img src="/assets/svg/pause-btn.svg" />
          </div>

          <!-- <div class="current-time" @click="">{{ formatTimeShow(timeShow) }}</div> -->
          <el-date-picker
            class="current-time"
            v-model="timeShow"
            type="datetime"
            placeholder="设定开始时间"
            :clearable="false"
            @visible-change="handleToggleDatePicker()"
            @change="handleSetCurrentTime()"
          />

          <div class="start-and-stop" @click="timelineInstance.reset()">
            <img src="/assets/svg/reset-btn.svg" />
          </div>
        </div>

        <div class="speed-controls">
          <span class="speed-label">{{ speed.valueOf() }}&nbsp;x</span>
          <button @click="setSpeed(-1)">减速</button>
          <button @click="setSpeed(0)">常速</button>
          <button @click="setSpeed(1)">加速</button>
        </div>
      </header>

      <footer>
        <canvas ref="aircasTimelineRef"></canvas>
      </footer>
    </div>
  </AircasPanel>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { timeEngineInstance as timelineInstance } from "@/utils/initTimeEngine";
import dayjs from "dayjs";

const aircasTimelineRef = ref<HTMLCanvasElement | null>(null);
const stepScales = [1000, 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000];
const offsetX = 60; // 每个刻度线间距 60 像素

let isPlaying = ref(true);
let speed = ref(1);
let ctx: CanvasRenderingContext2D;
let width = 1168;
let height = 80;
let stepIndex = ref(0);
let timeShow = ref(timelineInstance.currentTime);

onMounted(() => {
  const canvas = aircasTimelineRef.value;
  ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;

  timelineInstance.onTick(draw);
  draw(timelineInstance.currentTime);
  enableInteraction(canvas);
});

function draw(currentTime: number) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 16px Arial";
  ctx.textAlign = "center";

  const centerX = width / 2;
  const step = stepScales[stepIndex.value];

  const visibleStart = currentTime - (centerX / offsetX) * step;
  const visibleEnd = currentTime + (centerX / offsetX) * step;
  const firstTick = Math.floor(visibleStart / step) * step;

  for (let time = firstTick; time < visibleEnd; time += step) {
    const x = ((time - visibleStart) / step) * offsetX;

    const timeText = formatTime(time);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(x, 30);
    ctx.lineTo(x, 50);
    ctx.stroke();
    ctx.fillText(timeText, x, 70);
  }

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.lineTo(width, 40);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(centerX, 10);
  ctx.lineTo(centerX, 70);
  ctx.stroke();

  speed.value = timelineInstance.speed;
  timeShow.value = currentTime;
}

function setStep(index: number) {
  stepIndex.value = index;
}

function setSpeed(x: number) {
  if (speed.value < 0 && x < 0) {
    speed.value = -1 * speed.value * 2 * x;
  } else if (speed.value > 0 && x > 0) {
    speed.value = 1 * speed.value * 2 * x;
  } else if (x === 0) {
    speed.value = 1;
  } else {
    speed.value = x * 2;
  }

  timelineInstance.setSpeed(speed.value);
}

function formatTimeShow(d: number) {
  return dayjs(d).format("YYYY-MM-DD HH:mm:ss");
}

function handleSetCurrentTime() {
  const setTimeNow = dayjs(timeShow.value).valueOf();

  timelineInstance.setTime(setTimeNow);
}

function handleToggleDatePicker() {
  if (isPlaying.value === true) {
    timelineInstance.pause();
    isPlaying.value = false;
  } else {
    timelineInstance.play();
    isPlaying.value = true;
  }
}

function handleToggleTimeline(tag: number) {
  if (tag === 0) {
    timelineInstance.pause();
    isPlaying.value = false;
  } else {
    timelineInstance.play();
    isPlaying.value = true;
  }
}

function formatTime(d: number) {
  if (stepIndex.value === 0) {
    return dayjs(d).format("ss");
  } else if (stepIndex.value === 1) {
    return dayjs(d).format("mm");
  } else if (stepIndex.value === 2) {
    return dayjs(d).format("HH");
  } else if (stepIndex.value === 3) {
    return dayjs(d).format("DD");
  } else {
    return "";
  }
}

function enableInteraction(canvas: HTMLCanvasElement) {
  let dragging = false;
  let lastX = 0;

  canvas.addEventListener("mousedown", (e) => {
    dragging = true;
    lastX = e.clientX;
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const step = stepScales[stepIndex.value];
    const dx = e.clientX - lastX;
    lastX = e.clientX;

    timelineInstance.setTime(timelineInstance.currentTime - (dx / offsetX) * step);
  });
}

function handlePanelClose() {
  this.$emit("close");
}
</script>

<style lang="scss" scoped>
.aircas-timeline {
  font-size: 14px;
  color: #ffffff;

  button {
    font-size: 14px;
    background: rgba(33, 135, 168, 0.4);
    width: 60px;
    height: 28px;
    outline: none;
    border: 1px solid var(--aircas-color-border);
    border-radius: 3px;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: rgba(33, 135, 168, 0.8);
    }

    &.active {
      background: rgba(33, 135, 168, 1);
    }
  }

  .speed-label {
    font-weight: bolder;
    font-size: 16px;
    color: #ffffff;
    width: 60px;
    text-align: right;
  }

  .current-time {
    font-weight: bolder;
    font-size: 18px;
    color: #ffffff;
  }
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 10px 0;

  .state-controls {
    width: 280px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .speed-controls {
    width: 280px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .time-controls {
    width: 300px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .start-and-stop {
      font-size: 14px;
      width: 40px;
      height: 28px;
      outline: none;
      border-radius: 3px;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;

      &:hover {
        background: rgba(33, 135, 168, 0.8);
      }

      img {
        width: 22px;
        height: 22px;
      }
    }
  }
}

footer {
  padding: 5px;
  border: 1px solid var(--aircas-color-border);
  border-radius: 3px;

  canvas {
    width: 1168px;
    height: 80px;
  }
}

:deep(.aircas-timeline) {
  .current-time {
    .el-input__prefix {
      display: none;
    }

    .el-input__wrapper {
      box-shadow: none;

      &:hover {
        box-shadow: 0 0 0 1px var(--el-input-hover-border-color) inset;
      }

      .el-input__inner {
        padding-left: 15px;
        font-weight: bolder;
        font-size: 18px;
        color: #ffffff;
      }
    }
  }
}
</style>
