<template>
  <aircas-panel v-show="geoSatRelativeEchartsPlugin" :title="pluginTitle" width="900" height="500" top="120" left="calc(50% - 450px)" @close="handlePanelClose">
    <div class="geo-sat-relative-echarts__toolbar">
      <span class="geo-sat-relative-echarts__label">距离阈值(km)</span>
      <el-input-number v-model="distanceThreshold" :min="0" :step="10" size="small" controls-position="right" @change="handleThresholdChange" />
      <span class="geo-sat-relative-echarts__label">光照角阈值(°)</span>
      <el-input-number v-model="sunAngleThreshold" :min="0" :max="180" :step="5" size="small" controls-position="right" @change="handleThresholdChange" />
    </div>
    <div class="geo-sat-relative-echarts" ref="chartContainerSunAngle"></div>
  </aircas-panel>
</template>

<script>
import * as echarts from "echarts";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { computeSatRelativeData } from "@/views/GeoMap/utils/satelliteLngHeight";

const geoMapStore = useGeoMapStore();
const DISTANCE_COLOR = "#2f6bff";
const SUN_ANGLE_COLOR = "#fa8c16";

export default {
  name: "GeoSatRelativeEchartsPlugin",
  data() {
    return {
      distanceThreshold: 100,
      sunAngleThreshold: 90,
      relativeData: {
        threatTrack: [],
        importTrack: [],
        distances: [],
        sunAngles: [],
        metrics: [],
        riskRanges: [],
      },
    };
  },
  computed: {
    ...mapState(useGeoMapStore, [
      "geoSatRelativeEchartsPlugin",
      "threatTargetID",
      "threatTargetName",
      "threatTles",
      "importTargetID",
      "importTargetName",
      "importTles",
      "startTime",
      "endTime",
      "timeStep",
    ]),

    pluginTitle() {
      if (!this.threatTargetName || !this.importTargetName) return "GEO相对距离与光照角";
      return `${this.threatTargetName} vs ${this.importTargetName} - 相对距离与光照角`;
    },

    // chartParamKey() {
    //   return JSON.stringify({
    //     threatTargetName: this.threatTargetName,
    //     importTargetName: this.importTargetName,
    //     threatTles: this.threatTles,
    //     importTles: this.importTles,
    //     startTime: this.startTime,
    //     endTime: this.endTime,
    //     timeStep: this.timeStep,
    //   });
    // },
  },
  watch: {
    geoSatRelativeEchartsPlugin(visible) {
      if (!visible) return;
      this.$nextTick(() => {
        this.ensureChartReady();
        this.initChart();
      });
    },

    // chartParamKey() {
    //   if (!this.geoSatRelativeEchartsPlugin) return;
    //   this.$nextTick(() => {
    //     this.ensureChartReady();
    //     this.initChart();
    //   });
    // },
  },
  mounted() {
    if (!this.geoSatRelativeEchartsPlugin) return;
    this.$nextTick(() => {
      this.ensureChartReady();
      this.initChart();
    });
  },

  methods: {
    /**
     * 确保 ECharts 实例已创建并完成尺寸适配
     * @returns {void}
     */
    ensureChartReady() {
      const container = this.$refs.chartContainerSunAngle;
      if (!container) return;
      if (!this.chartInstanceSunAngle) {
        this.chartInstanceSunAngle = echarts.init(container);
      }
      this.chartInstanceSunAngle.resize();
    },

    /**
     * 关闭面板
     * @returns {void}
     */
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("geoSatRelativeEchartsPlugin");
    },

    /**
     * 阈值变化后重新计算风险区间并刷新图表
     * @returns {void}
     */
    handleThresholdChange() {
      if (!this.geoSatRelativeEchartsPlugin) return;
      this.initChart();
    },

    /**
     * 计算相对距离和光照角序列，并写入 store
     * @returns {{times:Array<string>, distances:Array<number|null>, sunAngles:Array<number|null>, riskRanges:Array}} 图表序列
     */
    computeSeries() {
      const result = computeSatRelativeData({
        threatTles: this.threatTles,
        importTles: this.importTles,
        startTime: this.startTime,
        endTime: this.endTime,
        timeStep: this.timeStep,
        threatName: this.threatTargetName || this.threatTargetID || "threat",
        importName: this.importTargetName || this.importTargetID || "import",
        distanceThreshold: this.distanceThreshold,
        sunAngleThreshold: this.sunAngleThreshold,
      });

      console.log("result", result);

      this.relativeData = result;
      geoMapStore.SET_SAT_RELATIVE_DATA(result);

      return {
        times: result.times || [],
        distances: result.distances || [],
        sunAngles: result.sunAngles || [],
        riskRanges: result.riskRanges || [],
      };
    },

    /**
     * 初始化/刷新图表
     * @returns {void}
     */
    initChart() {
      const { times, distances, sunAngles, riskRanges } = this.computeSeries();

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
        ],
      };

      this.chartInstanceSunAngle &&
        this.chartInstanceSunAngle.setOption(option, {
          notMerge: true,
          lazyUpdate: false,
        });
      this.chartInstanceSunAngle.resize();
    },

    /**
     * 生成 tooltip 内容
     * @param {Array<object>} params - ECharts tooltip 回调参数
     * @returns {string} HTML 字符串
     */
    formatTooltip(params) {
      const firstParam = Array.isArray(params) ? params[0] : params;
      const i = firstParam && firstParam.dataIndex;
      const metric = this.relativeData.metrics[i];
      if (!metric) return "";

      const fmt = (value, unit) => (Number.isFinite(value) ? `${value.toFixed(2)}${unit}` : "--");
      return [
        `时间：${metric.time}`,
        `主动卫星：${this.threatTargetName || this.threatTargetID}`,
        `从动卫星：${this.importTargetName || this.importTargetID}`,
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
.geo-sat-relative-echarts__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 880px;
  height: 42px;
  padding: 0 10px;
  box-sizing: border-box;
}

.geo-sat-relative-echarts__label {
  color: #d8e6ff;
  font-size: 13px;
  white-space: nowrap;
}

.geo-sat-relative-echarts {
  width: 880px;
  height: 400px;
}
</style>
