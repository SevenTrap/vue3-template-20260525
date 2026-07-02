<template>
  <aircas-panel
    v-show="geoSatRelativeEchartsPlugin"
    title="距离与太阳光照角分析插件"
    width="1400"
    height="670"
    top="120"
    left="calc(50% - 700px)"
    @close="handlePanelClose"
  >
    <div class="echarts-header">
      <div class="satellite-configs">
        <div class="satellite-config">
          <label>卫星：</label>
          <el-select v-model="currentSceneConfig.sceneName" size="small" style="width: 150px" multiple collapse-tags collapse-tags-tooltip placeholder="Select">
            <el-option
              v-for="item in selectedSatellites"
              :key="`${item.threatSatelliteNoradID}TO${item.importSatelliteNoradID}`"
              :label="`${item.threatSatelliteNoradID}TO${item.importSatelliteNoradID}`"
              :value="item.sceneName"
            />
          </el-select>
        </div>

        <div class="satellite-config">
          <label>主动星：</label>
          <el-select v-model="currentSceneConfig.threatSatelliteNoradID" size="small" placeholder="请选择主动卫星" style="width: 150px">
            <el-option v-for="(satellite, noradID) in satelliteTracks" :key="noradID" :label="satellite[0].name" :value="noradID" />
          </el-select>
        </div>

        <div class="satellite-config">
          <label>从动星：</label>
          <el-select v-model="currentSceneConfig.importSatelliteNoradID" size="small" placeholder="请选择从动卫星" style="width: 150px">
            <el-option v-for="(satellite, noradID) in satelliteTracks" :key="noradID" :label="satellite[0].name" :value="noradID" />
          </el-select>
        </div>

        <el-button size="small" @click="handleAddSatellite">添加</el-button>
      </div>

      <div class="echarts-configs">
        <div class="config-item">
          <label>距离阈值：</label>
          <el-input-number v-model="distanceThreshold" :min="0" :max="10000" size="small">
            <template #suffix>
              <span>千米</span>
            </template>
          </el-input-number>
        </div>

        <div class="config-item">
          <label>角度阈值：</label>
          <el-input-number v-model="sunAngleThreshold" :min="0" :max="180" size="small">
            <template #suffix>
              <span>度</span>
            </template>
          </el-input-number>
        </div>
      </div>
    </div>

    <div class="geo-sat-relative-echarts" ref="chartContainerSunAngle"></div>
  </aircas-panel>
</template>

<script>
import dayjs from "dayjs";
import * as echarts from "echarts";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { calculateDistanceAndSunAngleDeg, substringArrByTimeRange, getCurrentTimeMsTrack, buildRiskRanges } from "../utils/satelliteCalculate";
import { el } from "element-plus/es/locale/index.mjs";

const geoMapStore = useGeoMapStore();
const DISTANCE_COLOR = "#2f6bff";
const SUN_ANGLE_COLOR = "#fa8c16";

