<template>
  <div class="menu-tools">
    <el-tooltip content="场景控制" placement="top">
      <div class="menu-tool-item" :class="{ active: sceneControlPlugin }" @click="handleToggleGeoMap('sceneControlPlugin')">
        <img class="menu-tool-item-icon" src="/assets/menuBar/icon3.svg" />
      </div>
    </el-tooltip>

    <el-tooltip content="场景控制（基础）" placement="top">
      <div class="menu-tool-item" :class="{ active: sceneControlPluginBase }" @click="handleToggleGeoMap('sceneControlPluginBase')">
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

    <el-tooltip content="变轨历程图" placement="top">
      <div class="menu-tool-item" :class="{ active: satelliteOrbitChangeEchartsPlugin }" @click="handleToggleGeoMap('satelliteOrbitChangeEchartsPlugin')">
        <img class="menu-tool-item-icon" src="/assets/menuBar/icon1.svg" />
      </div>
    </el-tooltip>

    <el-tooltip content="切换视角" placement="top">
      <div class="menu-tool-item" @click="handleToggleMapView()">
        <img class="menu-tool-item-icon" src="/assets/menuBar/icon7.svg" />
      </div>
    </el-tooltip>
  </div>
</template>

<script>
import * as mars3d from "mars3d";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { globalViewer } from "@/utils/initEarth";

export default {
  name: "MenuTools",
  computed: {
    ...mapState(useGeoMapStore, [
      "orbitViewControlPlugin",
      "sceneControlPlugin",
      "sceneControlPluginBase",
      "geoSatRelativeEchartsPlugin",
      "geoLngHeightEchartsPlugin",
      "satelliteOrbitChangeEchartsPlugin",
    ]),
  },
  data() {
    return {
      toggleMapView: false,
    };
  },
  methods: {
    handleToggleGeoMap(item) {
      const geoMapStore = useGeoMapStore();
      geoMapStore.TOGGLE_COMPONENT_VISIBLE(item);
    },

    handleToggleMapView() {
      if (this.toggleMapView) {
        this.flyToGlobal(107.5, -90, 160_000_000, 180, -90);
        this.toggleMapView = false;
      } else {
        this.flyToGlobal(107.5, 27, 120_000_000, 360, -89);
        this.toggleMapView = true;
      }
    },

    flyToGlobal(lon, lat, alt, heading, pitchDeg) {
      globalViewer.camera.flyTo({
        destination: mars3d.Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        orientation: {
          heading: mars3d.Cesium.Math.toRadians(heading),
          pitch: mars3d.Cesium.Math.toRadians(pitchDeg),
          roll: 0,
        },
        duration: 1.5,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.menu-tools {
  position: fixed;
  bottom: 60px;
  right: 20px;
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
