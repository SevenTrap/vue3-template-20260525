<template>
  <aircas-panel v-show="geoSatRelativeEchartsPlugin" :title="pluginTitle" width="900" height="500" top="120" left="calc(50% - 450px)" @close="handlePanelClose">
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
import { buildRiskRanges } from "../utils/satelliteLngHeight";

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
    ...mapState(useGeoMapStore, ["geoSatRelativeEchartsPlugin", "satRelativeData", "currentSceneConfig", "currentSceneTimeMs"]),

    pluginTitle() {
      if (!this.satRelativeData.threatName || !this.satRelativeData.importName) return "GEO相对距离与光照角";
      return `${this.satRelativeData.threatName} vs ${this.satRelativeData.importName} - 相对距离与光照角`;
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
      const currentSceneTime = dayjs(this.currentSceneTimeMs).second(0).millisecond(0).format("YYYY-MM-DD HH:mm:ss");
      this.initChart(currentSceneTime);
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

    handleThresholdChange() {
      if (!this.geoSatRelativeEchartsPlugin) return;
      this.initChart();
    },

    /**
     * 初始化/刷新图表
     * @returns {void}
     */
    initChart(currentSceneTime = "") {
      const { metrics, times, distances, sunAngles } = this.satRelativeData;
      let metric = null;

      if (currentSceneTime) {
        const currentSceneTimeMs = dayjs(currentSceneTime).valueOf();
        if (currentSceneTimeMs < this.satRelativeData.startTime) {
          metric = metrics[0];
        } else if (currentSceneTimeMs > this.satRelativeData.endTime) {
          metric = metrics[metrics.length - 1];
        } else {
          metric = metrics.find((metric) => metric.time === currentSceneTime);
        }
      } else {
        metric = metrics[0];
      }

      const riskRanges = buildRiskRanges(metrics, this.distanceThreshold, this.sunAngleThreshold);

      if (!this.chartInstanceSunAngle) return;
      this.chartInstanceSunAngle.resize();

      const option = {
        legend: {
          data: ["两星距离", "太阳光照角"],
          top: 4,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "cross",
            label: {
              backgroundColor: "#505765",
            },
          },
          formatter: (params) => this.formatTooltip(params),
        },
        grid: [{ left: 70, right: 50, top: 50, bottom: 82 }],
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: 0,
            filterMode: "none",
          },
          {
            type: "slider",
            xAxisIndex: 0,
            height: 24,
            bottom: 28,
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
          },
        ],
        yAxis: [
          {
            type: "value",
            name: "距离 / km",
            position: "left",
            scale: true,
          },
          {
            type: "value",
            name: "太阳光照角 / °",
            position: "right",
            min: 0,
            max: 180,
          },
        ],
        series: [
          {
            name: "两星距离",
            type: "line",
            yAxisIndex: 0,
            showSymbol: false,
            itemStyle: { color: DISTANCE_COLOR },
            lineStyle: { color: DISTANCE_COLOR, width: 1.5 },
            data: distances,
            markArea: {
              silent: true,
              itemStyle: {
                color: "rgba(250, 173, 20, 0.18)",
              },
              data: this.formatMarkAreaData(riskRanges),
            },
          },
          {
            name: "太阳光照角",
            type: "line",
            yAxisIndex: 1,
            showSymbol: false,
            itemStyle: { color: SUN_ANGLE_COLOR },
            lineStyle: { color: SUN_ANGLE_COLOR, width: 1.5 },
            data: sunAngles,
          },

          {
            name: "当前时刻",
            type: "scatter",
            yAxisIndex: 0,
            showSymbol: true,
            symbolSize: 10,
            itemStyle: { color: DISTANCE_COLOR },
            lineStyle: { color: DISTANCE_COLOR, width: 1.5 },
            data: [[metric.time, metric.distanceKm]],
          },
          {
            name: "当前时刻",
            type: "scatter",
            yAxisIndex: 1,
            showSymbol: true,
            symbolSize: 10,
            itemStyle: { color: SUN_ANGLE_COLOR },
            lineStyle: { color: SUN_ANGLE_COLOR, width: 1.5 },
            data: [[metric.time, metric.sunAngleDeg]],
          },
        ],
      };

      this.chartInstanceSunAngle &&
        this.chartInstanceSunAngle.setOption(option, {
          notMerge: false,
          lazyUpdate: true,
        });
    },

    formatTooltip(params) {
      const firstParam = Array.isArray(params) ? params[0] : params;
      const i = firstParam && firstParam.dataIndex;
      const metric = this.satRelativeData.metrics[i];
      if (!metric) return "";

      const fmt = (value, unit) => (Number.isFinite(value) ? `${value.toFixed(2)}${unit}` : "--");
      return [
        `时间：${metric.time}`,
        `主动卫星：${this.currentSceneConfig.threatName}`,
        `从动卫星：${this.currentSceneConfig.importName}`,
        `两星距离：${fmt(metric.distanceKm, " km")}`,
        `太阳光照角：${fmt(metric.sunAngleDeg, "°")}`,
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
  width: 880px;
  height: 440px;
}
</style>
