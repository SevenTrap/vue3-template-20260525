<template>
  <div ref="geoEarthContainer" class="earth-container" :class="$attrs.class"></div>

  <!-- 页面左侧菜单栏组件 -->
  <MenuBarPlugin></MenuBarPlugin>
  <MenuTools></MenuTools>

  <!-- 所有插件在此处需要进行handleClose处理 -->
  <AircasManagerLayersPlugin></AircasManagerLayersPlugin>

  <AircasGraphicLayersPlugin></AircasGraphicLayersPlugin>

  <!-- 卫星树插件 -->
  <!-- <SatelliteTreePlugin></SatelliteTreePlugin> -->

  <!-- GEO卫星相对距离与光照角插件 -->
  <!-- <GeoSatRelativeEchartsPlugin></GeoSatRelativeEchartsPlugin> -->

  <!-- 卫星经度与相对同步轨道高度插件 -->
  <!-- <GeoLngHeightEchartsPlugin></GeoLngHeightEchartsPlugin> -->

  <!-- 场景控制插件 -->
  <!-- <SceneControlPlugin></SceneControlPlugin> -->
  <!-- <SceneControlPluginBase></SceneControlPluginBase> -->
  <!-- 历史案例插件 -->
  <!-- <HistoryCasePlugin></HistoryCasePlugin> -->
</template>

<script>
import * as mars3d from "mars3d";
import dayjs from "dayjs";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { initViewer, globalViewer, setCesiumClockRange } from "@/utils/initEarth";
import { addGeoCirclePositions, addGeoCircleLabel, addPatrolArea } from "@/utils/mars3d/mars3dGeoStyle.js";

import MenuBarPlugin from "./components/MenuBarPlugin.vue";
import MenuTools from "./components/MenuTools.vue";
import SatelliteTreePlugin from "./components/SatelliteTreePlugin.vue";
import GeoSatRelativeEchartsPlugin from "./components/GeoSatRelativeEchartsPlugin.vue";
import GeoLngHeightEchartsPlugin from "./components/GeoLngHeightEchartsPlugin.vue";

import SceneControlPlugin from "./components/SceneControlPlugin.vue";
import SceneControlPluginBase from "./components/SceneControlPluginBase.vue";
import HistoryCasePlugin from "./components/HistoryCasePlugin.vue";

import { calculateSatellitePosition } from "./utils/satelliteCalculate.js";
import { initMars3dLayers, satelliteSceneLayer } from "./utils/initMars3dLayers.js";
import {
  addSatelliteOrbitSceneECEF,
  addSatelliteOrbitSceneECI,
  toggleImportSatelliteTrajectory,
  toggleThreatSatelliteTrajectory,
  toggleSatelliteImageDirection,
  toggleSatelliteLightDirection,
  toggleSatelliteModel,
} from "./utils/mars3dSatellite.js";
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
    };
  },

  async mounted() {
    const currentScene = SCENE_LISTS.find((scene) => scene.sceneID === this.sceneId);
    geoMapStore.SET_STATE_DATA({ key: "currentSceneConfig", value: currentScene });

    let earthContainer = this.$refs.geoEarthContainer;
    initViewer(earthContainer, MAP_CONFIG_Satellite);

    this.$nextTick(() => {
      addGeoCircleLabel(globalViewer);
      addGeoCirclePositions(globalViewer);
      addPatrolArea(globalViewer);
      initMars3dLayers();

      this.initSceneClockRange();
      this.initSatelliteTracks();
    });

    this.timer = setInterval(() => {
      this.updateSceneTime();
    }, 100);
  },

  computed: {
    ...mapState(useGeoMapStore, ["sceneID", "currentSceneConfig", "satRelativeData", "clockStartTime", "clockEndTime"]),
  },

  methods: {
    // 初始化场景时钟范围
    initSceneClockRange() {
      if (!this.sceneId) return;

      const { closeTime, timeFront, timeBack } = this.currentSceneConfig;
      const clockStartTime = dayjs(closeTime).subtract(timeFront, "ms").valueOf();
      const clockEndTime = dayjs(closeTime).add(timeBack, "ms").valueOf();
      geoMapStore.SET_STATE_DATA({ key: "clockStartTime", value: clockStartTime });
      geoMapStore.SET_STATE_DATA({ key: "clockEndTime", value: clockEndTime });

      setCesiumClockRange(globalViewer, clockStartTime, clockEndTime);
    },

    // 初始化卫星轨迹
    initSatelliteTracks() {
      const { startTime, endTime, timeStep, satelliteNoradIDs, satelliteTles } = this.currentSceneConfig;

      const satelliteTracks = new Map();

      for (let i = 0; i < satelliteNoradIDs.length; i++) {
        const satelliteTrack = calculateSatellitePosition(satelliteNoradIDs[i], satelliteTles[i], startTime, endTime, timeStep);
        satelliteTracks.set(satelliteNoradIDs[i], satelliteTrack);
      }

      addSatelliteOrbitSceneECEF(satelliteSceneLayer, satelliteTracks, this.clockStartTime, this.clockEndTime);

      addSatelliteOrbitSceneECI(satelliteSceneLayer, satelliteTracks, this.clockStartTime, this.clockEndTime);

      geoMapStore.SET_STATE_DATA({ key: "satelliteTracks", value: satelliteTracks });

      // const calculateStartTime = calculateSatellitePosition();
      // addSatelliteOrbitSceneECEF(satelliteSceneLayer, this.satRelativeData);
      // // addSatelliteOrbitSceneECI(satelliteSceneLayer, this.currentScene);
      // toggleSatelliteImageDirection(satelliteSceneLayer, false);
      // toggleSatelliteLightDirection(satelliteSceneLayer, true);
      // // toggleImportSatelliteOrbit(satelliteSceneLayer, false);
      // // toggleThreatSatelliteOrbit(satelliteSceneLayer, false);
      // toggleImportSatelliteTrajectory(satelliteSceneLayer, true);
      // toggleThreatSatelliteTrajectory(satelliteSceneLayer, true);

      // toggleSatelliteModel(satelliteSceneLayer, false);
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
