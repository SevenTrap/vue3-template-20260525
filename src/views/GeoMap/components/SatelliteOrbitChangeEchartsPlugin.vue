<template>
  <aircas-panel
    v-show="satelliteOrbitChangeEchartsPlugin"
    title="变轨历程图"
    width="1400"
    height="670"
    top="120"
    left="calc(50% - 700px)"
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
          let symbolUrl = null;
          let symbolSize = 15;
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
          if (currentTimeTrack.changePoint) {
            symbolUrl = "path://M512 108.7L634.3 373.5L928 401.3L710.3 589.7L761.7 883.3L512 737.5L262.3 883.3L313.7 589.7L96 401.3L389.7 373.5L512 108.7Z";
            symbolSize = 25;
          } else {
            symbolUrl = "circle";
          }

          const currentTimeSeries = {
            value: [currentTimeTrack.currentLon, currentTimeTrack.aHeightDiff, currentTimeTrack],
            symbol: symbolUrl,
            symbolSize: symbolSize,
            label: {
              show: currentTimeTrack.changePoint,
              color: "#ffffff",
              align: "center",
              fontSize: 16,
              formatter: function (params) {
                return `${params.data.value[2].noradID} \r\n ${params.data.value[2].timeShow} \r\n ${params.data.value[2].aHeightDiff} km`;
              },
            },
            labelLine: {
              show: currentTimeTrack.changePoint,
              showAbove: true,
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
              backgroundColor: "#1e1e1e",
              name: `${new Date().getTime()}-变轨历程图`,
            },
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "line",
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
        grid: [{ left: 40, right: 40, top: 40, bottom: 50 }],
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
          // name: "经度",
          min: minLon,
          max: maxLon,
          // minInterval: 0.01,
          // maxInterval: 10,
          nameLocation: "middle",
          nameGap: 30,
          nameTextStyle: {
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 400,
          },
          axisLabel: {
            show: true,
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 600,
            formatter: (value) => {
              if (Math.abs(value) === 180) return "";
              if (Math.abs(value) === 0) return "0°";
              let sign = value > 0 ? "E" : "W";
              return Math.abs(value) + "° " + sign;
            },
          },
          axisLine: {
            lineStyle: {},
          },
        },
        yAxis: {
          type: "value",
          name: "高度/km",
          nameTextStyle: {
            fontSize: 14,
            color: "#ffffff",
            fontWeight: 600,
          },
          min: minHeight,
          max: maxHeight,
          // minInterval: 0.1,
          // maxInterval: 10,
          axisLabel: {
            show: true,
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 600,
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
  width: 1380px;
  height: 610px;
}
</style>
