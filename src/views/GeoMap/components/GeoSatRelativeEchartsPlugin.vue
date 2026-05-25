<template>
  <aircas-panel
    v-show="geoSatRelativeEchartsPluginVisiable"
    title="GEO相对距离与光照角"
    width="900"
    height="500"
    top="120"
    left="180"
    @close="handlePanelClose"
  >
    <div class="geo-sat-relative-echarts" ref="chartContainer"></div>
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
  name: "GeoSatRelativeEchartsPlugin",
  data() {
    return {};
  },
  computed: {
    ...mapState(useGeoMapStore, ["geoSatRelativeEchartsPluginVisiable"]),
  },
  mounted() {
    this.chartInstance = echarts.init(this.$refs.chartContainer);

    this.initChart();
  },

  methods: {
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("geoSatRelativeEchartsPluginVisiable");
    },

    initChart() {
      const { times, distances, sunAngles } = this.computeSeries();

      console.log(times, distances, sunAngles);

      this.chartInstance.resize();

      const option = {
        tooltip: {
          trigger: "axis",
          axisPointer: {
            label: {
              backgroundColor: "#505765",
            },
          },
          // formatter: function (params) {
          //   console.log(params);
          //   return "333";
          // },
        },
        grid: [{ left: 60, right: 60, top: 40, bottom: 60 }],

        xAxis: [
          {
            type: "category",
            data: times,
          },
        ],
        yAxis: [
          {
            type: "value",
            name: "距离 / km",
            position: "left",
          },
          {
            type: "value",
            name: "太阳光照角 / °",
            position: "right",
          },
        ],
        series: [
          {
            // name: "相对距离",
            type: "line",

            yAxisIndex: 0,
            data: distances,
          },
          {
            // name: "太阳光照角",
            type: "line",

            yAxisIndex: 1,
            data: sunAngles,
          },
        ],
      };

      this.chartInstance && this.chartInstance.setOption(option, { notMerge: true, lazyUpdate: false });
      this.chartInstance.resize();
    },
    computeSeries() {
      const start = dayjs("2026-04-03 00:00:00");
      const end = dayjs("2026-04-05 23:59:59");
      const AU_KM = 149597870.7; // 天文单位（km），用于 sunPos 的 rsun(AU) -> km

      const satA = new SatelliteClass(
        "GEO-A",
        "1 20253U 89077A   25233.16136211 -.00000380  00000+0  00000+0 0  9999",
        "2 20253  12.5052 352.9508 0003271 163.0949 357.5602  1.00269878257559",
      );
      const satB = new SatelliteClass(
        "GEO-B",
        "1 20776U 90079A   25231.46969184  .00000115  00000+0  00000+0 0  9992",
        "2 20776  13.4404 351.8598 0002786 164.3572  14.3439  1.00271099127867",
      );

      const times = [];
      const distances = [];
      const sunAngles = [];

      let current = start;
      while (current.isBefore(end) || current.isSame(end)) {
        const currentDate = current.toDate();

        const posA = satA.getEciPosition(currentDate);
        const posB = satB.getEciPosition(currentDate);

        const isValidVec = (p) => p && [p.x, p.y, p.z].every((v) => Number.isFinite(v));
        if (isValidVec(posA) && isValidVec(posB)) {
          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;
          const dz = posB.z - posA.z;
          const distanceKm = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const satToB = { x: dx, y: dy, z: dz };
          // satellite.js: sunPos(jd) -> geocentric equatorial position of the sun, rsun in AU
          const jd = satellite.jday(currentDate);
          const sunPos = satellite.sunPos(jd);
          const sunEci = {
            x: sunPos.rsun[0] * AU_KM,
            y: sunPos.rsun[1] * AU_KM,
            z: sunPos.rsun[2] * AU_KM,
          };
          if (!isValidVec(sunEci)) {
            current = current.add(1, "hour");
            continue;
          }
          const satToSun = {
            x: sunEci.x - posA.x,
            y: sunEci.y - posA.y,
            z: sunEci.z - posA.z,
          };

          const angleDeg = this.computeAngleDeg(satToB, satToSun);

          times.push(current.format("MM-DD HH:mm"));
          distances.push(Number.isFinite(distanceKm) ? Math.round(distanceKm) : 0);
          sunAngles.push(Number.isFinite(angleDeg) ? Math.round(angleDeg) : 0);
        }

        current = current.add(30 * 60, "second");
      }

      return { times, distances, sunAngles };
    },
    computeAngleDeg(v1, v2) {
      const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
      const norm1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
      const norm2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
      if (!norm1 || !norm2) return 0;
      let cosTheta = dot / (norm1 * norm2);
      if (cosTheta > 1) cosTheta = 1;
      if (cosTheta < -1) cosTheta = -1;
      return (Math.acos(cosTheta) * 180) / Math.PI;
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
