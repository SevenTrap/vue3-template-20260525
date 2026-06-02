import { defineStore } from "pinia";
import { markRaw } from "vue";

export const useGeoMapStore = defineStore("geoMap", {
  state: () => ({
    sceneID: "1", // 场景ID
    threatTargetID: "41745", // 威胁目标ID
    threatTles: [
      {
        tle1: "1 41745U 16052B   25229.77426406 -.00000357  00000+0  00000+0 0  9995",
        tle2: "2 41745   3.3916  81.0830 0000698 162.2044 123.4419  0.99877634 24875",
      },
    ],
    importTargetID: "62485", // 被威胁目标ID
    importTles: [
      {
        tle1: "1 62485U 25002A   25232.73662537 -.00000369  00000+0  00000+0 0  9994",
        tle2: "2 62485   4.4283  62.8934 0055655 163.9399 134.6503  1.00282227  2352",
      },
    ], // 被威胁目标TLE
    besideTargetIDs: [], // 旁观目标ID
    besideTles: {}, // 旁观目标TLE { ID: [{ tle1: "", tle2: "" }] }
    startTime: "", // 开始时间
    endTime: "", // 结束时间
    closeTime: "", // 接近时间
    timeStep: 1 * 60 * 1000, // 默认时间步长：1分钟
    timeFront: 24 * 60 * 60 * 1000, // 前轨时间：1天
    timeBack: 24 * 60 * 60 * 1000, // 后轨时间：1天

    satellitesTree: markRaw([]), // 卫星树
    satelliteModels: markRaw(new Map()), // NORAD -> SatelliteClass 实例

    satelliteTreePlugin: false, // 卫星插件
    checkedNorads: [], // SatelliteTreePlugin 当前勾选的 NORAD ID 列表

    geoSatRelativeEchartsPlugin: false, // GEO卫星相对距离与光照角插件
    geoLngHeightEchartsPlugin: false, // GEO卫星高度与经度插件
    // orbitDynamicsPlugin: false, // 轨道动力学可视化插件

    sceneControlPlugin: false, // 场景控制插件
    showSatellitePoint: true, // 显示星下点
    showSatelliteOrbit: true, // 显示轨道线
    showSatelliteTrajectory: true, // 显示轨迹线
    showSatelliteName: true, // 显示卫星名称
    showSatelliteModel: true, // 显示卫星模型

    orbitViewControlPlugin: true, // 视角控制插件
    focusedNorad: "", // 当前视角聚焦的卫星 NORAD ID
    coordinate: "ECEF", // 坐标系
  }),
  getters: {
    getMenuBarVisible: (state) => {
      return (item) => state[item];
    },
  },
  actions: {
    /**
     * @description 切换菜单栏组件显隐
     * @param {string} menuItem
     */
    TOGGLE_COMPONENT_VISIBLE(menuItem) {
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
     * @description 设置状态数据
     * @param {Object} paylod
     * @param {string} paylod.key
     * @param {any} paylod.value
     */
    SET_STATE_DATA(paylod) {
      this[paylod.key] = paylod.value;
    },

    /**
     * @description 同步 SatelliteTreePlugin 当前勾选的 NORAD ID
     * @param {Array<string>} norads
     */
    SET_CHECKED_NORADS(norads) {
      this.checkedNorads = Array.isArray(norads) ? [...norads] : [];
    },
  },
});
