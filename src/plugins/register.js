/*
 * 注册全局组件
 */

import AircasManagerLayersPlugin from "./AircasManagerLayersPlugin/index.vue";
import AircasGraphicLayersPlugin from "./AircasGraphicLayersPlugin/index.vue";

export default (Vue) => {
  Vue.component("AircasManagerLayersPlugin", AircasManagerLayersPlugin);
  Vue.component("AircasGraphicLayersPlugin", AircasGraphicLayersPlugin);
};
