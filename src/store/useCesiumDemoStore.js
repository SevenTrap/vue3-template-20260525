import { defineStore } from "pinia";

export const useCesiumDemoStore = defineStore("CesiumDemo", {
  state: () => ({
    layerManager: false, // 图层管理插件
    sstLayer: fasle,
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
