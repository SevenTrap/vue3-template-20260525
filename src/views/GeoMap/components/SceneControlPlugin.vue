<template>
  <aircas-panel v-show="sceneControlPlugin" title="场景控制" width="320" height="320" top="120" left="430" @close="handlePanelClose">
    <div class="scene-control-panel">
      <div class="form-item">
        <div class="form-label">推演时间</div>
        <div class="form-content">
          <span>开始时间：</span>
          <el-date-picker
            v-model="startDate"
            type="datetime"
            size="small"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="handleConfigChange"
          />
        </div>

        <div class="form-content">
          <span>结束时间：</span>
          <el-date-picker v-model="endDate" type="datetime" size="small" style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" @change="handleConfigChange" />
        </div>

        <div class="form-content">
          <span>步长：</span>
          <el-input-number v-model="stepSec" :min="1" :max="86400" :step="60" size="small" style="width: 100%" @change="handleConfigChange" />
        </div>
      </div>
    </div>
  </aircas-panel>
</template>

<script>
import dayjs from "dayjs";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";

const geoMapStore = useGeoMapStore();

export default {
  name: "SceneControlPlugin",
  data() {
    return {
      startDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      endDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      stepSec: 3600,
    };
  },
  computed: {
    ...mapState(useGeoMapStore, ["sceneControlPlugin"]),
  },
  methods: {
    /**
     * 推演时间变化时重建
     * @returns {void}
     */
    handleConfigChange() {
      console.log("推演时间变化时重建");
    },

    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("sceneControlPlugin");
    },
  },
};
</script>

<style lang="scss" scoped>
.scene-control-panel {
  width: 100%;
  height: 100%;
}
</style>
