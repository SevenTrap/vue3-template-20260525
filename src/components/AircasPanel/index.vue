<template>
  <div class="aircas-panel" :ref="panelIDBox" :style="{ ...initStyle, 'z-index': currentPanelIndex }">
    <!-- 顶部区域 -->
    <div class="panel-head" v-show="isTitle" :ref="panelID" @click.stop="handlerChangeIndex">
      <div class="head-left">
        <img v-show="!isMin" src="@/assets/title-img.png" style="transform: rotatey(180deg)" />
        <span :title="title">{{ titleStr }}</span>
        <img v-show="!isMin" src="@/assets/title-img.png" />
      </div>

      <!-- 顶部右侧关闭按钮 -->
      <div class="head-right" v-show="isFunc">
        <FullScreen class="primary-btn" v-show="isMin" @click.stop="isMin = false" />
        <Minus class="primary-btn" v-show="!isMin" @click.stop="isMin = true" />
        <Close class="close-btn" @click.stop="handlerCloseAircasPanel" />
      </div>
    </div>

    <div class="panel-body" v-show="!isMin" :style="{ width: width + 'px', height: panelHeight }">
      <slot></slot>
    </div>
  </div>
</template>

<script>
import { v4 as uuidv4 } from "uuid";
import { useAircasPanelStore } from "@/store/useAircasPanelStore.js";
import { useDraggable } from "@vueuse/core";

export default {
  name: "AircasPanel",
  props: {
    title: {
      type: String,
      default: "插件面板",
    },
    isTitle: {
      type: Boolean,
      default: true,
    },
    width: {
      type: [Number, String],
      default: 300,
    },
    height: {
      type: [Number, String],
      default: 400,
    },
    top: {
      type: [Number, String],
      default: 120,
    },
    bottom: {
      type: [Number, String],
      default: -9999,
    },
    left: {
      type: [Number, String],
      default: 100,
    },
    right: {
      type: [Number, String],
      default: -9999,
    },
    isStatic: {
      type: Boolean,
      default: false,
    },
    isFunc: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      isMin: false,
      panelIDBox: null,
      panelID: null,
      currentPanelIndex: null,
      _top: null,
      _left: null,
    };
  },

  beforeMount() {
    this.panelID = uuidv4();
    this.panelIDBox = uuidv4();
    const store = useAircasPanelStore();
    this.currentPanelIndex = store.GET_CURRENT_PENAL_INDEX + 1;
    store.UPDATE_PENAL_INDEX(this.currentPanelIndex);
  },

  mounted() {
    const panelPage = this.$refs[this.panelID];
    const { x, y } = useDraggable(panelPage, {
      disabled: this.isStatic,
    });

    this._top = y;
    this._left = x;
  },

  computed: {
    initStyle() {
      let _style = {};
      if (isFinite(this.width)) {
        _style.width = this.width + "px";
      } else {
        _style.width = this.width;
      }

      if (this.isMin) _style.width = "200px";

      const panelWidth = this.$refs[this.panelIDBox]?.offsetWidth;
      const panelHeight = this.$refs[this.panelIDBox]?.offsetHeight;
      const windowsWidth = window.innerWidth;
      const windowsHeight = window.innerHeight;

      // 控制插件面板不能移动出屏幕外
      if (this._top != 0 || this._left != 0) {
        if (this._top < 0) this._top = 0;
        if (this._left < 0) this._left = 0;
        if (this._top + 38 > windowsHeight) this._top = windowsHeight - 38;
        if (this._left + panelWidth > windowsWidth) this._left = windowsWidth - panelWidth;

        _style.top = this._top + "px";
        _style.left = this._left + "px";
        return _style;
      }

      if (this.bottom != -9999) {
        if (isFinite(this.bottom)) {
          _style.bottom = this.bottom + "px";
        } else {
          _style.bottom = this.bottom;
        }
      } else {
        if (isFinite(this.top)) {
          _style.top = this.top + "px";
        } else {
          _style.top = this.top;
        }
      }

      if (this.right != -9999) {
        if (isFinite(this.right)) {
          _style.right = this.right + "px";
        } else {
          _style.right = this.right;
        }
      } else {
        if (isFinite(this.left)) {
          _style.left = this.left + "px";
        } else {
          _style.left = this.left;
        }
      }

      return _style;
    },

    // 设置弹窗高度
    panelHeight() {
      if (this.isTitle) {
        return isFinite(this.height) ? `${this.height - 38}px` : `calc(${this.height} - 38px)`;
      } else {
        return isFinite(this.height) ? `${this.height}px` : `${this.height}`;
      }
    },

    titleStr() {
      if (this.isMin) {
        if (this.title.length > 4) {
          return this.title.substring(0, 4) + "...";
        }
        return this.title;
      }
      return this.title;
    },
  },

  methods: {
    handlerChangeIndex() {
      const store = useAircasPanelStore();
      this.currentPanelIndex = store.GET_CURRENT_PENAL_INDEX + 1;
      store.UPDATE_PENAL_INDEX(this.currentPanelIndex);
    },

    handlerCloseAircasPanel() {
      this.$emit("close");
    },
  },
};
</script>

<style lang="scss" scoped>
.aircas-panel {
  position: fixed;
  overflow: hidden !important;
  border: 1px solid var(--aircas-color-border);
  border-radius: 4px;
  box-shadow: 0 0 3px 1px var(--aircas-color-border);
  background-color: var(--aircas-color-background);

  .panel-head {
    height: 38px;
    width: 100%;
    border-radius: 4px 4px 0px 0px;
    border-bottom: 1px solid var(--aircas-color-border);
    padding: 0 12px;
    background: var(--aircas-color-background);
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    cursor: move;

    .head-left {
      display: flex;
      align-items: center;

      span {
        font-size: 16px;
        padding: 0 5px;
        font-weight: bolder;
        color: #00ffff;
      }
    }

    // TODO 按钮的颜色以及hover颜色可以重新设计
    .head-right {
      display: flex;
      align-items: center;

      .primary-btn,
      .close-btn {
        font-size: 16px;
        font-weight: bold;
        width: 24px;
        height: 24px;
        padding: 2px;
        text-align: center;
        border-radius: 2px;
        color: #e1e1e1;
        background: rgba($color: #ffffff, $alpha: 0.2);
        margin-left: 3px;
        transition: all 0.3s;
        cursor: pointer;
      }

      .primary-btn:hover {
        background: var(--aircas-color-background-active);
      }

      .close-btn:hover {
        background: var(--aircas-color-close-button-active-background);
      }
    }
  }

  .panel-body {
    transition: all 0.3s;
    padding: 10px;
    overflow: auto;
  }
}
</style>
