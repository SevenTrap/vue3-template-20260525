<!-- 卫星的总览图 -->

<template>
  <el-dialog
    class="aircas-el-dialog"
    top="100px"
    :width="1400"
    :height="700"
    :append-to-body="true"
    v-model="isOpen"
    draggable
    :modal="false"
    :modal-penetrable="true"
    @close="handleClose"
  >
    <template #header>
      <div class="my-header">
        <div class="config-items">
          <p class="title">总览图</p>

          <div class="config-item">
            <label>卫星：</label>
            <el-select
              class="aircas-el-select"
              v-model="selectedSatellite"
              placeholder="选择卫星"
              multiple
              filterable
              remote
              reserve-keyword
              collapse-tags
              collapse-tags-tooltip
              clearable
              :max-collapse-tags="1"
              style="width: 200px"
              size="small"
              :remote-method="remoteMethod"
              :loading="loading"
            >
              <el-option v-for="satellite in satellites" :key="satellite.value" :label="satellite.label" :value="satellite.value"></el-option>
            </el-select>
          </div>

          <div class="config-item">
            <label>时间：</label>
            <el-date-picker
              class="aircas-el-date-picker"
              v-model="dateRange"
              type="daterange"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              range-separator="至"
              value-format="YYYY-MM-DD HH:mm:ss"
              :default-time="defaultTime"
              style="width: 220px"
              size="small"
            ></el-date-picker>
          </div>

          <div class="config-item">
            <el-button class="aircas-el-button" type="primary" @click="handleSearch" size="small">查询</el-button>
          </div>

          <!-- <div class="config-item">
            <el-checkbox-group class="aircas-el-checkbox-group" v-model="checkedChartConfig" size="small" @change="handleChangeChartConfig">
              <el-checkbox label="时间" value="labelDateTime" />
              <el-checkbox label="名字" value="labelName" />
              <el-checkbox label="经度" value="labelLongitude" />
              <el-checkbox label="倾角" value="labelInclination" />
              <el-checkbox label="漂移率" value="labelDriftRate" />
              <el-checkbox label="高度差" value="labelHeightDiff" />
            </el-checkbox-group>
          </div> -->
        </div>
      </div>
    </template>

    <template #default>
      <div class="my-content">
        <div class="satellite-overview-chart" ref="satelliteOverviewChartContainer"></div>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import * as echarts from "echarts";
import { mapState } from "pinia";
import dayjs from "dayjs";
import { useGeoMapStore } from "@/store/useGeoMapStore.js";
import { geoAltitudeKm, earthRadiusKm } from "@/utils/constants";
import { buildSatelliteClassEpochMap, pickSatByTime } from "../utils/satelliteCalculate";
import { calculateOverviewChartData } from "../utils/satelliteOverviewChart";

const draggedLabelOffsets = {};
let isDragging = false;
let dragIndex = null;
let startPos = null;
let startOffset = null;

