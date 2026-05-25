/*
 * 注册全剧组件，类似element-ui
 * 全局组件使用
 */

import AircasPanel from "./AircasPanel/index.vue";

export default (Vue) => {
  Vue.component("AircasPanel", AircasPanel);
};
