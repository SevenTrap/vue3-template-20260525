<template>
  <div ref="geoEarthContainer" class="earth-container"></div>

  <!-- 页面左侧菜单栏组件 -->
  <MenuBarPlugin></MenuBarPlugin>

  <!-- 所有插件在此处需要进行handleClose处理 -->
  <AircasManagerLayersPlugin></AircasManagerLayersPlugin>

  <AircasGraphicLayersPlugin></AircasGraphicLayersPlugin>

  <!-- 卫星树插件 -->
  <SatelliteTreePlugin></SatelliteTreePlugin>

  <!-- 卫星热度图插件 -->
  <SatelliteHeatH3Plugin></SatelliteHeatH3Plugin>

  <!-- GEO卫星相对距离与光照角插件 -->
  <GeoSatRelativeEchartsPlugin></GeoSatRelativeEchartsPlugin>

  <div class="page-control-btns">
    <div>
      <button @click="handleToggleGeoCirclePositions">切换同步轨道带</button>
      <button @click="handleToggleGeoCircleLabel">切换标签</button>
      <button @click="handleToggleCoord">切换坐标</button>
    </div>
  </div>
</template>

<script>
import * as mars3d from "mars3d";
import dayjs from "dayjs";
import { initViewer, globalViewer } from "@/utils/initEarth";
import { addGeoCirclePositions, removeGeoCirclePositions, addGeoCircleLabel, removeGeoCircleLabel } from "@/utils/mars3d/mars3dGeoStyle.js";
import SatelliteOrbitPredictor from "@/models/satelliteOrbitPredictor.js";

import MenuBarPlugin from "./components/MenuBarPlugin.vue";
import SatelliteTreePlugin from "./components/SatelliteTreePlugin.vue";
import SatelliteHeatH3Plugin from "./components/SatelliteHeatH3Plugin.vue";
import GeoSatRelativeEchartsPlugin from "./components/GeoSatRelativeEchartsPlugin.vue";
import SatelliteClass from "@/models/SatelliteClass";

import { addSatelliteOribitByLLAs } from "./utils/mars3dSatellite";

export default {
  name: "GeoMap",
  components: {
    MenuBarPlugin,
    SatelliteTreePlugin,
    SatelliteHeatH3Plugin,
    GeoSatRelativeEchartsPlugin,
  },

  data() {
    return {
      satelliteOrbitPredictors: [],
      satellites: [
        {
          name: "USA 283",
          tle1: "1 43339U 18036A   25232.51155694 -.00000336  00000+0  00000+0 0  9991",
          tle2: "2 43339   0.0109  82.1801 0000136 127.7304  77.3977  1.00268843  4385",
        },
        {
          name: "USA 324",
          tle1: "1 51280U 22006A   25230.52081339 -.00000289  00000+0  00000+0 0  9997",
          tle2: "2 51280   0.0465  61.2521 0000064 333.6095  48.7536  1.00558581 13098",
        },
      ],
      satelliteClasses: new Map(),
    };
  },

  mounted() {
    let earthContainer = this.$refs.geoEarthContainer;
    MAP_CONFIG_Satellite.scene.center = { lat: 29, lng: 105, alt: 20000000, heading: 360, pitch: -89.8 };
    initViewer(earthContainer, MAP_CONFIG_Satellite);

    addGeoCirclePositions(globalViewer);
    addGeoCircleLabel(globalViewer);

    this.initSatellitesClass();
    // this.addSatellitesOribit();

    // const epoch = new Date("2025-08-17T18:35:56.320Z");
    // const satelliteOrbitPredictor = new SatelliteOrbitPredictor(elements, epoch);
    // const position = satelliteOrbitPredictor.getPosition(new Date("2025-08-17T18:35:56.320Z"));
    // console.log("当前卫星位置 (ECEF):", position);
  },

  methods: {
    initSatellitesClass() {
      this.satellites.forEach((sat) => {
        const satelliteClass = new SatelliteClass(sat.name, sat.tle1, sat.tle2);
        this.satelliteClasses.set(satelliteClass.noradID, satelliteClass);

        const curDate = dayjs("2026-03-24 00:00:00");
        console.time(satelliteClass.noradID);

        const llas = satelliteClass.getLLAsByPeriod(curDate, 60 * 1000);

        addSatelliteOribitByLLAs(llas, llas, satelliteClass.noradID);

        console.timeEnd(satelliteClass.noradID);
        console.log(satelliteClass.noradID, llas, satelliteClass.noradID);
      });
    },

    // addSatellitesOribit() {
    //   this.satelliteClasses.forEach(satellieClass => {
    //     console.log(satellieClass.)
    //   })
    // },

    handleToggleGeoCirclePositions() {
      const entity = globalViewer.entities.getById("geoCirclePositionsEntity");
      if (entity) {
        removeGeoCirclePositions(globalViewer);
      } else {
        addGeoCirclePositions(globalViewer);
      }
    },
    handleToggleGeoCircleLabel() {
      const layer = globalViewer.getLayerById("geoLabelGraphicLayer");
      if (layer) {
        removeGeoCircleLabel(globalViewer);
      } else {
        addGeoCircleLabel(globalViewer);
      }
    },
  },

  beforeUnmount() {
    globalViewer.destroy();
  },
};
</script>

<style lang="scss" scoped>
.earth-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.page-control-btns {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;

  button {
    margin-right: 10px;
    padding: 5px 10px;
    font-size: 14px;
    cursor: pointer;
  }
}
</style>
