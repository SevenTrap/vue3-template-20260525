<template>
  <aircas-panel v-show="sceneControlPluginBase" title="场景控制" width="320" height="450" bottom="100" right="20" @close="handlePanelClose">
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
            <el-checkbox size="small" v-model="showGeoCirclePositions" @change="handleToggleGeoCirclePositions" label="显示同步轨道"></el-checkbox>
          </div>
          <div class="button-group-item">
            <el-checkbox size="small" v-model="showGeoCircleLabel" @change="handleToggleGeoCircleLabel" label="显示经度标签"></el-checkbox>
          </div>
          <div class="button-group-item">
            <el-checkbox size="small" v-model="showPatrolArea" @change="handleTogglePatrolArea" label="显示巡视区域"></el-checkbox>
          </div>
        </div>
      </div>

      <div class="form-item">
        <div class="form-title">卫星控制</div>

        <div class="button-group">
          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showSatelliteOrbit" @change="handleToggleSate('showSatelliteOrbit')" label="显示轨道"></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showSatelliteName" @change="handleToggleSate('showSatelliteName')" label="显示卫星名称"></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showSatelliteModel" @change="handleToggleSate('showSatelliteModel')" label="显示卫星模型"></el-checkbox>
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
  toggleSatelliteTrajectory,
  toggleSatelliteName,
  toggleSatelliteModel,
  toggleSatellitePoint,
  setSatelliteFaceEarth,
} from "../utils/mars3dSatellite.js";
import { lockCameraToInertial, unlockCameraFromInertial } from "../utils/mars3dOrbitDynamics.js";
import { BASE_VIEW_PRESETS, GLOBAL_VIEW_ALT } from "../configs/index.js";

const geoMapStore = useGeoMapStore();

export default {
  name: "SceneControlPluginBase",
  data() {
    return {
      basePresets: BASE_VIEW_PRESETS,
      viewMode: "default",

      showGeoCirclePositions: true, // 显示同步轨道带
      showGeoCircleLabel: true, // 显示经度标签
      showPatrolArea: true, // 显示巡视区域
      startDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      endDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      stepSec: 3600,
    };
  },

  computed: {
    ...mapState(useGeoMapStore, [
      "sceneControlPluginBase",
      "coordinate",

      "threatTargetID",
      "importTargetID",

      "showSatellitePoint",
      "showSatelliteOrbit",
      "showSatelliteTrajectory",
      "showSatelliteName",
      "showSatelliteModel",
    ]),
  },
  watch: {
    showSatellitePoint(newVal) {
      toggleSatellitePoint(satelliteLayer, newVal);
    },
    showSatelliteOrbit(newVal) {
      toggleSatelliteOribit(satelliteLayer, newVal);
    },
    showSatelliteTrajectory(newVal) {
      toggleSatelliteTrajectory(satelliteLayer, newVal);
    },
    showSatelliteName(newVal) {
      toggleSatelliteName(satelliteLayer, newVal);
    },
    showSatelliteModel(newVal) {
      toggleSatelliteModel(satelliteLayer, newVal);
    },
  },
  methods: {
    handleCoordinateChange(value) {
      if (value === this.coordinate) return;

      geoMapStore.SET_STATE_DATA({ key: "coordinate", value: value });

      this.applyCameraLock(); // 应用相机锁定
    },

    /**
     * 根据当前坐标系决定是否锁定惯性相机
     * @returns {void}
     */
    applyCameraLock() {
      if (!globalViewer) return;

      if (this.coordinate === "ECI") {
        lockCameraToInertial(globalViewer);
      } else {
        unlockCameraFromInertial(globalViewer);
      }

      this.handleToggleSatelliteOrbit();
    },

    /**
     * 切换卫星轨道显示状态
     * @returns {void}
     */
    handleToggleSatelliteOrbit() {
      if (this.coordinate === "ECI") {
        satelliteLayer.eachGraphic((graphic) => {
          console.log(graphic, "graphic");
          if (!graphic._isSate) return;
          graphic.referenceFrame = mars3d.Cesium.ReferenceFrame.INERTIAL;
          return graphic;
        });
      } else {
        satelliteLayer.eachGraphic((graphic) => {
          console.log(graphic, "graphic");
          if (!graphic._isSate) return;
          graphic.referenceFrame = mars3d.Cesium.ReferenceFrame.FIXED;
          return graphic;
        });
      }
    },

    /**
     * 应用视角
     * @param {string} presetId - 预设 id
     * @returns {void}
     */
    handleApplyView(presetId) {
      switch (presetId) {
        case "default":
          this.flyToGlobal(104, 27, GLOBAL_VIEW_ALT, -90); // 默认视角
          break;
        case "southPole":
          this.flyToGlobal(0, -90, GLOBAL_VIEW_ALT, -90); // 南极视角
          break;
        case "equator":
          this.flyToGlobal(0, 0, GLOBAL_VIEW_ALT, -90); // 赤道视角
          break;
      }
    },

    /**
     * 按经纬高 / 俯仰飞行到指定全球视角
     * @param {number} lon - 经度（度）
     * @param {number} lat - 纬度（度）
     * @param {number} alt - 高度（米）
     * @param {number} pitchDeg - 俯仰（度，负值朝下）
     * @returns {void}
     */
    flyToGlobal(lon, lat, alt, pitchDeg) {
      globalViewer.camera.flyTo({
        destination: mars3d.Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        orientation: {
          heading: mars3d.Cesium.Math.toRadians(0),
          pitch: mars3d.Cesium.Math.toRadians(pitchDeg),
          roll: 0,
        },
        duration: 1.5,
      });
    },

    /**
     * 切换同步轨道显示状态
     * @returns {void}
     */
    handleToggleGeoCirclePositions() {
      if (this.showGeoCirclePositions) {
        addGeoCirclePositions(globalViewer);
      } else {
        removeGeoCirclePositions(globalViewer);
      }
    },

    /**
     * 切换经度标签显示状态
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
     * 切换巡视区域显示状态
     * @returns {void}
     */
    handleTogglePatrolArea() {
      if (this.showPatrolArea) {
        addPatrolArea(globalViewer);
      } else {
        removePatrolArea(globalViewer);
      }
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
