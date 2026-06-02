<!-- cesium球左侧公共菜单栏组件 -->

<!-- <i v-if="item.iconType === 'fa'" class="user-icon fa" :class="`fa-${item.iconName}`" aria-hidden="true"></i> -->
<!-- <img v-if="item.iconType === 'img'" :src="item.iconName" /> -->
<!-- <el-icon v-if="item.iconType === 'element'" class="user-icon"> -->
<!-- <component :is="item.iconName" /> -->
<!-- </el-icon> -->
<template>
  <div class="menu-bar">
    <el-tooltip content="图层管理" placement="right">
      <div class="menu-item" :class="{ active: aircasManagerLayersPlugin }" @click="handleToggleAircasPlugin('aircasManagerLayersPlugin')">
        <img src="/assets/menuBar/icon10.svg" />
      </div>
    </el-tooltip>

    <el-tooltip content="海水温度可视化" placement="right">
      <div class="menu-item" :class="{ active: sstLayer }" @click="handleToggleMenu('sstLayer')">
        <img src="/assets/menuBar/icon9.svg" />
      </div>
    </el-tooltip>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useAircasPluginStore } from "@/store/useAircasPluginStore.js";
import { useCesiumDemoStore } from "@/store/useCesiumDemoStore.js";

export default {
  name: "MenuBar",

  computed: {
    ...mapState(useCesiumDemoStore, ["layerManager", "sstLayer"]),
    ...mapState(useAircasPluginStore, ["aircasManagerLayersPlugin"]),
  },

  methods: {
    handleToggleMenu(item) {
      const cesiumDemoStore = useCesiumDemoStore();
      cesiumDemoStore.TOGGLE_COMPONENT_VISIBLE(item);
    },

    handleToggleAircasPlugin(item) {
      const aircasPluginStore = useAircasPluginStore();
      aircasPluginStore.TOGGLE_COMPONENT_VISIBLE(item);
    },
  },
};
</script>

<style lang="scss" scoped>
.menu-bar {
  position: absolute;
  top: 120px;
  left: 10px;
  width: 60px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #0186855c;
  border: 1px solid #018a87;
  border-radius: 4px;

  .menu-item {
    cursor: pointer;
    width: 45px;
    height: 45px;
    background-color: #001922;
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 6px 0;
    flex-direction: column;
    transition: all 0.5s;
    color: #ffffff;

    &:hover,
    &.active {
      background: rgba($color: #ad5b18, $alpha: 0.85);
    }

    img {
      width: 30px;
      height: 30px;
    }
  }
}
</style>
