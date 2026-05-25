import { defineStore } from "pinia";
import state from "./state";

const actions = Object;

for (let key in state) {
  let newKey = key[0].toUpperCase() + key.slice(1);
  actions["set" + newKey] = function (value) {
    this[key] = value;
  };
}

export const useGeoEchartsStore = defineStore("geoEcharts", {
  state: () => ({ ...state }),
  getters: {},
  actions: actions,
});
