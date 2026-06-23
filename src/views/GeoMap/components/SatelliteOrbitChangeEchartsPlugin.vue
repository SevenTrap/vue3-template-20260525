<template>
  <aircas-panel
    v-show="satelliteOrbitChangeEchartsPlugin"
    title="变轨历程图"
    width="900"
    height="500"
    top="120"
    left="calc(50% - 450px)"
    @close="handlePanelClose"
  >
    <div class="echarts-container" ref="satelliteOrbitChangeChart"></div>
  </aircas-panel>
</template>

<script>
import * as echarts from "echarts";
import { mapState } from "pinia";
import dayjs from "dayjs";
import { geoAltitudeKm, earthRadiusKm } from "@/utils/constants";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { buildSatelliteClassEpochMap, pickSatByTime } from "../utils/satelliteCalculate";

const geoMapStore = useGeoMapStore();

export default {
  name: "SatelliteOrbitChangeEchartsPlugin",
  computed: {
    ...mapState(useGeoMapStore, ["satelliteOrbitChangeEchartsPlugin", "currentSceneConfig"]),
  },

  watch: {
    satelliteOrbitChangeEchartsPlugin(visible) {
      if (!visible) return;

      this.$nextTick(() => {
        this.ensureChartReady();
        this.initEcharts();
      });
    },
  },

  methods: {
    ensureChartReady() {
      const container = this.$refs.satelliteOrbitChangeChart;
      if (!container) return;
      if (!this.chartInstance) this.chartInstance = echarts.init(container);
    },
    initEcharts() {
      if (!this.chartInstance) return;

      console.log("initEcharts2", this.chartInstance);

      const { satelliteNoradIDs, satelliteTles, startTime, endTime } = this.currentSceneConfig;
      const startDateMs = dayjs(startTime).hour(0).minute(0).second(0).millisecond(0).valueOf();
      const endDateMs = dayjs(endTime).hour(23).minute(59).second(59).millisecond(999).valueOf();
      const commonDatePoint = [];

      const allSatelliteSeriesData = [];
      const allSeriesData = [];

      for (let i = startDateMs; i <= endDateMs; i += 1000 * 60 * 60 * 24) {
        const currentDate12 = dayjs(i).hour(12).minute(0).second(0).millisecond(0).valueOf();
        commonDatePoint.push(currentDate12);
      }

      for (let i = 0; i < satelliteNoradIDs.length; i++) {
        const currentSatelliteSeriesData = [];
        const satelliteNoradID = satelliteNoradIDs[i];
        const currentSatelliteTles = satelliteTles[i];
        const { satelliteEpochs, satelliteClasses } = buildSatelliteClassEpochMap(satelliteNoradID, currentSatelliteTles);
        const allDatePoint = [...commonDatePoint, ...satelliteEpochs].sort((a, b) => a - b);

        for (let i = 0; i < allDatePoint.length; i++) {
          const currentTimeMs = allDatePoint[i];
          const currentEpoch = pickSatByTime(satelliteEpochs, currentTimeMs);
          const satelliteClass = satelliteClasses.get(currentEpoch);
          const currentTimeTrack = satelliteClass.getState(new Date(currentTimeMs));
          const timeShow = dayjs(currentTimeMs).format("MM-DD HH:mm");
          const aHeightDiff = Number((satelliteClass.a - geoAltitudeKm - earthRadiusKm).toFixed(2));

          console.log(aHeightDiff, "aHeightDiff");
          currentTimeTrack.a = satelliteClass.a;
          currentTimeTrack.aHeightDiff = aHeightDiff;
          currentTimeTrack.changePoint = String(currentTimeMs).length === 13 ? false : true;

          const currentData = {
            value: [currentTimeTrack.lon, currentTimeTrack.aHeightDiff, currentTimeTrack],
            symbol: currentTimeTrack.changePoint ? "triangle" : "circle",
            label: {
              show: currentTimeTrack.changePoint,
              align: "center",
              formatter: function (params) {
                return `${params.data.value[2].aHeightDiff} \r\n ${params.data.value[2].time}`;
              },
            },
            labelLine: {
              show: currentTimeTrack.changePoint,
              showAbove: true,
              length2: 10,
              lineStyle: {
                color: "#bbb",
              },
            },
          };
          currentSatelliteSeriesData.push(currentData);
        }

        const seriesData = {
          name: satelliteNoradID,
          type: "line",
          showSymbol: true,
          symbolSize: 10,
          labelLayout: (params) => {
            console.log("params", params);
            return {
              draggable: true,
              x: params.labelRect.x,
              y: params.labelRect.y,
            };
          },

          data: currentSatelliteSeriesData,
        };

        allSatelliteSeriesData.push(currentSatelliteSeriesData);
        allSeriesData.push(seriesData);
      }

      const option = {
        legend: {
          data: satelliteNoradIDs,
          top: 8,
          itemStyle: {
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 400,
          },
          textStyle: {
            color: "#ffffff",
          },
        },
        grid: [{ left: 50, right: 80, top: 40, bottom: 50 }],
        dataZoom: [
          // x 轴：鼠标滚轮/拖拽缩放
          {
            type: "inside",
            xAxisIndex: 0,
            filterMode: "none",
            zoomOnMouseWheel: true,
            moveOnMouseWheel: false,
            moveOnMouseMove: true,
          },
          {
            type: "slider",
            xAxisIndex: 0,
            height: 20,
            bottom: 5,
            filterMode: "none",
          },
          // y 轴：鼠标滚轮/拖拽缩放（垂直）
          {
            type: "inside",
            yAxisIndex: 0,
            filterMode: "none",
            zoomOnMouseWheel: true,
            moveOnMouseWheel: false,
            moveOnMouseMove: true,
          },
          {
            type: "slider",
            yAxisIndex: 0,
            width: 20,
            right: 5,
            filterMode: "none",
          },
        ],
        xAxis: {
          type: "value",
          min: "dataMin",
          max: "dataMax",
          name: "经度",
          nameLocation: "middle",
          nameGap: 30,
          nameTextStyle: {
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 400,
          },
          axisLabel: {
            color: "#ffffff",
          },
          axisLine: {
            lineStyle: {},
          },
        },
        yAxis: {
          type: "value",
          name: "高度",
          nameLocation: "middle",
          nameGap: 30,
          nameTextStyle: {
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 400,
          },
          axisLabel: {
            color: "#ffffff",
          },
          axisLine: {
            lineStyle: {},
          },
        },
        series: allSeriesData,
      };

      console.log(allSeriesData);

      this.chartInstance.setOption(option);
    },
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("satelliteOrbitChangeEchartsPlugin");
    },
  },
};
</script>

<style lang="scss" scoped>
.echarts-container {
  width: 880px;
  height: 442px;
}
</style>
