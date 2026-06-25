<template>
  <aircas-panel
    v-show="geoSatRelativeEchartsPlugin"
    :title="pluginTitle"
    width="1400"
    height="670"
    top="120"
    left="calc(50% - 700px)"
    @close="handlePanelClose"
  >
    <!-- <div class="geo-sat-relative-echarts__toolbar">
      <span class="geo-sat-relative-echarts__label">距离阈值(km)</span>
      <el-input-number v-model="distanceThreshold" :min="0" :step="10" size="small" controls-position="right" @change="handleThresholdChange" />
      <span class="geo-sat-relative-echarts__label">光照角阈值(°)</span>
      <el-input-number v-model="sunAngleThreshold" :min="0" :max="180" :step="5" size="small" controls-position="right" @change="handleThresholdChange" />
    </div> -->
    <div class="geo-sat-relative-echarts" ref="chartContainerSunAngle"></div>
  </aircas-panel>
</template>

<script>
import dayjs from "dayjs";
import * as echarts from "echarts";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { calculateDistanceAndSunAngleDeg, substringArrByTimeRange, getCurrentTimeMsTrack, buildRiskRanges } from "../utils/satelliteCalculate";

const geoMapStore = useGeoMapStore();
const DISTANCE_COLOR = "#2f6bff";
const SUN_ANGLE_COLOR = "#fa8c16";

export default {
  name: "GeoSatRelativeEchartsPlugin",
  data() {
    return {
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

    pluginTitle() {
      if (!this.currentSceneConfig.threatSatelliteName || !this.currentSceneConfig.importSatelliteName) return "GEO相对距离与光照角";
      return `${this.currentSceneConfig.threatSatelliteName} vs ${this.currentSceneConfig.importSatelliteName} - 相对距离与光照角`;
    },
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

      const { threatSatelliteNoradID, importSatelliteNoradID } = this.currentSceneConfig;
      const threatTracks = this.satelliteTracks.get(threatSatelliteNoradID);
      const importTracks = this.satelliteTracks.get(importSatelliteNoradID);
      if (!threatTracks || !importTracks) return;

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
          data: ["两星距离", "太阳光照角"],
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
            name: "两星距离",
            type: "line",
            yAxisIndex: 0,
            showSymbol: false,
            itemStyle: { color: DISTANCE_COLOR },
            lineStyle: { color: DISTANCE_COLOR, width: 1.5 },
            data: distanceData,
          },
          {
            name: "太阳光照角",
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
        `阈值：距离 < ${this.distanceThreshold} km，光照角 < ${this.sunAngleThreshold}°`,
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
.geo-sat-relative-echarts {
  width: 1380px;
  height: 610px;
}
</style>
