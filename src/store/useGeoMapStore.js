import { defineStore } from "pinia";

export const useGeoMapStore = defineStore("geoMap", {
  state: () => ({
    satelliteTreePlugin: false, // 卫星插件
    satelliteHeatH3Plugin: false, // 卫星热力图H3插件
    geoSatRelativeEchartsPlugin: true, // GEO卫星相对距离与光照角插件

    coordinate: "ECEF", // ECEF: 地固坐标系、ECI: 惯性坐标系
    lookAt: "", // 视角
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
  },
});
