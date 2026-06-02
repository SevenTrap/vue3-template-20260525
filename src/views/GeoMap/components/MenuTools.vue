<template>
  <div class="menu-tools">
    <el-tooltip content="场景控制" placement="top">
      <div class="menu-tool-item" :class="{ active: sceneControlPlugin }" @click="handleToggleGeoMap('sceneControlPlugin')">
        <img class="menu-tool-item-icon" src="/assets/menuBar/icon3.svg" />
      </div>
    </el-tooltip>

    <el-tooltip content="经高图" placement="top">
      <div class="menu-tool-item" :class="{ active: geoLngHeightEchartsPlugin }" @click="handleToggleGeoMap('geoLngHeightEchartsPlugin')">
        <img class="menu-tool-item-icon" src="/assets/menuBar/icon5.svg" />
      </div>
    </el-tooltip>

    <el-tooltip content="光照角图" placement="top">
      <div class="menu-tool-item" :class="{ active: geoSatRelativeEchartsPlugin }" @click="handleToggleGeoMap('geoSatRelativeEchartsPlugin')">
        <img class="menu-tool-item-icon" src="/assets/menuBar/icon4.svg" />
      </div>
    </el-tooltip>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";

export default {
  name: "MenuTools",
  computed: {
    ...mapState(useGeoMapStore, ["orbitViewControlPlugin", "sceneControlPlugin", "geoSatRelativeEchartsPlugin", "geoLngHeightEchartsPlugin"]),
  },
  methods: {
    handleToggleGeoMap(item) {
      const geoMapStore = useGeoMapStore();
      geoMapStore.TOGGLE_COMPONENT_VISIBLE(item);
    },
  },
};
</script>

<style lang="scss" scoped>
.menu-tools {
  position: fixed;
  bottom: 60px;
  right: 20px;
  width: 200px;
  height: 30px;
  z-index: 9999;
  display: flex;
  justify-content: flex-end;
  align-items: center;

  .menu-tool-item {
    cursor: pointer;
    margin: 0 5px;
    width: 30px;
    height: 30px;
    background-color: var(--aircas-color-background);
    border-radius: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid var(--aircas-color-white);
    transition: all 0.5s;

    .menu-tool-item-icon {
      width: 20px;
      height: 20px;
    }

    &:hover,
    &.active {
      background-color: var(--aircas-color-background-hover);
      border-color: var(--aircas-color-border);
    }
  }
}
</style>
