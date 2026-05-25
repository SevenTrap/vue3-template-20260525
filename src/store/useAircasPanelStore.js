import { defineStore } from "pinia";

export const useAircasPanelStore = defineStore("aircasPanel", {
  state: () => ({
    CURRENT_PENAL_INDEX: 10,
  }),
  getters: {
    /**
     * 获取当前panel的z-index值
     * @param {*} state
     * @returns
     */
    GET_CURRENT_PENAL_INDEX: (state) => {
      return state.CURRENT_PENAL_INDEX;
    },
  },
  actions: {
    /**
     * @description 更新当前panel最大的z-index
     * @param {Number} payload
     */
    UPDATE_PENAL_INDEX(payload) {
      this.CURRENT_PENAL_INDEX = payload;
    },
  },
});
