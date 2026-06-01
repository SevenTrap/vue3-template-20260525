<template>
  <aircas-panel v-show="satelliteTreePlugin" title="卫星列表" width="300" height="700" top="120" left="100" @close="handlePanelClose">
    <el-input v-model="filterText" placeholder="请输入卫星名称" style="margin-bottom: 5px" @keyup.enter="handleSearch" />
    <el-tree-v2
      ref="satelliteTree"
      class="aircas-el-tree-v2"
      :data="satellitesTree"
      node-key="id"
      show-checkbox
      :default-expanded-keys="defaultExpandedKeys"
      @check="handleCheckChange"
      :filter-method="filterNode"
      :height="600"
    >
      <template #default="{ node, data }">
        <template v-if="node.isLeaf">
          <span @click.stop="handleFlyTo(data)">
            {{ node.label }}
          </span>
        </template>

        <template v-else>
          <span>{{ node.label }}</span>
        </template>
      </template>
    </el-tree-v2>
  </aircas-panel>
</template>

<script>
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { globalViewer } from "@/utils/initEarth.js";

import { addSatellite } from "../utils/mars3dSatellite.js";
import { initSatellitesTree } from "../utils/initSatellitesTree.js";

import { satelliteLayer, satellitePathLayer, satelliteLinkLayer, initMars3dLayers } from "../utils/initMars3dLayers.js";

const geoMapStore = useGeoMapStore();

export default {
  name: "SatelliteTreePlugin",
  data() {
    return {
      defaultExpandedKeys: ["root"],
      filterText: "",
      satellitesTree: [],
      checkedNorads: [],
      satelliteModels: null,
    };
  },
  async mounted() {
    const { satellitesTree, satelliteModels } = await initSatellitesTree();

    this.satellitesTree = satellitesTree;
    this.satelliteModels = satelliteModels;

    geoMapStore.SET_SATELLITE_MODELS(satelliteModels);

    this.$nextTick(() => {
      initMars3dLayers();
    });
  },
  computed: {
    ...mapState(useGeoMapStore, [
      "satelliteTreePlugin",
      "showSatellitePoint",
      "showSatelliteOrbit",
      "showSatelliteTrajectory",
      "showSatelliteName",
      "showSatelliteModel",
    ]),
  },
  watch: {
    // showSatellitePoint(newVal) {
    //   if (newVal) {
    //     addSatellitePoint(globalViewer);
    //   } else {
    //     removeSatellitePoint(globalViewer);
    //   }
    // },
    // showSatelliteOrbit(newVal) {
    //   toggleSatelliteOribit(satelliteLayer, newVal);
    // },
    // showSatelliteTrajectory(newVal) {
    //   if (newVal) {
    //     addSatelliteTrajectory(globalViewer);
    //   } else {
    //     removeSatelliteTrajectory(globalViewer);
    //   }
    // },
    // showSatelliteName(newVal) {
    //   if (newVal) {
    //     addSatelliteName(globalViewer);
    //   } else {
    //     removeSatelliteName(globalViewer);
    //   }
    // },
    // showSatelliteModel(newVal) {
    //   if (newVal) {
    //     addSatelliteModel(globalViewer);
    //   } else {
    //     removeSatelliteModel(globalViewer);
    //   }
    // },
  },
  methods: {
    handleCheckChange(data, info) {
      const currentCheckedNorads = info.checkedKeys;
      const oldCheckedNorads = this.checkedNorads.slice();

      const addedNorads = currentCheckedNorads.filter((norad) => !oldCheckedNorads.includes(norad));
      const removeNorads = oldCheckedNorads.filter((norad) => !currentCheckedNorads.includes(norad));

      for (let i = 0, len = addedNorads.length; i < len; i++) {
        try {
          const norad = addedNorads[i];
          const satelliteModel = this.satelliteModels.get(norad);
          if (satelliteModel) addSatellite(satelliteLayer, satelliteModel);
        } catch (e) {
          console.error(e);
        }
      }

      for (let i = 0, len = removeNorads.length; i < len; i++) {
        const norad = removeNorads[i];
        this.removeSatelliteById(norad);
      }

      this.checkedNorads = currentCheckedNorads;
      geoMapStore.SET_CHECKED_NORADS(currentCheckedNorads);
    },

    handleFlyTo(data) {
      const currentGraphic = satelliteLayer.getGraphicById(data.id);
      if (currentGraphic) globalViewer.flyToGraphic(currentGraphic);
    },

    handleSearch() {
      this.$refs.satelliteTree.filter(this.filterText);
    },

    filterNode(value, data) {
      if (!value) return true;
      return data.label && data.label.indexOf(value) !== -1;
    },

    removeGraphicById(graphicLayer, id) {
      const graphic = graphicLayer.getGraphicById(id);
      if (!graphic) return;
      graphicLayer.removeGraphic(graphic);
    },
    removeSatelliteById(id) {
      const sateGraphic = satelliteLayer.getGraphicById(id);
      const pathGraphic = satelliteLayer.getGraphicById(`${id}-path`);
      if (pathGraphic) satelliteLayer.removeGraphic(pathGraphic);
      if (sateGraphic) satelliteLayer.removeGraphic(sateGraphic);
    },

    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("satelliteTreePlugin");
    },
  },
};
</script>

<style lang="scss" scoped>
.satellite {
  width: 100%;
  height: 100%;
}
</style>
