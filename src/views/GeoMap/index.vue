<template>
  <div ref="geoEarthContainer" class="earth-container" :class="$attrs.class"></div>

  <!-- 页面左侧菜单栏组件 -->
  <MenuBarPlugin></MenuBarPlugin>
  <MenuTools></MenuTools>

  <!-- 所有插件在此处需要进行handleClose处理 -->
  <AircasManagerLayersPlugin></AircasManagerLayersPlugin>

  <AircasGraphicLayersPlugin></AircasGraphicLayersPlugin>

  <!-- 卫星树插件 -->
  <SatelliteTreePlugin></SatelliteTreePlugin>

  <!-- GEO卫星相对距离与光照角插件 -->
  <GeoSatRelativeEchartsPlugin></GeoSatRelativeEchartsPlugin>

  <!-- 卫星经度与相对同步轨道高度插件 -->
  <GeoLngHeightEchartsPlugin></GeoLngHeightEchartsPlugin>

  <!-- 视角控制插件 -->
  <OrbitViewControlPlugin></OrbitViewControlPlugin>

  <!-- 场景控制插件 -->
  <SceneControlPlugin></SceneControlPlugin>
</template>

<script>
import { initViewer, globalViewer } from "@/utils/initEarth";
import { addGeoCirclePositions, addGeoCircleLabel, addPatrolArea } from "@/utils/mars3d/mars3dGeoStyle.js";

import MenuBarPlugin from "./components/MenuBarPlugin.vue";
import MenuTools from "./components/MenuTools.vue";
import SatelliteTreePlugin from "./components/SatelliteTreePlugin.vue";
import GeoSatRelativeEchartsPlugin from "./components/GeoSatRelativeEchartsPlugin.vue";
import GeoLngHeightEchartsPlugin from "./components/GeoLngHeightEchartsPlugin.vue";
import OrbitViewControlPlugin from "./components/OrbitViewControlPlugin.vue";
import SceneControlPlugin from "./components/SceneControlPlugin.vue";

export default {
  name: "GeoMap",
  components: {
    MenuBarPlugin,
    MenuTools,
    SatelliteTreePlugin,
    GeoSatRelativeEchartsPlugin,
    GeoLngHeightEchartsPlugin,
    OrbitViewControlPlugin,
    SceneControlPlugin,
  },

  async mounted() {
    let earthContainer = this.$refs.geoEarthContainer;
    initViewer(earthContainer, MAP_CONFIG_Satellite);

    this.$nextTick(() => {
      addGeoCircleLabel(globalViewer);
      addGeoCirclePositions(globalViewer);
      addPatrolArea(globalViewer);
    });
  },

  beforeUnmount() {
    globalViewer.destroy();
  },
};
</script>

<style lang="scss" scoped>
.earth-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
