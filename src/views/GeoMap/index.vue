<template>
  <div ref="geoEarthContainer" class="earth-container" :class="$attrs.class"></div>

  <!-- 页面左侧菜单栏组件 -->
  <MenuBarPlugin></MenuBarPlugin>
  <MenuTools></MenuTools>

  <!-- 所有插件在此处需要进行handleClose处理 -->
  <AircasManagerLayersPlugin></AircasManagerLayersPlugin>

  <AircasGraphicLayersPlugin></AircasGraphicLayersPlugin>

  <!-- 卫星树插件 -->
  <SatelliteTreePlugin></SatelliteTreePlugin>

  <!-- GEO卫星相对距离与光照角插件 -->
  <GeoSatRelativeEchartsPlugin></GeoSatRelativeEchartsPlugin>

  <!-- 卫星经度与相对同步轨道高度插件 -->
  <GeoLngHeightEchartsPlugin></GeoLngHeightEchartsPlugin>

  <!-- 场景控制插件 -->
  <SceneControlPlugin></SceneControlPlugin>
  <SceneControlPluginBase></SceneControlPluginBase>
  <!-- 历史案例插件 -->
  <HistoryCasePlugin></HistoryCasePlugin>
</template>

<script>
import * as mars3d from "mars3d";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { initViewer, globalViewer } from "@/utils/initEarth";
import { addGeoCirclePositions, addGeoCircleLabel, addPatrolArea } from "@/utils/mars3d/mars3dGeoStyle.js";

import MenuBarPlugin from "./components/MenuBarPlugin.vue";
import MenuTools from "./components/MenuTools.vue";
import SatelliteTreePlugin from "./components/SatelliteTreePlugin.vue";
import GeoSatRelativeEchartsPlugin from "./components/GeoSatRelativeEchartsPlugin.vue";
import GeoLngHeightEchartsPlugin from "./components/GeoLngHeightEchartsPlugin.vue";

import SceneControlPlugin from "./components/SceneControlPlugin.vue";
import SceneControlPluginBase from "./components/SceneControlPluginBase.vue";
import HistoryCasePlugin from "./components/HistoryCasePlugin.vue";

import { computeSatRelativeData } from "./utils/satelliteLngHeight";
import { julianDateToTimeMs } from "./utils/mars3dRelativeTrajectory";
import { SCENE_LISTS } from "./configs/index";

const geoMapStore = useGeoMapStore();

export default {
  name: "GeoMap",
  components: {
    MenuBarPlugin,
    MenuTools,
    SatelliteTreePlugin,
    GeoSatRelativeEchartsPlugin,
    GeoLngHeightEchartsPlugin,

    SceneControlPlugin,
    SceneControlPluginBase,
    HistoryCasePlugin,
  },

  data() {
    return {
      timer: null,
      sceneId: "1",
      currentScene: {},
    };
  },

  async mounted() {
    this.currentScene = SCENE_LISTS.find((scene) => scene.sceneID === this.sceneId);
    geoMapStore.SET_STATE_DATA({ key: "currentSceneConfig", value: this.currentScene });
    let earthContainer = this.$refs.geoEarthContainer;
    initViewer(earthContainer, MAP_CONFIG_Satellite);

    this.$nextTick(() => {
      addGeoCircleLabel(globalViewer);
      addGeoCirclePositions(globalViewer);
      addPatrolArea(globalViewer);
      this.initScene();
    });

    this.timer = setInterval(() => {
      this.updateSceneTime();
    }, 1000);
  },

  computed: {
    ...mapState(useGeoMapStore, [
      "sceneID",
      "threatTargetID",
      "importTargetID",
      "threatTargetName",
      "importTargetName",
      "threatTles",
      "importTles",
      "startTime",
      "endTime",
      "timeStep",
    ]),
  },

  methods: {
    initScene() {
      if (!this.currentScene?.sceneID || this.currentScene.sceneID !== this.sceneId) return;

      const result = computeSatRelativeData(this.currentScene);
      // globalViewer.currentTime = mars3d.Cesium.JulianDate.fromDate(new Date(this.currentScene.startTime));

      globalViewer.clock.stopTime = mars3d.Cesium.JulianDate.fromDate(new Date(this.currentScene.endTime));
      globalViewer.clock.startTime = mars3d.Cesium.JulianDate.fromDate(new Date(this.currentScene.startTime));
      globalViewer.clock.currentTime = mars3d.Cesium.JulianDate.fromDate(new Date(this.currentScene.startTime));
      globalViewer.clock.clockRange = mars3d.Cesium.ClockRange.LOOP_STOP;
      globalViewer.clock.shouldAnimate = true;
      geoMapStore.SET_STATE_DATA({ key: "satRelativeData", value: result });
    },

    updateSceneTime() {
      const currentSceneTimeMs = julianDateToTimeMs(globalViewer.currentTime);
      geoMapStore.SET_STATE_DATA({ key: "currentSceneTimeMs", value: currentSceneTimeMs });
    },
  },

  beforeUnmount() {
    globalViewer.destroy();
    clearInterval(this.timer);
  },
};
</script>

<style lang="scss" scoped>
.earth-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
