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
const draggedLabelOffsets = {};
let isDragging = false;
let dragIndex = null;
let startPos = null;
let startOffset = null;

export default {
  name: "SatelliteOrbitChangeEchartsPlugin",
  data() {
    return {};
  },

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

    formatHeightToDeg(item) {
      return Math.round(item * -0.0128 * 100) / 100;
    },

    initEcharts() {
      if (!this.chartInstance) return;

      const { satelliteNoradIDs, satelliteTles, startTime, endTime } = this.currentSceneConfig;
      const startDateMs = dayjs(startTime).hour(0).minute(0).second(0).millisecond(0).valueOf();
      const endDateMs = dayjs(endTime).hour(23).minute(59).second(59).millisecond(999).valueOf();
      const commonDatePoint = [];
      const allSatelliteData = [];
      const allSatelliteSeriesData = [];

      for (let i = startDateMs; i <= endDateMs; i += 1000 * 60 * 60 * 24) {
        const currentDate12 = dayjs(i).hour(12).minute(0).second(0).millisecond(0).valueOf();
        commonDatePoint.push(currentDate12);
      }

      let minLon = 999;
      let maxLon = -999;
      let minHeight = 9999;
      let maxHeight = -9999;

      for (let i = 0; i < satelliteNoradIDs.length; i++) {
        let startLon = null;
        const currentSatelliteData = [];
        const currentSatelliteSeriesData = [];
        const satelliteNoradID = satelliteNoradIDs[i];
        const currentSatelliteTles = satelliteTles[i];
        const { satelliteEpochs, satelliteClasses } = buildSatelliteClassEpochMap(satelliteNoradID, currentSatelliteTles);
        const allDatePoint = [...commonDatePoint, ...satelliteEpochs].sort((a, b) => a - b);

        for (let i = 0; i < allDatePoint.length; i++) {
          const currentTimeMs = allDatePoint[i];
          const currentEpoch = pickSatByTime(satelliteEpochs, currentTimeMs);
          const satelliteClass = satelliteClasses.get(currentEpoch);
          const aHeightDiff = Number((satelliteClass.a - geoAltitudeKm - earthRadiusKm).toFixed(2));
          const degOneDay = this.formatHeightToDeg(aHeightDiff);
          const currentTimeTrack = satelliteClass.getState(new Date(currentTimeMs));
          const timeShow = dayjs(currentTimeMs).format("MM-DD HH:mm");
          currentTimeTrack.timeShow = timeShow;
          currentTimeTrack.a = satelliteClass.a;
          currentTimeTrack.aHeightDiff = aHeightDiff;
          currentTimeTrack.changePoint = String(currentTimeMs).length === 13 ? false : true;

          if (i === 0) {
            currentTimeTrack.currentLon = currentTimeTrack.lon;
          } else {
            let curDegByTime = (degOneDay * (currentTimeMs - allDatePoint[i - 1])) / (24 * 60 * 60 * 1000);
            currentTimeTrack.currentLon = currentSatelliteData[i - 1].currentLon + curDegByTime;
          }

          if (currentTimeTrack.currentLon < minLon) minLon = currentTimeTrack.currentLon;
          if (currentTimeTrack.currentLon > maxLon) maxLon = currentTimeTrack.currentLon;
          if (currentTimeTrack.aHeightDiff < minHeight) minHeight = currentTimeTrack.aHeightDiff;
          if (currentTimeTrack.aHeightDiff > maxHeight) maxHeight = currentTimeTrack.aHeightDiff;

          const currentTimeSeries = {
            value: [currentTimeTrack.currentLon, currentTimeTrack.aHeightDiff, currentTimeTrack],
            symbol: currentTimeTrack.changePoint ? "triangle" : "circle",
            label: {
              show: currentTimeTrack.changePoint,
              color: "#ffffff",
              align: "center",
              formatter: function (params) {
                return `${params.data.value[2].noradID} \r\n ${params.data.value[2].timeShow} \r\n ${params.data.value[2].aHeightDiff} km`;
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
          currentSatelliteData.push(currentTimeTrack);
          currentSatelliteSeriesData.push(currentTimeSeries);
        }

        const seriesData = {
          name: satelliteNoradID,
          type: "line",
          showSymbol: true,
          symbolSize: 10,
          labelLayout: (params) => {
            const key = params.text;
            const offset = draggedLabelOffsets[key];

            if (offset) {
              return {
                hideOverlap: true,
                draggable: true,
                x: params.labelRect.x + params.labelRect.width * 0.5 + offset.dx,
                y: params.labelRect.y + offset.dy,
              };
            }
            return {
              hideOverlap: true,
              draggable: true,
              x: params.labelRect.x,
              y: params.labelRect.y,
            };
          },
          data: currentSatelliteSeriesData,
        };

        allSatelliteData.push(currentSatelliteData);
        allSatelliteSeriesData.push(seriesData);
      }

      let lonLenght = (maxLon - minLon) * 0.1;
      let heightLength = (maxHeight - minHeight) * 0.1;
      minLon = Number((minLon - lonLenght).toFixed(2));
      maxLon = Number((maxLon + lonLenght).toFixed(2));
      minHeight = Number((minHeight - heightLength).toFixed(2));
      maxHeight = Number((maxHeight + heightLength).toFixed(2));

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
        toolbox: {
          show: true,
          right: 12,
          top: 6,
          feature: {
            dataZoom: {},
            restore: {},
            saveAsImage: {
              type: "png",
              name: `${new Date().getTime()}-变轨历程图`,
            },
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "cross",
            label: {
              backgroundColor: "#505765",
            },
          },
          formatter: function (params) {
            let result = "";
            for (let i = 0; i < params.length; i++) {
              result += `时间：${params[i].value[2].timeShow}<br/> 经度：${params[i].value[0].toFixed(2)}°<br/> 高度：${params[i].value[1].toFixed(2)} km`;
            }

            return result;
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
          name: "经度",
          min: minLon,
          max: maxLon,
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
          min: minHeight,
          max: maxHeight,
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
        series: allSatelliteSeriesData,
      };

      this.chartInstance.setOption(option);

      this.chartInstance.getZr().on("mousedown", (e) => {
        if (e.target && e.target.parent?.style?.text) {
          isDragging = true;
          dragIndex = e.target.parent.style.text;
          startPos = [e.offsetX, e.offsetY];
          startOffset = draggedLabelOffsets[dragIndex] || { dx: 0, dy: 0 };
        }
      });

      this.chartInstance.getZr().on("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.offsetX - startPos[0] + startOffset.dx;
        const dy = e.offsetY - startPos[1] + startOffset.dy;
        draggedLabelOffsets[dragIndex] = { dx, dy };
      });

      this.chartInstance.getZr().on("mouseup", (e) => {
        isDragging = false;
        dragIndex = null;
      });
    },

    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("satelliteOrbitChangeEchartsPlugin");
    },
  },

  beforeUnmount() {
    if (this.chartInstance) {
      this.chartInstance.off("finished");
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
    draggedLabelOffsets = {};
  },
};
</script>

<style lang="scss" scoped>
.echarts-container {
  width: 880px;
  height: 442px;
}
</style>
