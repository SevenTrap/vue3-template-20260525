import { defineStore } from "pinia";
import { markRaw } from "vue";

export const useGeoMapStore = defineStore("geoMap", {
  state: () => ({
    satelliteTreePlugin: false, // 卫星插件
    geoSatRelativeEchartsPlugin: false, // GEO卫星相对距离与光照角插件
    orbitDynamicsPlugin: false, // 轨道动力学可视化插件
    orbitViewControlPlugin: false, // 视角控制插件

    coordinate: "ECEF", // ECEF: 地固坐标系、ECI: 惯性坐标系
    lookAt: "", // 视角
    viewMode: "default", // 视角预设：default / firstPerson / thirdPerson / southPole / northPole / equator
    focusedNorad: "", // 当前视角聚焦的卫星 NORAD ID

    checkedNorads: [], // SatelliteTreePlugin 当前勾选的 NORAD ID 列表
    satelliteModels: markRaw(new Map()), // NORAD -> SatelliteClass 实例
  }),
  getters: {
    getMenuBarVisible: (state) => {
      return (item) => state[item];
    },
  },
  actions: {
    /**
     * @description 更新菜单栏组件
     * @param {string} menuItem
     */
    UPDATE_COMPONENT_VISIBLE(menuItem) {
      this[menuItem] = !this[menuItem];
    },

    /**
     * @description 设置菜单栏组件为true
     * @param {string} menuItem
     */
    SET_COMPONENT_VISIBLE_TRUE(menuItem) {
      this[menuItem] = true;
    },

    /**
     * @description 设置菜单栏组件为false
     * @param {string} menuItem
     */
    SET_COMPONENT_VISIBLE_FALSE(menuItem) {
      this[menuItem] = false;
    },

    /**
     * @description 切换坐标系（ECI/ECEF）
     * @param {"ECI"|"ECEF"} coord
     */
    SET_COORDINATE(coord) {
      this.coordinate = coord;
    },

    /**
     * @description 设置当前视角预设
     * @param {string} mode
     */
    SET_VIEW_MODE(mode) {
      this.viewMode = mode;
    },

    /**
     * @description 设置视角聚焦的卫星 NORAD ID
     * @param {string} noradID
     */
    SET_FOCUSED_NORAD(noradID) {
      this.focusedNorad = noradID;
    },

    /**
     * @description 同步 SatelliteTreePlugin 当前勾选的 NORAD ID
     * @param {Array<string>} norads
     */
    SET_CHECKED_NORADS(norads) {
      this.checkedNorads = Array.isArray(norads) ? [...norads] : [];
    },

    /**
     * @description 同步 SatelliteClass 实例集合（以 markRaw 包装避免 reactive）
     * @param {Map} models
     */
    SET_SATELLITE_MODELS(models) {
      this.satelliteModels = markRaw(models || new Map());
    },
  },
});
