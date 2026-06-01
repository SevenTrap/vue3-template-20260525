<template>
  <aircas-panel v-show="geoLngHeightEchartsPlugin" title="卫星经度与相对同步轨道高度" width="900" height="500" top="120" left="180" @close="handlePanelClose">
    <div class="geo-sat-relative-echarts" ref="lngHeightEchartsContainer"></div>
  </aircas-panel>
</template>

<script>
import * as echarts from "echarts";
import dayjs from "dayjs";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import SatelliteClass from "@/models/SatelliteClass";
import * as satellite from "satellite.js";

const geoMapStore = useGeoMapStore();

export default {
  name: "GeoLngHeightEchartsPlugin",
  data() {
    return {
      chartInstance: null,
    };
  },
  computed: {
    ...mapState(useGeoMapStore, ["geoLngHeightEchartsPlugin"]),
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
  mounted() {
    // this.$nextTick(() => {
    //   this.ensureChartReady();
    //   if (this.geoLngHeightEchartsPlugin) {
    //     this.initChart();
    //   }
    // });
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
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("geoLngHeightEchartsPlugin");
    },

    initChart() {
      const { points } = this.computeSeries();

      if (!this.chartInstance) return;
      this.chartInstance.resize();

      const option = {
        tooltip: {
          trigger: "item",
          formatter: (params) => {
            const [lng, relativeHeightKm] = params.value || [];
            const lngText = Number.isFinite(lng) ? lng.toFixed(2) : "--";
            const heightText = Number.isFinite(relativeHeightKm) ? relativeHeightKm.toFixed(2) : "--";
            return `经度: ${lngText}°<br/>相对同步轨道高度: ${heightText} km`;
          },
        },
        grid: [{ left: 60, right: 60, top: 40, bottom: 60 }],

        xAxis: {
          type: "value",
          name: "经度 / °",
          min: -180,
          max: 180,
        },
        yAxis: {
          type: "value",
          name: "相对同步轨道高度 / km",
        },
        series: [
          {
            name: "经度-相对高度",
            type: "scatter",
            symbolSize: 6,
            data: points,
          },
        ],
      };

      this.chartInstance &&
        this.chartInstance.setOption(option, {
          notMerge: true,
          lazyUpdate: false,
        });
      this.chartInstance.resize();
    },
    computeSeries() {
      const start = dayjs("2026-04-03 00:00:00");
      const end = dayjs("2026-04-05 23:59:59");
      const EARTH_RADIUS_KM = 6378.137;
      const GEO_ALTITUDE_KM = 35786;

      const satA = new SatelliteClass(
        "GEO-A",
        "1 20253U 89077A   25233.16136211 -.00000380  00000+0  00000+0 0  9999",
        "2 20253  12.5052 352.9508 0003271 163.0949 357.5602  1.00269878257559",
      );

      const points = [];

      let current = start;
      while (current.isBefore(end) || current.isSame(end)) {
        const currentDate = current.toDate();

        const posA = satA.getEciPosition(currentDate);

        const isValidVec = (p) => p && [p.x, p.y, p.z].every((v) => Number.isFinite(v));
        if (isValidVec(posA)) {
          const gmst = satellite.gstime(currentDate);
          const geodetic = satellite.eciToGeodetic(posA, gmst);
          const lngDeg = satellite.degreesLong(geodetic.longitude);
          const satRadiusKm = Math.sqrt(posA.x * posA.x + posA.y * posA.y + posA.z * posA.z);
          const satAltitudeKm = satRadiusKm - EARTH_RADIUS_KM;
          const relativeGeoHeightKm = satAltitudeKm - GEO_ALTITUDE_KM;

          if (Number.isFinite(lngDeg) && Number.isFinite(relativeGeoHeightKm)) {
            points.push([Number(lngDeg.toFixed(4)), Number(relativeGeoHeightKm.toFixed(4))]);
          }
        }

        current = current.add(30 * 60, "second");
      }

      return { points };
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
