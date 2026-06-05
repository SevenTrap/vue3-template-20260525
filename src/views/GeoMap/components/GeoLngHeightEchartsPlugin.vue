<template>
  <aircas-panel v-if="geoLngHeightEchartsPlugin" :title="pluginTitle" width="900" height="500" top="120" left="calc(50% - 450px)" @close="handlePanelClose">
    <div class="geo-sat-relative-echarts" ref="lngHeightEchartsContainer"></div>
  </aircas-panel>
</template>

<script>
import * as echarts from "echarts";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { computeLngHeightData } from "@/views/GeoMap/utils/satelliteLngHeight";

const geoMapStore = useGeoMapStore();

const THREAT_COLOR = "#2f6bff"; // 威胁目标：蓝色
const IMPORT_COLOR = "#ff4d4f"; // 被威胁目标：红色
const LINK_COLOR = "#faad14"; // 同时刻连线：橙色虚线

export default {
  name: "GeoLngHeightEchartsPlugin",
  data() {
    return {
      // pluginTitle: "卫星经度和高度图",
      chartInstance: null,
      threatTrack: [],
      importTrack: [],
      distances: [],
      sunAngles: [],
    };
  },
  computed: {
    ...mapState(useGeoMapStore, [
      "geoLngHeightEchartsPlugin",
      "threatTargetName",
      "importTargetName",
      "threatTles",
      "importTles",
      "threatTargetID",
      "importTargetID",
      "closeTime",
      "timeFront",
      "timeBack",
      "timeStep",
    ]),

    pluginTitle() {
      if (!this.threatTargetName || !this.importTargetName) return "经高图";
      return `${this.threatTargetName} vs ${this.importTargetName} - 经高图 `;
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
        this.bindChartEvents();
      }
      this.chartInstance.resize();
    },
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("geoLngHeightEchartsPlugin");
    },

    /**
     * 计算轨迹数据并写入 store、组件缓存
     * @returns {void}
     */
    computeSeries() {
      const result = computeLngHeightData({
        threatTles: this.threatTles,
        importTles: this.importTles,
        closeTime: this.closeTime,
        timeFront: this.timeFront,
        timeBack: this.timeBack,
        timeStep: this.timeStep,
      });

      this.threatTrack = result.threatTrack;
      this.importTrack = result.importTrack;
      this.distances = result.distances;
      this.sunAngles = result.sunAngles;

      geoMapStore.SET_LNG_HEIGHT_DATA(result);
    },

    /**
     * 初始化/刷新图表
     * @returns {void}
     */
    initChart() {
      this.computeSeries();

      if (!this.chartInstance) return;
      this.chartInstance.resize();

      const threatData = this.threatTrack.map((p) => [p.lon, p.heightDiff]);
      const importData = this.importTrack.map((p) => [p.lon, p.heightDiff]);

      const option = {
        legend: {
          data: [`威胁目标 ${this.threatTargetID}`, `被威胁目标 ${this.importTargetID}`],
          top: 8,
        },
        tooltip: {
          trigger: "item",
          formatter: (params) => this.formatTooltip(params),
        },
        grid: [{ left: 70, right: 60, top: 50, bottom: 60 }],
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
            name: `威胁目标 ${this.threatTargetID}`,
            type: "line",
            showSymbol: false,
            itemStyle: { color: THREAT_COLOR },
            lineStyle: { color: THREAT_COLOR, width: 1.5 },
            data: threatData,
          },
          {
            name: `被威胁目标 ${this.importTargetID}`,
            type: "line",
            showSymbol: false,
            itemStyle: { color: IMPORT_COLOR },
            lineStyle: { color: IMPORT_COLOR, width: 1.5 },
            data: importData,
          },
          {
            name: "同时刻连线",
            type: "line",
            silent: true,
            showSymbol: true,
            symbolSize: 6,
            tooltip: { show: false },
            itemStyle: { color: LINK_COLOR },
            lineStyle: { color: LINK_COLOR, width: 1.5, type: "dashed" },
            data: [],
          },
        ],
      };

      this.chartInstance.setOption(option, { notMerge: true, lazyUpdate: false });
      this.chartInstance.resize();
    },

    /**
     * 生成 tooltip 内容
     * @param {object} params - ECharts tooltip 回调参数
     * @returns {string} HTML 字符串
     */
    formatTooltip(params) {
      const i = params.dataIndex;
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

    /**
     * 绑定鼠标事件：hover 同一时刻两星点时绘制连线
     * @returns {void}
     */
    bindChartEvents() {
      if (!this.chartInstance) return;
      this.chartInstance.on("mouseover", this.handleMouseOver);
      this.chartInstance.on("mouseout", this.handleMouseOut);
    },

    /**
     * 解绑鼠标事件
     * @returns {void}
     */
    unbindChartEvents() {
      if (!this.chartInstance) return;
      this.chartInstance.off("mouseover", this.handleMouseOver);
      this.chartInstance.off("mouseout", this.handleMouseOut);
    },

    /**
     * 鼠标悬停轨迹点时，连接同一时刻的两颗卫星点
     * @param {object} params - ECharts 事件参数
     * @returns {void}
     */
    handleMouseOver(params) {
      if (!this.chartInstance) return;
      if (params.componentType !== "series" || (params.seriesIndex !== 0 && params.seriesIndex !== 1)) return;

      const i = params.dataIndex;
      const threat = this.threatTrack[i];
      const importSat = this.importTrack[i];
      if (!threat || !importSat) return;

      // series 按数组下标合并，前两条用空对象占位，仅更新下标 2 的连线
      this.chartInstance.setOption({
        series: [
          {},
          {},
          {
            data: [
              [threat.lon, threat.heightDiff],
              [importSat.lon, importSat.heightDiff],
            ],
          },
        ],
      });
    },

    /**
     * 鼠标移出时清空连线
     * @returns {void}
     */
    handleMouseOut() {
      if (!this.chartInstance) return;
      this.chartInstance.setOption({ series: [{}, {}, { data: [] }] });
    },
  },
  beforeUnmount() {
    this.unbindChartEvents();
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
