<template>
  <aircas-panel v-show="geoLngHeightEchartsPlugin" :title="pluginTitle" width="900" height="500" top="120" left="calc(50% - 450px)" @close="handlePanelClose">
    <div class="geo-sat-relative-echarts" ref="lngHeightEchartsContainer"></div>
  </aircas-panel>
</template>

<script>
import dayjs from "dayjs";
import * as echarts from "echarts";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { GEO_ALTITUDE_KM } from "@/views/GeoMap/utils/satelliteLngHeight";
import { findTrackIndexByTimeMs } from "@/views/GeoMap/utils/mars3dRelativeTrajectory";

const geoMapStore = useGeoMapStore();

const THREAT_COLOR = "#2f6bff"; // 威胁目标：蓝色
const IMPORT_COLOR = "#ff4d4f"; // 被威胁目标：红色
const LINK_COLOR = "#faad14"; // 同时刻连线：橙色虚线

/**
 * 为轨迹点补充相对同步轨道高度差
 * @param {Array} track - 卫星轨迹点列表
 * @returns {Array} 含 heightDiff 的轨迹点列表
 */
const toTrackWithHeightDiff = (track) =>
  (track || []).map((p) => ({
    ...p,
    heightDiff: Number.isFinite(p.altKm) ? Number((p.altKm - GEO_ALTITUDE_KM).toFixed(2)) : null,
  }));

