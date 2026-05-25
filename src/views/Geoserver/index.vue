<template>
  <div class="geoserver-container">
    <div ref="geoserverContainer" class="earth-container"></div>

    <!-- 页面左侧菜单栏组件 -->
    <MenuBar></MenuBar>

    <ManagerLayers></ManagerLayers>
  </div>
</template>

<script>
import { initViewer, globalViewer } from "@/utils/initEarth";
import { initLayers } from "./utils/initLayer.js";
import { addGeoCirclePositions, addGeoCircleLabel } from "@/utils/mars3d/mars3dGeoStyle.js";

import MenuBar from "./components/MenuBar.vue";
import ManagerLayers from "./components/ManagerLayers.vue";
export default {
  name: "Geoserver",
  components: { MenuBar, ManagerLayers },

  mounted() {
    let earthContainer = this.$refs.geoserverContainer;
    MAP_CONFIG_Satellite.scene.center = {
      lat: 29,
      lng: 105,
      alt: 17000000,
      heading: 360,
      pitch: -89.8,
    };
    initViewer(earthContainer, MAP_CONFIG_Satellite);
    initLayers(globalViewer);

    addGeoCirclePositions(globalViewer);
    addGeoCircleLabel(globalViewer);
  },

  beforeUnmount() {
    globalViewer.destroy();
  },
};
</script>

<style lang="scss" scoped>
.earth-container {
  width: 100%;
  height: 100%;
}
</style>
