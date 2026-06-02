import { defineStore } from "pinia";

export const useGeoserverStore = defineStore("geoserver", {
  state: () => ({
    geoserverPlugin: false,
    managerLayersPlugin: false,
  }),
  getters: {
    getMenuBarVisible: (state) => {
      return (item) => state[item];
    },
  },
  actions: {
    TOGGLE_COMPONENT_VISIBLE(menuItem) {
      this[menuItem] = !this[menuItem];
    },

    SET_COMPONENT_VISIBLE_TRUE(menuItem) {
      this[menuItem] = true;
    },

    SET_COMPONENT_VISIBLE_FALSE(menuItem) {
      this[menuItem] = false;
    },
  },
});
