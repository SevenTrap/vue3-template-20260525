<template>
  <div ref="geoEarthContainer" class="earth-container"></div>

  <!-- 页面左侧菜单栏组件 -->
  <MenuBar></MenuBar>

  <AircasManagerLayersPlugin></AircasManagerLayersPlugin>

  <SSTLayer></SSTLayer>
</template>

<script>
import { initViewer, globalViewer } from "@/utils/initEarth";
import { initLayers } from "./configs/initLayer.js";
import { addGeoCirclePositions, addGeoCircleLabel } from "@/utils/mars3dGeoStyle";

import MenuBar from "./components/MenuBar.vue";
import SSTLayer from "./components/SSTLayer/index.vue";

export default {
  name: "CesiumDemo",
  components: { MenuBar, SSTLayer },

  mounted() {
    let earthContainer = this.$refs.geoEarthContainer;
    MAP_CONFIG_Satellite.scene.center = { lat: 29, lng: 105, alt: 17000000, heading: 360, pitch: -89.8 };
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