export default {
  name: "SatelliteOverviewChart",

  data() {
    return {
      allChartData: [],
      loading: false,
      satelliteAll: [],
      satellites: [],
      selectedSatellite: [],
      selectedSatelliteTles: [],
      dateRange: [],
      defaultTime: [new Date(0, 0, 0, 0, 0, 0), new Date(0, 0, 0, 23, 59, 59)],
      checkedChartConfig: [],
    };
  },
  computed: {
    ...mapState(useGeoMapStore, ["satelliteOverviewChartPlugin", "currentSceneConfig"]),
    isOpen: {
      get() {
        return this.satelliteOverviewChartPlugin;
      },
      set(value) {
        const geoMapStore = useGeoMapStore();
        geoMapStore.satelliteOverviewChartPlugin = value;
      },
    },
  },
  watch: {
    satelliteOverviewChartPlugin(visible) {
      if (!visible || this.chartInstance) return;
      this.$nextTick(() => {
        this.ensureChartReady();
        this.initSatellites();
        this.initChartData();
        this.updateChart();
      });
    },
  },
  methods: {
    ensureChartReady() {
      const container = this.$refs.satelliteOverviewChartContainer;
      if (!container) return;
      if (!this.chartInstance) {
        this.chartInstance = echarts.init(container);
      }
      this.chartInstance.resize();
    },

    // 远程检索
    remoteMethod(query) {
      if (query) {
        this.loading = true;

        setTimeout(() => {
          this.satellites = this.satelliteAll.filter((satellite) => satellite.label.includes(query));

          // console.log("查询卫星列表", this.satellites);
          this.loading = false;
        }, 500);
      } else {
        this.satellites = [];
      }
    },

    initSatellites() {
      const { threatSatelliteName, importSatelliteName, threatSatelliteNoradID, importSatelliteNoradID, satelliteTles, startTime, endTime } =
        this.currentSceneConfig;
      const sceneSatellites = [
        {
          label: threatSatelliteName,
          value: threatSatelliteNoradID,
        },
        {
          label: importSatelliteName,
          value: importSatelliteNoradID,
        },
      ];

      this.satellites.push(...sceneSatellites);
      this.satelliteAll.push(...sceneSatellites);
      this.selectedSatelliteTles = satelliteTles;
      this.dateRange = [startTime, endTime];
      this.selectedSatellite = [threatSatelliteNoradID, importSatelliteNoradID];
    },

    handleSearch() {
      this.initChartData();
      this.updateChart();
    },

    handleChangeChartConfig() {
      this.updateChart();
    },

    // 初始化数据
    initChartData() {
      const satelliteTles = this.selectedSatelliteTles;
      const satelliteNoradIDs = this.selectedSatellite;
      const startTime = this.dateRange[0];
      const endTime = this.dateRange[1];
      const allChartData = calculateOverviewChartData(satelliteNoradIDs, satelliteTles, startTime, endTime);
      this.allChartData = allChartData;
    },

    updateChart() {
      const allChartData = this.allChartData;
      const checkedChartConfig = this.checkedChartConfig;
      const allSatelliteSeriesData = [];
      const legendData = [];

      for (let si = 0; si < allChartData.length; si++) {
        const currentSeriesData = [];
        const currentSatelliteData = allChartData[si];
        const currentSatelliteDataLength = currentSatelliteData.length;
        const legendName = currentSatelliteData[0].name;
        legendData.push(legendName);

        for (let di = 0; di < currentSatelliteDataLength; di++) {
          let symbolUrl = "emptyCircle";
          let symbolSize = 5;
          const currentTimeTrack = currentSatelliteData[di];

          // if (currentTimeTrack.isChangePoint) {
          //   symbolUrl = "path://M512 108.7L634.3 373.5L928 401.3L710.3 589.7L761.7 883.3L512 737.5L262.3 883.3L313.7 589.7L96 401.3L389.7 373.5L512 108.7Z";
          //   symbolSize = 25;
          // } else {
          //   symbolUrl = "circle";
          //   symbolSize = 15;
          // }

          // if (checkedChartConfig.includes("labelChangePoint")) {
          //   if (checkedChartConfig.length > 1) {
          //     currentTimeTrack.labelShow = true;
          //   } else {
          //     currentTimeTrack.labelShow = false;
          //   }
          // } else {
          //   if (currentTimeTrack.isChangePoint) continue;
          //   if (checkedChartConfig.length > 0) {
          //     currentTimeTrack.labelShow = true;
          //   } else {
          //     currentTimeTrack.labelShow = false;
          //   }
          // }
          const offsetMap = [
            [0, 60],
            [0, -60],
          ];
          const positionMap = ["top", "bottom"];

          const currentTimeSeries = {
            value: [currentTimeTrack.currentLon, currentTimeTrack.currentHeightDiff, currentTimeTrack],
            symbol: symbolUrl,
            symbolSize: symbolSize,
            label: {
              show: false,
              // color: "#000000",
              // position: positionMap[di % 2],
              // offset: offsetMap[di % 2],
              // fontSize: 16,
              // formatter: function (params) {
              //   let result = "";
              //   if (checkedChartConfig.includes("labelName")) result += `${params.data.value[2].name} \r\n`;
              //   if (checkedChartConfig.includes("labelDateTime")) result += `${params.data.value[2].timeShow} \r\n`;
              //   if (checkedChartConfig.includes("labelDriftRate")) result += `${params.data.value[2].degOneDay.toFixed(3)}°/天 \r\n`;
              //   if (checkedChartConfig.includes("labelHeightDiff")) result += `${params.data.value[2].currentHeightDiff.toFixed(1)}km \r\n`;
              //   if (checkedChartConfig.includes("labelLongitude")) result += `${params.data.value[2].currentLon.toFixed(4)}° \r\n`;
              //   if (checkedChartConfig.includes("labelInclination")) result += `${params.data.value[2].inclination.toFixed(3)}° \r\n`;
              //   if (checkedChartConfig.includes("labelChangePoint") && currentTimeTrack.isChangePoint) result += `${params.data.value[2].isChangePoint} \r\n`;
              //   if (result.length) result = result.slice(0, -2);

              //   return result;
              // },
            },
            labelLine: {
              show: false,
              // showAbove: true,
              // lineStyle: {
              //   color: "#000000",
              // },
            },
          };

          currentSeriesData.push(currentTimeSeries);
        }

        currentSeriesData[0].symbol = "circle";
        currentSeriesData[0].symbolSize = 15;
        currentSeriesData[currentSatelliteDataLength - 1].symbol = "triangle";
        currentSeriesData[currentSatelliteDataLength - 1].symbolSize = 15;

        const seriesData = {
          name: legendName,
          type: "line",
          showSymbol: true,
          // labelLayout: (params) => {
          //   const key = params.seriesIndex + "-" + params.dataIndex;
          //   const offset = draggedLabelOffsets[key];

          //   if (offset) {
          //     return {
          //       hideOverlap: false,
          //       draggable: true,
          //       x: params.labelRect.x + params.labelRect.width * 0.5 + offset.dx,
          //       y: params.labelRect.y + offset.dy,
          //     };
          //   }
          //   return {
          //     hideOverlap: false,
          //     draggable: true,
          //     x: params.labelRect.x,
          //     y: params.labelRect.y,
          //   };
          // },
          data: currentSeriesData,
        };

        allSatelliteSeriesData.push(seriesData);
      }

      const option = {
        legend: {
          data: legendData,
          top: 8,
          itemStyle: {
            color: "#000000",
            fontSize: 14,
            fontWeight: 400,
          },
          textStyle: {
            color: "#000000",
          },
        },
        toolbox: {
          show: true,
          right: 12,
          top: 6,
          feature: {
            dataZoom: {},
            saveAsImage: {
              type: "png",
              backgroundColor: "#ffffff",
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
              result += `名称：${params[i].value[2].name}<br/> 时间：${params[i].value[2].timeShow}<br/> 经度：${params[i].value[0].toFixed(2)}°<br/> 高度：${params[i].value[1].toFixed(2)} km`;
            }

            return result;
          },
        },
        grid: [{ left: 60, right: 50, top: 40, bottom: 50 }],
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
          min: function (value) {
            const halfValue = (value.max - value.min) / 2;
            const result = Number(Number(value.min - halfValue).toFixed(2));
            if (result > 180) return 180;
            if (result < -180) return -180;
            return result;
          },
          max: function (value) {
            const halfValue = (value.max - value.min) / 2;
            const result = Number(Number(value.max + halfValue).toFixed(2));
            if (result > 180) return 180;
            if (result < -180) return -180;
            return result;
          },
          minInterval: 0.001,
          nameLocation: "middle",
          nameGap: 30,
          nameTextStyle: {
            color: "#000000",
            fontSize: 14,
            fontWeight: 400,
          },
          axisLabel: {
            show: true,
            color: "#000000",
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
            lineStyle: {
              color: "#000000",
            },
          },
        },
        yAxis: {
          type: "value",
          name: "高度/km",
          nameTextStyle: {
            fontSize: 14,
            color: "#000000",
            fontWeight: 600,
          },
          min: function (value) {
            const halfValue = (value.max - value.min) / 2;
            return Number(Number(value.min - halfValue).toFixed(2));
          },
          max: function (value) {
            const halfValue = (value.max - value.min) / 2;
            return Number(Number(value.max + halfValue).toFixed(2));
          },
          minInterval: 0.01,
          axisLabel: {
            show: true,
            color: "#000000",
            fontSize: 14,
            fontWeight: 600,
          },
          axisLine: {
            lineStyle: {
              color: "#000000",
            },
          },
        },
        series: allSatelliteSeriesData,
      };

      this.chartInstance.setOption(option);

      this.chartInstance.on("mousedown", (event) => {
        const e = event.event;

        if (e.target && e.target.parent?.style?.text) {
          isDragging = true;
          dragIndex = event.seriesIndex + "-" + event.dataIndex;
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

    handleClose() {
      this.isOpen = false;
    },
  },

  beforeUnmount() {
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  },
};
</script>

<style lang="scss" scoped>
.aircas-el-dialog {
  .my-header {
    display: flex;
    justify-content: center;
    flex-direction: column;
    height: 40px;
    font-size: 18px;
    font-weight: bold;

    .title {
      width: 60px;
      font-size: 18px;
      font-weight: bold;
      margin-right: 20px;
    }

    .config-items {
      display: flex;
      align-items: center;
      justify-content: flex-start;

      .config-item {
        display: flex;
        align-items: center;
        margin-right: 20px;

        label {
          margin-right: 5px;
        }
      }
    }
  }
  .my-content {
    display: flex;
    justify-content: center;
    align-items: center;

    .satellite-overview-chart {
      width: 1380px;
      height: 610px;
    }
  }
}
</style>
