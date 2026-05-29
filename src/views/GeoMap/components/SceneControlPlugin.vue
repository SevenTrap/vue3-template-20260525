<template>
  <aircas-panel v-show="sceneControlPlugin" title="场景控制" width="320" height="380" bottom="100" right="20" @close="handlePanelClose">
    <div class="scene-control-panel">
      <!-- <div class="form-item">
        <div class="form-title">推演时间</div>

        <div class="form-content">
          <span class="form-content-label">开始时间：</span>
          <el-date-picker
            class="form-content-input"
            v-model="startDate"
            type="datetime"
            size="small"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="handleConfigChange"
          />
        </div>

        <div class="form-content">
          <span class="form-content-label">结束时间：</span>
          <el-date-picker
            class="form-content-input"
            v-model="endDate"
            type="datetime"
            size="small"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="handleConfigChange"
          />
        </div>

        <div class="form-content">
          <span class="form-content-label">步长：</span>
          <el-input-number
            class="form-content-input"
            v-model="stepSec"
            :min="1"
            :max="86400"
            :step="60"
            size="small"
            style="width: 100%"
            @change="handleConfigChange"
          >
            <template #suffix> 秒 </template>
          </el-input-number>
        </div>
      </div> -->

      <div class="form-item">
        <div class="form-title">显示控制</div>

        <div class="button-group">
          <div class="button-group-item">
            <el-checkbox size="small" v-model="showGeoCirclePositions" @change="handleToggleGeoCirclePositions" label="显示同步轨道"></el-checkbox>
          </div>
          <div class="button-group-item">
            <el-checkbox size="small" v-model="showGeoCircleLabel" @change="handleToggleGeoCircleLabel" label="显示经度标签"></el-checkbox>
          </div>
        </div>
      </div>

      <div class="form-item">
        <div class="form-title">图层控制</div>

        <div class="button-group">
          <div class="button-group-item">
            <el-checkbox size="small" v-model="showSatellitePoint" @change="handleToggleSate('showSatellitePoint')" label="显示星下点"></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox size="small" v-model="showSatelliteOrbit" @change="handleToggleSate('showSatelliteOrbit')" label="显示轨道线"></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox size="small" v-model="showSatelliteTrajectory" @change="handleToggleSate('showSatelliteTrajectory')" label="显示轨迹线"></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox size="small" v-model="showSatelliteName" @change="handleToggleSate('showSatelliteName')" label="显示卫星名称"></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox size="small" v-model="showSatelliteModel" @change="handleToggleSate('showSatelliteModel')" label="显示卫星模型"></el-checkbox>
          </div>
        </div>
      </div>
    </div>
  </aircas-panel>
</template>

<script>
import dayjs from "dayjs";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { globalViewer } from "@/utils/initEarth";
import { addGeoCirclePositions, removeGeoCirclePositions, addGeoCircleLabel, removeGeoCircleLabel } from "@/utils/mars3d/mars3dGeoStyle.js";

const geoMapStore = useGeoMapStore();

export default {
  name: "SceneControlPlugin",
  data() {
    return {
      showGeoCirclePositions: true, // 显示同步轨道带
      showGeoCircleLabel: true, // 显示经度标签
      startDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      endDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      stepSec: 3600,
    };
  },

  computed: {
    ...mapState(useGeoMapStore, [
      "sceneControlPlugin",
      "coordinate",
      "showSatellitePoint",
      "showSatelliteOrbit",
      "showSatelliteTrajectory",
      "showSatelliteName",
      "showSatelliteModel",
    ]),
  },
  watch: {},
  methods: {
    /**
     * 推演时间变化时重建
     * @returns {void}
     */
    handleConfigChange() {
      console.log("推演时间变化时重建");
    },

    /**
     * 切换显示/隐藏同步轨道带
     * @returns {void}
     */
    handleToggleGeoCirclePositions() {
      if (this.showGeoCirclePositions) {
        addGeoCirclePositions(globalViewer);
      } else {
        removeGeoCirclePositions(globalViewer);
      }
    },

    handleToggleSate(state) {
      geoMapStore.UPDATE_COMPONENT_VISIBLE(state);
    },

    /**
     * 切换显示/隐藏同步轨道标签
     * @returns {void}
     */
    handleToggleGeoCircleLabel() {
      if (this.showGeoCircleLabel) {
        addGeoCircleLabel(globalViewer);
      } else {
        removeGeoCircleLabel(globalViewer);
      }
    },

    /**
     * 在 ECEF / ECI 间切换坐标系
     * @returns {void}
     */
    handleToggleCoord() {
      const nextCoord = this.coordinate === "ECI" ? "ECEF" : "ECI";
      geoMapStore.SET_COORDINATE(nextCoord);
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

  .form-item {
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--aircas-color-border);

    .form-title {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      border-left: 3px solid #018a87;
      padding-left: 6px;
      margin-bottom: 8px;
    }

    .form-content {
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;

      .form-content-label {
        font-size: 12px;
        color: #fff;
        width: 100px;
        text-align: right;
        padding-right: 6px;
      }

      .form-content-input {
        width: 100%;
      }

      :deep(.el-input-number) {
        width: 100%;
      }
    }
  }

  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 20px;

    .button-group-item {
      width: calc(50% - 10px);
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
  }
}
</style>
