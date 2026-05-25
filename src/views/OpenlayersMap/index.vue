<template>
  <div class="openlayers-map">
    <div id="openlayersMap" class="ol-map-container"></div>

    <div class="openlayers-map-control">
      <el-button type="primary" @click="addSatellite">添加卫星轨道</el-button>
      <el-button type="primary" @click="handleRemoveSatelliteOrbit">移除卫星轨道</el-button>
      <el-button type="primary" @click="handleRemoveSatellite">移除卫星</el-button>
      <el-button type="primary" @click="isShowTimeline = !isShowTimeline">切换时间轴</el-button>

      <TimeLine v-if="isShowTimeline"></TimeLine>
    </div>
  </div>
</template>

<script>
import dayjs from "dayjs";

import { olMapInstance, initOpenlayersMap, addSatelliteOrbit, addSatellitePoint, removeFeatureById } from "./utils/ol";
import SatelliteClass from "@/models/SatelliteClass";

import TimeLine from "./components/TimeLine.vue";
import { timeEngineInstance } from "@/utils/initTimeEngine";

export default {
  name: "OpenlayersMap",
  components: {
    TimeLine,
  },
  data() {
    return {
      isShowTimeline: false,
      satelliteModel: null,
      satelliteModels: new Map(),
    };
  },
  mounted() {
    console.log("OpenLayersMap mounted");
    const mapDom = document.getElementById("openlayersMap");
    initOpenlayersMap(mapDom);
    this.initSatellite();

    timeEngineInstance.onTick((currentTime) => {
      // console.log(currentTime);
      this.updateSatellite(currentTime);
    });
  },
  methods: {
    initSatellite() {
      const satelliteModel = new SatelliteClass(
        "STARLINK-34653",
        "1 64917U 25157P   25232.67017632  .00068891  00000+0  12352-2 0  9999",
        "2 64917  53.1598 210.9678 0001875  84.2401 275.8822 15.49322436  5135",
      );
      this.satelliteModel = satelliteModel;
      this.satelliteModels.set(satelliteModel.noradID, satelliteModel);

      // console.log(timeEngineInstance.getTime());
    },

    addSatellite() {
      const llas = this.satelliteModel.getLLAsByPeriod(new Date(), 1000);

      const lineId = this.satelliteModel.noradID;
      addSatelliteOrbit(lineId, llas);
    },

    updateSatellite(currentTime) {
      const curDate = new Date(currentTime);
      const lla = this.satelliteModel.getState(curDate);
      addSatellitePoint(lla.noradID, lla);
    },

    handleRemoveSatelliteOrbit() {
      removeFeatureById("satelliteOrbits", this.satelliteModel.noradID);
    },

    handleRemoveSatellite() {
      removeFeatureById("satellitePoints", this.satelliteModel.noradID);
      removeFeatureById("satelliteOrbits", this.satelliteModel.noradID);
    },
  },
};
</script>

<style lang="scss" scoped>
.openlayers-map {
  position: relative;
  width: 100%;
  height: 100%;

  .ol-map-container {
    width: 100%;
    height: 100%;
  }

  .openlayers-map-control {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
  }
}
</style>
