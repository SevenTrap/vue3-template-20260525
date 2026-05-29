import { defineStore } from "pinia";
import { markRaw } from "vue";

export const useGeoMapStore = defineStore("geoMap", {
  state: () => ({
    satelliteTreePlugin: false, // 卫星插件
    checkedNorads: [], // SatelliteTreePlugin 当前勾选的 NORAD ID 列表
    satelliteModels: markRaw(new Map()), // NORAD -> SatelliteClass 实例

    geoSatRelativeEchartsPlugin: false, // GEO卫星相对距离与光照角插件
    // orbitDynamicsPlugin: false, // 轨道动力学可视化插件

    sceneControlPlugin: false, // 场景控制插件
    showSatellitePoint: true, // 显示星下点
    showSatelliteOrbit: true, // 显示轨道线
    showSatelliteTrajectory: true, // 显示轨迹线
    showSatelliteName: true, // 显示卫星名称
    showSatelliteModel: true, // 显示卫星模型

    orbitViewControlPlugin: true, // 视角控制插件
    coordinate: "ECEF", // ECEF: 地固坐标系、ECI: 惯性坐标系
    viewMode: "default", // 视角预设
    focusedNorad: "", // 当前视角聚焦的卫星 NORAD ID
  }),
  getters: {
    getMenuBarVisible: (state) => {
      return (item) => state[item];
    },
  },
  actions: {
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

    SET_STATE_DATA(paylod) {
      this[paylod.key] = paylod.value;
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
