<template>
  <aircas-panel v-show="sceneControlPluginBase" title="场景控制" width="320" height="400" bottom="100" right="20" @close="handlePanelClose">
    <div class="scene-control-panel">
      <div class="form-item">
        <div class="form-title">坐标系</div>

        <el-radio-group :model-value="coordinate" size="small" @change="handleCoordinateChange">
          <el-radio value="ECEF">地固系</el-radio>
          <el-radio value="ECI">惯性系</el-radio>
        </el-radio-group>
      </div>

      <div class="form-item">
        <div class="form-title">惯性系视角</div>

        <el-radio-group v-model="viewMode" size="small" @change="handleApplyView">
          <el-radio v-for="preset in basePresets" :key="preset.id" :value="preset.id">{{ preset.label }}</el-radio>
        </el-radio-group>
      </div>

      <div class="form-item">
        <div class="form-title">显示控制</div>

        <div class="button-group">
          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showGeoCirclePositions" @change="handleToggleSate('showGeoCirclePositions')" label="显示同步轨道">
            </el-checkbox>
          </div>
          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showGeoCircleLabel" @change="handleToggleSate('showGeoCircleLabel')" label="显示经度标签"></el-checkbox>
          </div>
          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showPatrolArea" @change="handleToggleSate('showPatrolArea')" label="显示巡视区域"></el-checkbox>
          </div>
        </div>
      </div>

      <div class="form-item" style="border-bottom: none">
        <div class="form-title">卫星控制</div>

        <div class="button-group">
          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteNameBase"
              @change="handleToggleSate('showSatelliteNameBase')"
              label="显示卫星名称"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteModelBase"
              @change="handleToggleSate('showSatelliteModelBase')"
              label="显示卫星模型"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatellitePointBase"
              @change="handleToggleSate('showSatellitePointBase')"
              label="显示卫星点位"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteOrbitBase"
              @change="handleToggleSate('showSatelliteOrbitBase')"
              label="显示卫星轨道"
            ></el-checkbox>
          </div>
        </div>
      </div>
    </div>
  </aircas-panel>
</template>

<script>
import * as mars3d from "mars3d";
import dayjs from "dayjs";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { globalViewer } from "@/utils/initEarth";
import { satelliteLayer } from "../utils/initMars3dLayers.js";
import {
  addGeoCirclePositions,
  removeGeoCirclePositions,
  addGeoCircleLabel,
  removeGeoCircleLabel,
  addPatrolArea,
  removePatrolArea,
} from "@/utils/mars3d/mars3dGeoStyle.js";
import {
  toggleSatelliteOribit,
  toggleSatelliteName,
  toggleSatelliteModel,
  toggleSatellitePoint,
  rebuildSatelliteReferenceFrame,
} from "../utils/mars3dSatelliteBase.js";
import { lockCameraToInertial, unlockCameraFromInertial } from "../utils/mars3dOrbitDynamics.js";
import { BASE_VIEW_PRESETS, GLOBAL_VIEW_ALT } from "../configs/index.js";

const geoMapStore = useGeoMapStore();

export default {
  name: "SceneControlPluginBase",
  data() {
    return {
      basePresets: BASE_VIEW_PRESETS,
      viewMode: "default",
      startDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      endDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      stepSec: 3600,
    };
  },

  computed: {
    ...mapState(useGeoMapStore, [
      "sceneControlPluginBase",
      "coordinate",
      "showGeoCirclePositions",
      "showGeoCircleLabel",
      "showPatrolArea",
      "showSatelliteOrbitBase",
      "showSatelliteNameBase",
      "showSatelliteModelBase",
      "showSatellitePointBase",
    ]),
  },
  watch: {
    showGeoCirclePositions(newVal) {
      if (newVal) {
        addGeoCirclePositions(globalViewer);
      } else {
        removeGeoCirclePositions(globalViewer);
      }
    },
    showGeoCircleLabel(newVal) {
      if (newVal) {
        addGeoCircleLabel(globalViewer);
      } else {
        removeGeoCircleLabel(globalViewer);
      }
    },
    showPatrolArea(newVal) {
      if (newVal) {
        addPatrolArea(globalViewer);
      } else {
        removePatrolArea(globalViewer);
      }
    },
    showSatelliteOrbitBase(newVal) {
      toggleSatelliteOribit(satelliteLayer, newVal);
    },
    showSatellitePointBase(newVal) {
      toggleSatellitePoint(satelliteLayer, newVal);
    },
    showSatelliteNameBase(newVal) {
      toggleSatelliteName(satelliteLayer, newVal);
    },
    showSatelliteModelBase(newVal) {
      toggleSatelliteModel(satelliteLayer, newVal);
    },
  },
  methods: {
    handleCoordinateChange(value) {
      if (value === this.coordinate) return;

      geoMapStore.SET_STATE_DATA({ key: "coordinate", value: value });
      geoMapStore.SET_STATE_DATA({ key: "showSatelliteOrbitBase", value: true });
      geoMapStore.SET_STATE_DATA({ key: "showSatellitePointBase", value: true });
      geoMapStore.SET_STATE_DATA({ key: "showSatelliteNameBase", value: true });
      geoMapStore.SET_STATE_DATA({ key: "showSatelliteModelBase", value: true });

      this.applyCameraLock(); // 应用相机锁定
      this.handleApplyView(this.viewMode);
      this.handleToggleSatelliteOrbit();
    },

    /**
     * 根据当前坐标系决定是否锁定惯性相机
     * @returns {void}
     */
    applyCameraLock() {
      if (this.coordinate === "ECI") {
        lockCameraToInertial(globalViewer);
      } else {
        unlockCameraFromInertial(globalViewer);
      }
    },

    /**
     * 切换卫星参考坐标系
     * @returns {void}
     */
    handleToggleSatelliteOrbit() {
      rebuildSatelliteReferenceFrame(satelliteLayer);
    },

    handleToggleSate(state) {
      geoMapStore.TOGGLE_COMPONENT_VISIBLE(state);
    },

    /**
     * 应用视角
     * @param {string} presetId - 预设 id
     * @returns {void}
     */
    handleApplyView(presetId) {
      switch (presetId) {
        case "default":
          this.flyToGlobal(107.5, 27, GLOBAL_VIEW_ALT, 360, -89); // 默认视角
          break;
        case "southPole":
          this.flyToGlobal(107.5, -90, GLOBAL_VIEW_ALT, 180, -90); // 南极视角
          break;
        case "equator":
          this.flyToGlobal(107.5, 0, GLOBAL_VIEW_ALT, 0, -90); // 赤道视角
          break;
      }
    },

    flyToGlobal(lon, lat, alt, heading, pitchDeg) {
      globalViewer.camera.flyTo({
        destination: mars3d.Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        orientation: {
          heading: mars3d.Cesium.Math.toRadians(heading),
          pitch: mars3d.Cesium.Math.toRadians(pitchDeg),
          roll: 0,
        },
        duration: 1.5,
      });
    },

    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("sceneControlPluginBase");
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