export default {
  name: "GeoSatRelativeEchartsPlugin",
  data() {
    return {
      selectedSatellites: [
        {
          threatSatelliteNoradID: "主动卫星NoradID",
          importSatelliteNoradID: "从动卫星NoradID",
        },
        {
          threatSatelliteNoradID: "主动卫星NoradI1",
          importSatelliteNoradID: "从动卫星NoradI2",
        },
      ],
      distanceThreshold: 7200,
      sunAngleThreshold: 90,
    };
  },
  computed: {
    ...mapState(useGeoMapStore, [
      "geoSatRelativeEchartsPlugin",
      "currentSceneConfig",
      "satelliteTracks",
      "currentSceneTimeMs",
      "clockStartTime",
      "clockEndTime",
    ]),
  },
  watch: {
    geoSatRelativeEchartsPlugin(visible) {
      if (!visible) return;
      this.$nextTick(() => {
        this.ensureChartReady();
        this.initChart();
      });
    },
    currentSceneTimeMs() {
      if (!this.geoSatRelativeEchartsPlugin) return;
      this.initChart();
    },
  },

  methods: {
    ensureChartReady() {
      const container = this.$refs.chartContainerSunAngle;
      if (!container) return;
      if (!this.chartInstanceSunAngle) {
        this.chartInstanceSunAngle = echarts.init(container);
      }
      this.chartInstanceSunAngle.resize();
    },

    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("geoSatRelativeEchartsPlugin");
    },

    initChart(currentSceneTime = "") {
      if (!this.chartInstanceSunAngle) return;

      const { threatSatelliteNoradID, importSatelliteNoradID, threatSatelliteName, importSatelliteName } = this.currentSceneConfig;
      const threatTracks = this.satelliteTracks.get(threatSatelliteNoradID);
      const importTracks = this.satelliteTracks.get(importSatelliteNoradID);
      if (!threatTracks || !importTracks) return;
      const legendData = [`${threatSatelliteName}>${importSatelliteName} 相对距离`, `${threatSatelliteName}>${importSatelliteName} 太阳角`];

      // 计算两颗卫星的距离和太阳角（threatTracks看向importTracks）
      const distanceAndSunAngleDeg = calculateDistanceAndSunAngleDeg(threatTracks, importTracks);
      // 根据时间窗口截取数组
      const relativeTrajectoryPositions = substringArrByTimeRange(distanceAndSunAngleDeg, this.clockStartTime, this.clockEndTime);
      // 获取当前时间对应的轨迹
      let currentTrack = getCurrentTimeMsTrack(relativeTrajectoryPositions, this.currentSceneTimeMs);

      // 格式化处理echarts显示数据
      const times = relativeTrajectoryPositions.map((item) => item.time);
      const sunAngleData = relativeTrajectoryPositions.map((item) => [item.time, item.sunAngleDeg, item]);
      const distanceData = relativeTrajectoryPositions.map((item) => [item.time, item.distanceKm, item]);
      const riskRanges = buildRiskRanges(relativeTrajectoryPositions, this.distanceThreshold, this.sunAngleThreshold);

      const option = {
        legend: {
          data: legendData,
          top: 4,
          itemStyle: {
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 400,
          },
          textStyle: {
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 400,
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            // type: "cross",
            type: "line",
            label: {
              backgroundColor: "#505765",
            },
          },
          formatter: (params) => this.formatTooltip(params),
        },
        grid: [{ left: 50, right: 50, top: 40, bottom: 50 }],
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: 0,
            filterMode: "none",
          },
          {
            type: "slider",
            xAxisIndex: 0,
            height: 20,
            bottom: 5,
            filterMode: "none",
          },
        ],
        xAxis: [
          {
            type: "category",
            data: times,
            boundaryGap: false,
            axisLabel: {
              hideOverlap: true,
            },
            axisLine: {
              show: true,
              lineStyle: {
                color: "#ffffff",
                width: 1,
              },
            },
            axisTick: {
              show: true,
              lineStyle: {
                color: "#ffffff",
                width: 1,
              },
            },
            axisLabel: {
              show: true,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              formatter: (value) => {
                if (!value) return "";
                return dayjs(value).format("MM-DD HH:mm");
              },
            },
          },
        ],
        yAxis: [
          {
            type: "value",
            name: "距离/km",
            nameTextStyle: {
              fontSize: 14,
              color: "#ffffff",
              fontWeight: 600,
            },
            position: "left",
            scale: true,
            axisLine: {
              show: true,
              lineStyle: {
                color: "#ffffff",
                width: 1,
              },
            },
            axisTick: {
              show: true,
              lineStyle: {
                color: "#ffffff",
                width: 1,
              },
            },
            axisLabel: {
              show: true,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
            },
          },
          {
            type: "value",
            name: "太阳光照角/°",
            nameTextStyle: {
              fontSize: 14,
              color: "#ffffff",
              fontWeight: 600,
            },
            position: "right",
            min: 0,
            max: 180,
            axisLine: {
              show: true,
              lineStyle: {
                color: "#ffffff",
                width: 1,
              },
            },
            axisTick: {
              show: true,
              lineStyle: {
                color: "#ffffff",
                width: 1,
              },
            },
            axisLabel: {
              show: true,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
            },
          },
        ],
        series: [
          {
            name: "命中阈值",
            type: "line",
            markArea: {
              silent: true,
              itemStyle: {
                color: "#760031fe",
              },
              label: {
                show: true,
                color: "#ffffff",
                fontWeight: 600,
              },
              data: this.formatMarkAreaData(riskRanges),
            },
          },
          {
            name: legendData[0],
            type: "line",
            yAxisIndex: 0,
            showSymbol: false,
            itemStyle: { color: DISTANCE_COLOR },
            lineStyle: { color: DISTANCE_COLOR, width: 1.5 },
            data: distanceData,
          },
          {
            name: legendData[1],
            type: "line",
            yAxisIndex: 1,
            showSymbol: false,
            itemStyle: { color: SUN_ANGLE_COLOR },
            lineStyle: { color: SUN_ANGLE_COLOR, width: 1.5 },
            data: sunAngleData,
          },

          {
            name: "当前时刻",
            type: "scatter",
            yAxisIndex: 0,
            showSymbol: true,
            symbolSize: 10,
            itemStyle: { color: DISTANCE_COLOR },
            lineStyle: { color: DISTANCE_COLOR, width: 1.5 },
            data: [[currentTrack.time, currentTrack.distanceKm]],
          },
          {
            name: "当前时刻",
            type: "scatter",
            yAxisIndex: 1,
            showSymbol: true,
            symbolSize: 10,
            itemStyle: { color: SUN_ANGLE_COLOR },
            lineStyle: { color: SUN_ANGLE_COLOR, width: 1.5 },
            data: [[currentTrack.time, currentTrack.sunAngleDeg]],
          },
        ],
      };

      this.chartInstanceSunAngle.setOption(option, {
        notMerge: false,
        lazyUpdate: true,
      });
    },

    formatTooltip(params) {
      const currentParams = Array.isArray(params) ? params[0] : params;
      const track = currentParams.data[2];

      return [
        `时间：${track.time}`,
        `主动卫星：${this.currentSceneConfig.threatSatelliteName}`,
        `从动卫星：${this.currentSceneConfig.importSatelliteName}`,
        `两星距离：${track.distanceKm} km`,
        `太阳光照角：${track.sunAngleDeg} °`,
      ].join("<br/>");
    },

    /**
     * 将风险区间转换为 ECharts markArea 数据
     * @param {Array} riskRanges - 风险区间
     * @returns {Array} markArea 数据
     */
    formatMarkAreaData(riskRanges) {
      if (!Array.isArray(riskRanges)) return [];
      return riskRanges.map((range) => [
        {
          name: "阈值命中",
          xAxis: range.startTime,
        },
        {
          xAxis: range.endTime,
        },
      ]);
    },
  },
  beforeUnmount() {
    if (this.chartInstanceSunAngle) {
      this.chartInstanceSunAngle.dispose();
      this.chartInstanceSunAngle = null;
    }
  },
};
</script>

<style lang="scss" scoped>
.echarts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff;
  font-size: 14px;

  .satellite-configs {
    display: flex;
    align-items: center;
    justify-content: flex-start;

    .satellite-config {
      display: flex;
      align-items: center;
      margin-right: 20px;

      label {
        width: 60px;
        text-align: right;
        margin-right: 5px;
      }
    }
  }

  .echarts-configs {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    .config-item {
      margin-right: 20px;
    }
  }
}

.geo-sat-relative-echarts {
  width: 1380px;
  height: 585px;
}
</style>
