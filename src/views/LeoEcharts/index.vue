<template>
  <div class="leo-echarts-container">
    <div class="leo-echarts" id="leoEchartsMap" :style="{ 'background-color': baseMapColor }"></div>
    <div class="leo-echarts" id="leoEcharts"></div>
  </div>
</template>

<script>
import * as echarts from "echarts";
import { leoEchartsOption, initEchartsMap, echartsMapZoomMove, echartsMapInstance } from "@/echartsLeoOptions/index.js";

import { mapState } from "pinia";
import { initLeoStore } from "@/store/LeoEcharts/initStore";
import { useLeoEchartsStore } from "@/store/LeoEcharts/useLeoEchartsStore";

let baseMapColor = window.echartsConfigLeo.baseMapColor || "#9bc0f8";
let myLeoChart = null;

export default {
  name: "LeoEcharts",
  components: {},
  props: {},
  watch: {},
  computed: { ...mapState(useLeoEchartsStore, ["xStart", "xEnd", "yStart", "yEnd"]) },
  data() {
    return {
      baseMapColor,
    };
  },

  mounted() {
    const leoEchartsStore = useLeoEchartsStore();
    const echartsMapDom = document.getElementById("leoEchartsMap");
    const echartsDom = document.getElementById("leoEcharts");
    window.addEventListener("resize", this.chartResize);

    initLeoStore(leoEchartsStore);
    initEchartsMap(echartsMapDom, leoEchartsStore);

    myLeoChart = echarts.init(echartsDom);
    myLeoChart.setOption(leoEchartsOption);

    myLeoChart.on("datazoom", (zoom) => {
      zoom.batch &&
        zoom.batch.map((item) => {
          if (item.dataZoomId === "xAxis") {
            leoEchartsStore.setXStart(item.start);
            leoEchartsStore.setXEnd(item.end);
          } else if (item.dataZoomId === "yAxis") {
            leoEchartsStore.setYStart(item.start);
            leoEchartsStore.setYEnd(item.end);
          }
        });

      echartsMapZoomMove(this.xStart, this.xEnd, this.yStart, this.yEnd);
    });
  },

  methods: {
    chartResize() {
      myLeoChart.resize();
      echartsMapInstance.resize();
    },
  },
  beforeUnmount() {},
};
</script>

<style lang="scss" scoped>
.leo-echarts-container {
  width: 100%;
  height: 100%;
  position: relative;

  .leo-echarts {
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