export default {
  name: "GeoLngHeightEchartsPlugin",
  data() {
    return {
      threatTrack: [],
      importTrack: [],
      distances: [],
      sunAngles: [],
    };
  },
  computed: {
    ...mapState(useGeoMapStore, ["geoLngHeightEchartsPlugin", "satRelativeData", "currentSceneTimeMs", "currentSceneConfig"]),

    pluginTitle() {
      if (!this.currentSceneConfig.threatName || !this.currentSceneConfig.importName) return "经高图";
      return `${this.currentSceneConfig.threatName} vs ${this.currentSceneConfig.importName} - 经高图 `;
    },
  },
  watch: {
    geoLngHeightEchartsPlugin(visible) {
      if (!visible) return;
      this.$nextTick(() => {
        this.ensureChartReady();
        this.initChart();
      });
    },
    currentSceneTimeMs() {
      if (!this.geoLngHeightEchartsPlugin) return;

      const currentSceneTime = dayjs(this.currentSceneTimeMs).second(0).millisecond(0).format("YYYY-MM-DD HH:mm:ss");
      this.initChart(currentSceneTime);

      // this.updateRealtimeMarker();
    },
  },
  mounted() {},

  methods: {
    /**
     * 确保 ECharts 实例已创建并完成尺寸适配
     * @returns {void}
     */
    ensureChartReady() {
      const container = this.$refs.lngHeightEchartsContainer;
      if (!container) return;
      if (!this.chartInstance) {
        this.chartInstance = echarts.init(container);
      }
      this.chartInstance.resize();
    },
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("geoLngHeightEchartsPlugin");
    },

    /**
     * 从 store 的 satRelativeData2 加载轨迹并补充相对同步轨道高度差
     * @returns {void}
     */
    loadChartData() {
      const data = this.satRelativeData2 || {};
      this.threatTrack = toTrackWithHeightDiff(data.threatTrack);
      this.importTrack = toTrackWithHeightDiff(data.importTrack);
      this.distances = data.distances || [];
      this.sunAngles = data.sunAngles || [];
    },

    /**
     * 根据 web 球当前时间更新实时位置标记
     * @returns {void}
     */
    updateRealtimeMarker() {
      if (!this.chartInstance || !this.threatTrack.length) return;

      const idx = findTrackIndexByTimeMs(this.threatTrack, this.currentSceneTimeMs);
      const threat = this.threatTrack[idx];
      const importSat = this.importTrack[idx];
      if (!threat || !importSat) return;

      this.chartInstance.setOption({
        series: [
          {
            markPoint: {
              symbol: "circle",
              symbolSize: 12,
              itemStyle: { color: THREAT_COLOR, borderColor: "#fff", borderWidth: 2 },
              data: [{ coord: [threat.lon, threat.heightDiff], name: "当前位置" }],
            },
          },
          {
            markPoint: {
              symbol: "circle",
              symbolSize: 12,
              itemStyle: { color: IMPORT_COLOR, borderColor: "#fff", borderWidth: 2 },
              data: [{ coord: [importSat.lon, importSat.heightDiff], name: "当前位置" }],
            },
          },
        ],
      });
    },

    /**
     * 初始化/刷新图表
     * @returns {void}
     */
    initChart(currentSceneTime = "") {
      const { threatTrack, importTrack, threatLons, importLons, threatHeightDiffs, importHeightDiffs, threatLngHeightDiffs, importLngHeightDiffs, times } =
        this.satRelativeData;

      let metricThreat = null;
      let metricImport = null;

      if (currentSceneTime) {
        const currentSceneTimeMs = dayjs(currentSceneTime).valueOf();
        console.log("currentSceneTimeMs", currentSceneTimeMs);
        console.log("this.satRelativeData.startTime", this.satRelativeData.startTime);
        console.log("this.satRelativeData.endTime", this.satRelativeData.endTime);
        if (currentSceneTimeMs < this.satRelativeData.startTime) {
          metricThreat = threatLngHeightDiffs[0];
          metricImport = importLngHeightDiffs[0];
        } else if (currentSceneTimeMs > this.satRelativeData.endTime) {
          metricThreat = threatLngHeightDiffs[threatLngHeightDiffs.length - 1];
          metricImport = importLngHeightDiffs[importLngHeightDiffs.length - 1];
        } else {
          const index = times.findIndex((time) => time === currentSceneTime);
          metricThreat = threatLngHeightDiffs[index];
          metricImport = importLngHeightDiffs[index];
        }
      } else {
        metricThreat = threatLngHeightDiffs[0];
        metricImport = importLngHeightDiffs[0];
      }

      console.log("metricThreat", metricThreat);
      console.log("metricImport", metricImport);

      if (!this.chartInstance) return;
      this.chartInstance.resize();

      const option = {
        legend: {
          data: [`威胁目标 ${this.currentSceneConfig.threatName}`, `被威胁目标 ${this.currentSceneConfig.importName}`],
          top: 8,
        },
        toolbox: {
          show: true,
          right: 12,
          top: 6,
          feature: {
            dataZoom: {
              yAxisIndex: "none",
            },
            restore: {},
            saveAsImage: {
              type: "png",
              name: `经高图_${this.threatTargetID || "threat"}_${this.importTargetID || "import"}`,
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
          formatter: (params) => this.formatTooltip(params),
        },
        grid: [{ left: 70, right: 90, top: 50, bottom: 84 }],
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
            height: 22,
            bottom: 46,
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
            width: 18,
            right: 28,
            filterMode: "none",
          },
        ],
        xAxis: {
          type: "value",
          name: "经度 / °",
          scale: true,
        },
        yAxis: {
          type: "value",
          name: "相对同步轨道高度 / km",
          scale: true,
        },
        series: [
          {
            name: `威胁目标 ${this.currentSceneConfig.threatName}`,
            type: "line",
            showSymbol: false,
            smooth: true,
            itemStyle: { color: THREAT_COLOR },
            lineStyle: { color: THREAT_COLOR, width: 1.5 },
            data: threatLngHeightDiffs,
            zlevel: 1,
          },
          {
            name: `被威胁目标 ${this.currentSceneConfig.importName}`,
            type: "line",
            showSymbol: false,
            smooth: true,
            itemStyle: { color: IMPORT_COLOR },
            lineStyle: { color: IMPORT_COLOR, width: 1.5 },
            data: importLngHeightDiffs,
            zlevel: 1,
          },
          {
            name: "当前时刻",
            type: "scatter",
            showSymbol: true,
            symbolSize: 10,
            itemStyle: { color: IMPORT_COLOR },
            lineStyle: { color: IMPORT_COLOR, width: 1.5 },
            data: [metricThreat],
            zlevel: 10,
          },
          {
            name: "当前时刻",
            type: "scatter",
            showSymbol: true,
            symbolSize: 10,
            itemStyle: { color: THREAT_COLOR },
            lineStyle: { color: THREAT_COLOR, width: 1.5 },
            data: [metricImport],
            zlevel: 10,
          },
        ],
      };

      this.chartInstance && this.chartInstance.setOption(option, { notMerge: false, lazyUpdate: true });

      // this.updateRealtimeMarker();
    },

    /**
     * 生成 tooltip 内容
     * @param {object|Array} params - ECharts tooltip 回调参数（axis 触发时为数组）
     * @returns {string} HTML 字符串
     */
    formatTooltip(params) {
      const firstParam = Array.isArray(params) ? params[0] : params;
      const i = firstParam && firstParam.dataIndex;
      const threat = this.threatTrack[i];
      const importSat = this.importTrack[i];
      if (!threat || !importSat) return "";

      const fmt = (v, unit = "") => (Number.isFinite(v) ? `${v.toFixed(2)}${unit}` : "--");
      const distance = this.distances[i];
      const sunAngle = this.sunAngles[i];

      return [
        `时间：${threat.time}`,
        `威胁目标 ${this.threatTargetID}：经度 ${fmt(threat.lon, "°")}，相对高度 ${fmt(threat.heightDiff, " km")}`,
        `被威胁目标 ${this.importTargetID}：经度 ${fmt(importSat.lon, "°")}，相对高度 ${fmt(importSat.heightDiff, " km")}`,
        `两星距离：${fmt(distance, " km")}`,
        `光照角：${fmt(sunAngle, "°")}`,
      ].join("<br/>");
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
.geo-sat-relative-echarts {
  width: 880px;
  height: 442px;
}
</style>
