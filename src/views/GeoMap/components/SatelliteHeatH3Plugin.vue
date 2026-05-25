<template>
  <aircas-panel v-show="satelliteHeatH3PluginVisiable" title="卫星热力图H3" width="300" height="700" top="120" left="100" @close="handlePanelClose">
    <div class="satellite-heat-h3">
      <div @click="handleShow(1)">1月1日</div>
      <div @click="handleShow(2)">1月2日</div>
      <div @click="handleShow(3)">1月3日</div>
    </div>
  </aircas-panel>
</template>

<script>
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import * as mars3d from "mars3d";
import * as h3 from "h3-js";
import * as d3 from "d3";

import { globalViewer } from "@/utils/initEarth.js";

const geoMapStore = useGeoMapStore();

export default {
  name: "SatelliteHeatH3Plugin",
  computed: {
    ...mapState(useGeoMapStore, ["satelliteHeatH3PluginVisiable"]),
  },
  data() {
    return {
      results1: new Map(),
      results2: new Map(),
      results3: new Map(),
    };
  },

  mounted() {
    setTimeout(() => {
      this.initLayer();
    }, 1000);

    fetch("./data/result.txt")
      .then((res) => res.text())
      .then((data) => {
        const lines = data.split("\n").filter((line) => line.trim() !== "");
        let results1 = new Map();

        for (let i = 0; i < lines.length; i++) {
          const line = JSON.parse(lines[i]);

          for (let j = 0; j < line.length; j++) {
            const h3Index = line[j][1];

            // if (i === 0) {
            if (!results1.has(h3Index)) {
              results1.set(h3Index, 1);
            } else {
              let existingValue = results1.get(h3Index);
              results1.set(h3Index, existingValue + 1);
            }
            // } else if (i === 1) {
            //   if (!results2.has(h3Index)) {
            //     results2.set(h3Index, 1);
            //   } else {
            //     let existingValue = results2.get(h3Index);
            //     results2.set(h3Index, existingValue + 1);
            //   }
            // } else if (i === 2) {
            //   if (!results3.has(h3Index)) {
            //     results3.set(h3Index, 1);
            //   } else {
            //     let existingValue = results3.get(h3Index);
            //     results3.set(h3Index, existingValue + 1);
            //   }
            // }
          }
        }

        this.results1 = results1;
        // this.results2 = results2;
        // this.results3 = results3;
      });
  },
  methods: {
    initLayer() {
      this.h3Layer = new mars3d.layer.GraphicLayer();
      globalViewer.addLayer(this.h3Layer);
    },
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("satelliteHeatH3PluginVisiable");
    },

    handleShow(day) {
      let results;
      if (day === 1) {
        results = this.results1;
      } else if (day === 2) {
        results = this.results2;
      } else if (day === 3) {
        results = this.results3;
      }

      for (let [name, value] of results) {
        const boundary = this.getH3Boundary(name);
        const center = this.getH3Center(name);

        const positions = boundary[0][0].map((pos) => {
          return new mars3d.LngLatPoint(pos[0], pos[1], 10);
        });

        this.addH3Boundary(positions, center, value);
      }
    },

    getH3Boundary(h3Index) {
      return h3.cellsToMultiPolygon([h3Index], true);
    },

    getH3Center(h3Index) {
      return h3.cellToLatLng(h3Index);
    },

    addH3Boundary(positions, center, value) {
      const numStr = String(value);
      const numNum = Number(numStr);
      const colorScale = d3.scaleLinear().domain([200, 300, 600]).range(["blue", "red", "green"]);

      const color = colorScale(numNum);

      const graphicBoundary = new mars3d.graphic.PolygonEntity({
        positions: positions,
        style: {
          color: color,
          outline: false,
          outlineColor: "rgba(255,255,255,0.5)",
          outlineWidth: 1,
        },
        popup: "数量：" + numStr,
        attr: {
          value: numStr,
        },
      });

      const graphicPoint = new mars3d.graphic.PointEntity({
        position: new mars3d.LngLatPoint(center[1], center[0]),
        style: {
          color: "#00ff00",
          outline: false,
          size: 5,
          // outlineColor: "#00ff00",
          // outlineWidth: 2,
          label: {
            show: true,
            text: numStr,
            fontSize: 12,
            color: "#ff0000",
            // pixelOffsetY: -10,
            // distanceDisplayCondition: true,
            // distanceDisplayCondition_far: 500000,
            // distanceDisplayCondition_near: 0,
          },
        },

        popup: "数量：" + value,
        attr: {
          value: value,
        },
      });

      this.h3Layer.addGraphic(graphicBoundary);
      // this.h3Layer.addGraphic(graphicPoint);
    },
  },
};
</script>

<style lang="scss" scoped>
.satellite-heat-h3 {
  color: #ffffff;

  div {
    padding: 5px 15px;
    margin-bottom: 10px;
    background-color: #1e90ff;
    border-radius: 5px;
    cursor: pointer;
    text-align: center;
  }
}
</style>
