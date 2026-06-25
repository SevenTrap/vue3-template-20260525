<template>
  <aircas-panel v-show="geoLngHeightEchartsPlugin" :title="pluginTitle" width="1400" height="670" top="120" left="calc(50% - 700px)" @close="handlePanelClose">
    <div class="geo-sat-relative-echarts" ref="lngHeightEchartsContainer"></div>
  </aircas-panel>
</template>

<script>
import * as echarts from "echarts";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { geoAltitudeKm } from "@/utils/constants";
import { getCurrentTimeMsTrack, substringArrByTimeRange } from "../utils/satelliteCalculate";

const geoMapStore = useGeoMapStore();

const THREAT_COLOR = "#2f6bff"; // 威胁目标：蓝色
const IMPORT_COLOR = "#ff4d4f"; // 被威胁目标：红色

export default {
  name: "GeoLngHeightEchartsPlugin",

  computed: {
    ...mapState(useGeoMapStore, ["geoLngHeightEchartsPlugin", "currentSceneTimeMs", "currentSceneConfig", "satelliteTracks"]),

    pluginTitle() {
      if (!this.currentSceneConfig.threatSatelliteName || !this.currentSceneConfig.importSatelliteName) return "经高图";
      return `${this.currentSceneConfig.threatSatelliteName} vs ${this.currentSceneConfig.importSatelliteName} - 经高图 `;
    },
  },
  watch: {
    geoLngHeightEchartsPlugin(visible) {
      if (!visible) return;
      this.$nextTick(() => {
        this.ensureChartReady();
        this.updateChart();
      });
    },
    currentSceneTimeMs() {
      if (!this.geoLngHeightEchartsPlugin) return;
      this.updateChart();
    },
  },

  methods: {
    ensureChartReady() {
      const container = this.$refs.lngHeightEchartsContainer;
      if (!container) return;
      if (!this.chartInstance) {
        this.chartInstance = echarts.init(container);
      }
      this.chartInstance.resize();
    },

    // 获取指定时间范围的卫星数据
    getTracksByTimeRange(track, clockStartTime, clockEndTime) {
      const result = [];

      for (let i = 0; i < track.length; i++) {
        const point = track[i];
        if (!point || point.timeMs < clockStartTime || point.timeMs > clockEndTime) continue;

        const heightDiff = Number((point.altKm - geoAltitudeKm).toFixed(2));
        if (heightDiff === null) continue;
        result.push([point.lon, heightDiff, point]);
      }

      return result;
    },

    updateChart() {
      if (!this.chartInstance) return;

      const clockStartTime = geoMapStore.clockStartTime;
      const clockEndTime = geoMapStore.clockEndTime;
      const echartsLegend = [];
      const echartsSeries = [];

      for (const [norad, track] of this.satelliteTracks.entries()) {
        echartsLegend.push(`${norad}`);

        // 获取时间范围内的轨迹
        const seriesData = this.getTracksByTimeRange(track, clockStartTime, clockEndTime);
        // 获取当前时间对应的轨迹点
        const currentTrack = getCurrentTimeMsTrack(track, this.currentSceneTimeMs);
        const heightDiff = Number((currentTrack.altKm - geoAltitudeKm).toFixed(2));

        echartsSeries.push({
          name: norad,
          type: "line",
          showSymbol: false,
          smooth: true,
          itemStyle: { color: THREAT_COLOR },
          lineStyle: { color: THREAT_COLOR, width: 1.5 },
          data: seriesData,
          zlevel: 1,
        });

        echartsSeries.push({
          id: `scatter-${norad}`,
          name: `${norad} - 当前时刻`,
          type: "scatter",
          showSymbol: true,
          symbolSize: 10,
          itemStyle: { color: "#ff4d4f" }, // 将当前闪烁点改为红色以便区分
          data: [[currentTrack.lon, heightDiff]],
          zlevel: 10,
        });
      }

      const option = {
        legend: {
          data: echartsLegend,
          top: 8,
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
              name: `经高图_${this.currentSceneConfig.threatSatelliteNoradID || "threat"}_${this.currentSceneConfig.importSatelliteNoradID || "import"}`,
            },
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
          formatter: function (params) {
            if (!params) return "";
            if (!params[0].value[2]) return "";
            return `时间：${params[0].value[2].time}<br/> 经度：${params[0].value[0].toFixed(2)}°<br/> 高度：${params[0].value[1].toFixed(2)} km`;
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
          // name: "经度/°",
          name: "",
          nameGap: 5,
          // nameRotate: -90,
          nameLocation: "middle",
          nameTextStyle: {
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
          },
          position: "bottom",
          scale: true,
          minInterval: 0.01,
          maxInterval: 10,
          axisLine: {
            show: true,
            lineStyle: {
              // type: "dashed",
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
              if (Math.abs(value) === 180) return "";
              if (Math.abs(value) === 0) return "0°";
              let sign = value > 0 ? "E" : "W";
              return Math.abs(value) + "° " + sign;
            },
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
        series: echartsSeries,
      };

      this.chartInstance.setOption(option, { notMerge: false, lazyUpdate: true });
    },

    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("geoLngHeightEchartsPlugin");
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
  width: 1380px;
  height: 610px;
}
</style>
