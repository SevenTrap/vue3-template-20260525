<template>
  <div class="titlebar-box">
    <!-- 中间区域：菜单栏、标题栏 -->
    <div class="titlebar">
      <div class="title-menu">
        <div
          class="title-menu-item menu-left"
          :class="{ 'menu-left-active': item.name === curPageName, 'small-size': item.label.length > 6 }"
          @click="handleJumpPage(item)"
          v-for="(item, index) in menuListLeft"
          :key="index"
        >
          {{ item.label }}
        </div>
      </div>

      <div class="title-center">
        <!-- 天文时间 -->
        <div class="titlebar-time">
          <div class="time-top">
            <div class="time-type" style="background-color: #ff6326">天文时间</div>
            <div class="time-date">{{ curDate }}</div>
          </div>

          <p class="time-bottom">
            <span>{{ curHour }}</span>
            :
            <span>{{ curMin }}</span>
            :
            <span>{{ curSec }}</span>
          </p>
        </div>

        <!-- 系统标题 -->
        <div class="system-title">
          <span>{{ systemTitle }}</span>
        </div>

        <!-- 作战时间 -->
        <div class="titlebar-time">
          <div class="time-top">
            <div class="time-type" style="background-color: #ffd142">作战时间</div>
            <div class="time-date">{{ opDate }}</div>
          </div>

          <p class="time-bottom">
            <span>{{ opHour }}</span>
            :
            <span>{{ opMin }}</span>
            :
            <span>{{ opSec }}</span>
          </p>
        </div>
      </div>

      <div class="title-menu">
        <div
          class="title-menu-item menu-right"
          :class="{ 'menu-right-active': item.name === curPageName }"
          @click="handleJumpPage(item)"
          v-for="(item, index) in menuListRight"
          :key="index"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const systemTitle = SYSTEM_CONFIG.systemTitle;
const menuListLeft = SYSTEM_CONFIG.menuListLeft;
const menuListRight = SYSTEM_CONFIG.menuListRight;

import dayjs from "dayjs";
import { globalViewer } from "@/utils/index.js";

export default {
  name: "TitleBar",
  data() {
    return {
      systemTitle,
      menuListLeft,
      menuListRight,

      timeInterval: null,
      curPageLabel: "",
      curPageName: "",

      curDate: "",
      curHour: "",
      curSec: "",
      curMin: "",
      opDate: "",
      opHour: "",
      opMin: "",
      opSec: "",
    };
  },

  mounted() {
    this.timeInterval = setInterval(() => {
      this.resetTime();
    }, 1000);

    this.resetTime();
  },

  methods: {
    // 页面头部时间更新函数
    resetTime() {
      // 更新本地系统时间
      const currentTime = new Date();
      this.curDate = dayjs(currentTime).format("YYYY-MM-DD");
      this.curHour = dayjs(currentTime).format("HH");
      this.curSec = dayjs(currentTime).format("ss");
      this.curMin = dayjs(currentTime).format("mm");

      // 通过获取web球的当前时间来更新作战时间
      try {
        const operationTime = globalViewer?.clock?.currentTime;
        this.opDate = dayjs(operationTime).format("YYYY-MM-DD");
        this.opHour = dayjs(operationTime).format("HH");
        this.opMin = dayjs(operationTime).format("mm");
        this.opSec = dayjs(operationTime).format("ss");
      } catch (error) {
        const operationTime = new Date();
        this.opDate = dayjs(operationTime).format("YYYY-MM-DD");
        this.opHour = dayjs(operationTime).format("HH");
        this.opMin = dayjs(operationTime).format("mm");
        this.opSec = dayjs(operationTime).format("ss");
      }
    },

    // 导航菜单页面跳转
    handleJumpPage(item) {
      this.$router.push({
        path: item.path,
      });
    },
  },

  watch: {
    $route: {
      handler(val) {
        this.curPageLabel = val.meta.label;
        this.curPageName = val.name;
      },
      immediate: true,
      deep: true,
    },
  },

  beforeUnmount() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  },
};
</script>

<style lang="scss" scoped>
.titlebar-box {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100vw;
  height: 85px;
  z-index: 10;

  .titlebar {
    width: 100%;
    height: 100%;
    position: relative;
    background-image: url("./assets/head-title.png");
    background-size: 100% 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    user-select: none;

    .title-menu {
      width: 31%;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: s;

      .title-menu-item {
        cursor: pointer;
        width: 150px;
        height: 28px;
        line-height: 28px;
        font-size: 18px;
        margin: 0 10px;
        font-weight: bold;
        text-align: center;
        color: var(--aircas-color-text);
        transition: all 0.3s;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &.menu-left {
          background-image: url("./assets/menu-left.png");
          background-size: 100% 100%;

          &:hover {
            color: var(--aircas-color-white);
            background-image: url("./assets/menu-left-active.png");
          }

          &.menu-left-active {
            color: var(--aircas-color-white);
            background-image: url("./assets/menu-left-active.png");
          }
        }

        &.menu-right {
          background-image: url("./assets/menu-right.png");
          background-size: 100% 100%;

          &:hover {
            color: var(--aircas-color-white);
            background-image: url("./assets/menu-right-active.png");
          }

          &.menu-right-active {
            color: var(--aircas-color-white);
            background-image: url("./assets/menu-right-active.png");
          }
        }
      }

      .small-size {
        font-size: 14px;
      }
    }

    .title-center {
      display: flex;
      align-self: center;
      align-items: center;
      justify-content: center;
      width: 35%;
      height: 100%;

      .system-title {
        width: calc(100% - 300px);
        display: flex;
        align-items: center;
        font-size: 26px;
        letter-spacing: 5px;
        color: var(--aircas-color-white);
        font-weight: bold;
        justify-content: center;
        align-self: center;
        text-align: center;
      }

      .titlebar-time {
        width: 140px;
        height: 45px;
        background-size: 100% 100%;
        background-image: url("./assets/time-box.png");
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-around;

        .time-top {
          width: 100%;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: space-around;

          .time-type {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 50px;
            height: 100%;
            font-size: 10px;
            color: #000000;
            border-radius: 2px;
          }

          .time-date {
            font-family: DS;
            font-size: 14px;
            letter-spacing: 0px;
            color: var(--aircas-color-white);
          }
        }

        .time-bottom {
          width: 120px;
          height: 26px;
          text-align: center;
          font-family: DS-Digital;
          font-size: 24px;
          letter-spacing: 2px;
          color: var(--aircas-color-white);
          display: flex;
          align-items: center;
          justify-content: space-between;

          span {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 33px;
            height: 100%;
          }
        }
      }
    }
  }
}
</style>
