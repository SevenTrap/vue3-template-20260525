<!-- 卫星的态势图 -->

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
          <p class="title">总结图</p>

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

          <!-- <div class="config-item">
            <label>间隔：</label>
            <el-select class="aircas-el-select" v-model="interval" placeholder="选择间隔" style="width: 120px" size="small">
              <el-option label="1分钟" :value="60 * 1000"></el-option>
              <el-option label="30分钟" :value="30 * 60 * 1000"></el-option>
              <el-option label="1小时" :value="60 * 60 * 1000"></el-option>
            </el-select>
          </div> -->

          <div class="config-item">
            <el-button class="aircas-el-button" type="primary" @click="handleSearch" size="small">查询</el-button>
          </div>

          <div class="config-item">
            <el-checkbox-group class="aircas-el-checkbox-group" v-model="checkedChartConfig" size="small" @change="handleChangeChartConfig">
              <!-- <el-checkbox label="时间" value="labelDateTime" /> -->
              <!-- <el-checkbox label="名字" value="labelName" /> -->
              <!-- <el-checkbox label="经度" value="labelLongitude" /> -->
              <!-- <el-checkbox label="倾角" value="labelInclination" /> -->
              <!-- <el-checkbox label="漂移率" value="labelDriftRate" /> -->
              <!-- <el-checkbox label="高度差" value="labelHeightDiff" /> -->
              <el-checkbox label="标牌" value="labelShow" />
              <el-checkbox label="变轨点" value="labelChangePoint" />
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </template>

    <template #default>
      <div class="my-content">
        <div class="satellite-chart" ref="satelliteSummaryChartContainer"></div>
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
import { calculateSummaryChartData, summaryChartOption } from "../utils/satelliteSummaryChart";

const draggedLabelOffsets = {};
let isDragging = false;
let dragIndex = null;
let startPos = null;
let startOffset = null;

export default {
  name: "SatelliteSummaryChart",

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
      interval: 60 * 60 * 1000,
      checkedChartConfig: ["labelShow", "labelChangePoint"],
    };
  },
  computed: {
    ...mapState(useGeoMapStore, ["satelliteSummaryChartPlugin", "currentSceneConfig"]),
    isOpen: {
      get() {
        return this.satelliteSummaryChartPlugin;
      },
      set(value) {
        const geoMapStore = useGeoMapStore();
        geoMapStore.satelliteSummaryChartPlugin = value;
      },
    },
  },
  watch: {
    satelliteSummaryChartPlugin(visible) {
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
      const container = this.$refs.satelliteSummaryChartContainer;
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
      const allChartData = calculateSummaryChartData(satelliteNoradIDs, satelliteTles, startTime, endTime, this.interval);
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
        const legendName = currentSatelliteData[0].name;
        legendData.push(legendName);
        const currentSatelliteDataLength = currentSatelliteData.length;

        for (let di = 0; di < currentSatelliteDataLength; di++) {
          let symbolUrl = "emptyCircle";
          let symbolSize = 5;
          const currentTimeTrack = currentSatelliteData[di];

          if (currentTimeTrack.isChangePoint) {
            if (checkedChartConfig.includes("labelChangePoint")) {
              symbolUrl = "path://M512 108.7L634.3 373.5L928 401.3L710.3 589.7L761.7 883.3L512 737.5L262.3 883.3L313.7 589.7L96 401.3L389.7 373.5L512 108.7Z";
              symbolSize = 15;
            }

            if (checkedChartConfig.includes("labelShow")) {
              currentTimeTrack.labelShow = true;
            } else {
              currentTimeTrack.labelShow = false;
            }
          } else {
            currentTimeTrack.labelShow = false;
          }

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
              show: currentTimeTrack.labelShow,
              color: "#000000",
              position: positionMap[di % 2],
              offset: offsetMap[di % 2],
              align: "center",
              fontSize: 16,
              formatter: function (params) {
                let result = "";
                result += `${params.data.value[2].name} \r\n`;
                result += `${params.data.value[2].timeShow} \r\n`;
                result += `变轨量：${params.data.value[2].currentHeightDiff.toFixed(3)}km`;
                return result;
              },
            },
            labelLine: {
              show: currentTimeTrack.labelShow,
              showAbove: true,
              lineStyle: {
                color: "#000000",
              },
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
          smooth: true,
          labelLayout: (params) => {
            const key = params.seriesIndex + "-" + params.dataIndex;
            const offset = draggedLabelOffsets[key];

            if (offset) {
              return {
                hideOverlap: false,
                draggable: true,
                x: params.labelRect.x + params.labelRect.width * 0.5 + offset.dx,
                y: params.labelRect.y + offset.dy,
              };
            }
            return {
              hideOverlap: false,
              draggable: true,
              x: params.labelRect.x,
              y: params.labelRect.y,
            };
          },
          data: currentSeriesData,
          markLine: {
            symbol: "none",
            lineStyle: {
              type: "dashed",
              width: 2,
            },
            data: [
              {
                xAxis: currentSeriesData[currentSatelliteDataLength - 1].value[0],
              },
            ],
          },
        };

        allSatelliteSeriesData.push(seriesData);
      }

      console.log("allSatelliteSeriesData", allSatelliteSeriesData);

      summaryChartOption.legend.data = legendData;
      summaryChartOption.series = allSatelliteSeriesData;

      this.chartInstance.setOption(summaryChartOption);
      this.chartInstance.on("mousedown", (event) => {
        const e = event.event;

        if (e.target && e.target.parent?.style?.text) {
          isDragging = true;
          dragIndex = event.seriesIndex + "-" + event.dataIndex;
          startPos = [e.offsetX, e.offsetY];
          startOffset = draggedLabelOffsets[dragIndex] || { dx: 0, dy: 0 };
        }
      });

      // 处理双击隐藏label事件
      this.chartInstance.on("dblclick", (event) => {
        console.log("dbclick", event);
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

    .satellite-chart {
      width: 1380px;
      height: 610px;
    }
  }
}
</style>
