<template>
  <div class="geo-echarts-container">
    <div class="geo-echarts" id="geoEchartsMap" :style="{ 'background-color': baseMapColor }"></div>
    <div class="geo-echarts" id="geoEcharts"></div>
  </div>
</template>

<script>
import * as echarts from "echarts";

import {
  geoEchartsOption,
  initEchartsMap,
  echartsMapZoomMove,
  echartsMapInstance,
  formatZoomHeightToYAxis,
  formatZoomWidthToxAxis,
} from "@/echartsGeoOptions/index";

import { mapState } from "pinia";
import { initGeoStore } from "./store/initStore";
import { useGeoEchartsStore } from "./store/useGeoEchartsStore";

let baseMapColor = window.echartsConfigGeo.baseMapColor || "#9bc0f8";
let myGeoChart = null;

export default {
  name: "GeoEcharts",
  data() {
    return {
      baseMapColor,
    };
  },
  mounted() {
    const geoEchartsStore = useGeoEchartsStore();
    const echartsMapDom = document.getElementById("geoEchartsMap");
    const echartsDom = document.getElementById("geoEcharts");
    window.addEventListener("resize", this.chartResize);

    initGeoStore(geoEchartsStore);
    initEchartsMap(echartsMapDom, geoEchartsStore);

    myGeoChart = echarts.init(echartsDom);
    myGeoChart.setOption(geoEchartsOption);

    // 鼠标滚动缩放地图时，需要动态设置
    myGeoChart.on("datazoom", (zoom) => {
      if (zoom.batch && zoom.batch.length > 0) {
        geoEchartsStore.setXStart(formatZoomWidthToxAxis(zoom.batch[0].start));
        geoEchartsStore.setXEnd(formatZoomWidthToxAxis(zoom.batch[0].end));
      } else {
        geoEchartsStore.setYStart(formatZoomHeightToYAxis(zoom.start));
        geoEchartsStore.setYEnd(formatZoomHeightToYAxis(zoom.end));
      }

      echartsMapZoomMove(this.xStart, this.xEnd, this.yStart, this.yEnd);
    });
  },
  watch: {},
  computed: { ...mapState(useGeoEchartsStore, ["yAxisMin", "yAxisMax", "xStart", "xEnd", "yStart", "yEnd"]) },
  beforeUnmount() {},
  methods: {
    chartResize() {
      myGeoChart.resize();
      echartsMapInstance.resize();
    },
  },
};
</script>

<style lang="scss" scoped>
.geo-echarts-container {
  width: 100%;
  height: 100%;
  position: relative;

  .geo-echarts {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
