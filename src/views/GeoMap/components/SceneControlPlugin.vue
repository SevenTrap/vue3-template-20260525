<template>
  <aircas-panel v-show="sceneControlPlugin" title="场景控制" width="320" height="450" bottom="100" right="20" @close="handlePanelClose">
    <div class="scene-control-panel">
      <div class="form-item">
        <div class="form-title">坐标系</div>

        <el-radio-group :model-value="coordinate" size="small" @change="handleCoordinateChange">
          <el-radio value="ECEF">地固系(ECEF)</el-radio>
          <el-radio value="ECI">惯性系(ECI)</el-radio>
        </el-radio-group>
      </div>

      <!-- ECEF 坐标系下的视角预设 -->
      <div v-if="coordinate === 'ECEF'" class="form-item">
        <div class="form-title">ECEF 视角</div>

        <el-radio-group v-model="viewMode" size="small" @change="handleApplyView">
          <el-radio v-for="preset in ecefPresets" :key="preset.id" :value="preset.id">{{ preset.label }}</el-radio>
        </el-radio-group>
      </div>

      <!-- ECI 坐标系下的视角预设 -->
      <div v-if="coordinate === 'ECI'" class="form-item">
        <div class="form-title">ECI 视角</div>

        <el-radio-group v-model="viewMode" size="small" @change="handleApplyView">
          <el-radio v-for="preset in eciPresets" :key="preset.id" :value="preset.id">{{ preset.label }}</el-radio>
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
        </div>
      </div>

      <div class="form-item">
        <div class="form-title">图层控制</div>

        <div class="button-group">
          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showSatellitePoint" @change="handleToggleSate('showSatellitePoint')" label="显示星下点"></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showSatelliteOrbit" @change="handleToggleSate('showSatelliteOrbit')" label="显示轨道线"></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteTrajectory"
              @change="handleToggleSate('showSatelliteTrajectory')"
              label="显示轨迹线"
            ></el-checkbox>
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
import { addGeoCirclePositions, removeGeoCirclePositions, addGeoCircleLabel, removeGeoCircleLabel } from "@/utils/mars3d/mars3dGeoStyle.js";
import {
  toggleSatelliteOribit,
  toggleSatelliteTrajectory,
  toggleSatelliteName,
  toggleSatelliteModel,
  toggleSatellitePoint,
  setSatelliteFaceEarth,
} from "../utils/mars3dSatellite.js";
import {
  ensureOrbitLayer,
  destroyOrbitLayer,
  addSatelliteOrbit,
  removeSatelliteOrbit,
  clearOrbitGraphics,
  lockCameraToInertial,
  unlockCameraFromInertial,
  getSatelliteGraphic,
} from "../utils/mars3dOrbitDynamics.js";
import { ECEF_PRESETS, ECI_PRESETS, GLOBAL_VIEW_ALT } from "../configs/index.js";

const geoMapStore = useGeoMapStore();

export default {
  name: "SceneControlPlugin",
  data() {
    return {
      ecefPresets: ECEF_PRESETS,
      eciPresets: ECI_PRESETS,

      // coordinate: "ECEF",
      viewMode: "default",

      showGeoCirclePositions: true, // 显示同步轨道带
      showGeoCircleLabel: true, // 显示经度标签
      startDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      endDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      stepSec: 3600,

      trackedNorad: "", // 当前跟随的卫星 NORAD ID
    };
  },

  computed: {
    ...mapState(useGeoMapStore, [
      "sceneControlPlugin",
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
      // console.log("showSatellitePoint", newVal);
      toggleSatellitePoint(satelliteLayer, newVal);
    },
    showSatelliteOrbit(newVal) {
      // console.log("showSatelliteOrbit", newVal);
      toggleSatelliteOribit(satelliteLayer, newVal);
    },
    showSatelliteTrajectory(newVal) {
      // console.log("showSatelliteTrajectory", newVal);
      toggleSatelliteTrajectory(satelliteLayer, newVal);
    },
    showSatelliteName(newVal) {
      // console.log("showSatelliteName", newVal);
      toggleSatelliteName(satelliteLayer, newVal);
    },
    showSatelliteModel(newVal) {
      // console.log("showSatelliteModel", newVal);
      toggleSatelliteModel(satelliteLayer, newVal);
    },

    // coordinate(newVal) {
    //   console.log(newVal, "333");

    //   if (newVal === "ECEF") {
    //     toggleSatelliteCoordinate(satelliteLayer, true);
    //   } else {
    //     toggleSatelliteCoordinate(satelliteLayer, false);
    //   }
    // },
  },
  methods: {
    handleCoordinateChange(value) {
      // console.log(value, "handleCoordinateChange");
      this.releaseTracking(); // 释放跟踪卫星，避免遗留跟随状态
      geoMapStore.SET_STATE_DATA({ key: "coordinate", value: value });
      // debugger;

      this.applyCameraLock(); // 应用相机锁定
      this.handleApplyView("default"); // 应用视角
      this.viewMode = "default";
    },

    handleApplyView(presetId) {
      // console.log(this.coordinate, "handleApplyView");
      if (!globalViewer) return;

      // 非主星/从星视角：释放跟随并恢复当前坐标系相机状态
      if (presetId !== "firstSatPole" && presetId !== "secondSatPole") {
        this.releaseTracking();
        this.applyCameraLock();
      }

      if (this.coordinate === "ECI") {
        this.applyEciView(presetId); // 应用 ECI 视角
        geoMapStore.SET_COMPONENT_VISIBLE_TRUE("showSatelliteOrbit");
        geoMapStore.SET_COMPONENT_VISIBLE_FALSE("showSatelliteTrajectory");
      } else {
        this.applyEcefView(presetId); // 应用 ECEF 视角
        geoMapStore.SET_COMPONENT_VISIBLE_FALSE("showSatelliteOrbit");
        geoMapStore.SET_COMPONENT_VISIBLE_TRUE("showSatelliteTrajectory");
      }
    },

    /**
     * 根据当前坐标系决定是否锁定惯性相机
     * @returns {void}
     */
    applyCameraLock() {
      if (!globalViewer) return;
      // console.log(this.coordinate, "applyCameraLock");
      if (this.coordinate === "ECI") {
        lockCameraToInertial(globalViewer);
      } else {
        unlockCameraFromInertial(globalViewer);
      }
    },

    /**
     * ECEF 视角预设分派
     * @param {string} presetId - 预设 id
     * @returns {void}
     */
    applyEcefView(presetId) {
      switch (presetId) {
        case "default":
          this.flyToGlobal(104, 27, GLOBAL_VIEW_ALT, -90); // 默认视角
          break;
        case "southPole":
          this.flyToGlobal(0, -90, GLOBAL_VIEW_ALT, -90); // 南极视角
          break;
        case "starPole":
          this.flyToGlobal(0, 90, GLOBAL_VIEW_ALT, -90); // 恒星视角
          break;
        case "equator":
          this.flyToGlobal(0, 0, GLOBAL_VIEW_ALT, -90); // 赤道视角
          break;
        default:
          break;
      }
    },

    /**
     * ECI 视角预设分派
     * @param {string} presetId - 预设 id
     * @returns {void}
     */
    applyEciView(presetId) {
      switch (presetId) {
        case "default":
          this.flyToGlobal(104, 27, GLOBAL_VIEW_ALT, -90); // 默认视角
          break;
        case "southPole":
          this.flyToGlobal(0, -90, GLOBAL_VIEW_ALT, -90); // 南极视角
          break;
        case "firstSatPole":
          this.flyToFirstPerson(); // 主星视角
          break;
        case "secondSatPole":
          this.flyToThirdPerson(); // 从星视角
          break;
        case "orbitalPlanePole":
          this.flyToOrbitalPlane(); // 轨道平面
          break;
        case "equatorPlanePole":
          this.flyToGlobal(0, 0, GLOBAL_VIEW_ALT, 0); // 赤道平面
          break;
        default:
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
     * 主星视角：相机定位并持续跟随威胁目标卫星
     * @returns {void}
     */
    flyToFirstPerson() {
      this.trackSatellite(this.threatTargetID);
    },

    /**
     * 从星视角：相机定位并持续跟随被威胁目标卫星
     * @returns {void}
     */
    flyToThirdPerson() {
      this.trackSatellite(this.importTargetID);
    },

    /**
     * 持续跟随指定卫星，并让卫星模型朝向地球
     * @param {string|number} noradID - 卫星 NORAD ID
     * @returns {void}
     */
    trackSatellite(noradID) {
      if (!globalViewer || !noradID) return;

      console.log(noradID, "trackSatellite");

      // satelliteLayer.getGraphics().map((graphic) => console.log(graphic.id, "graphicid"));

      const graphic = satelliteLayer?.getGraphics().find((graphic) => graphic.id === "20253");

      if (!graphic) {
        this.$message.warning("未找到该卫星，请先在卫星树中勾选该卫星");
        return;
      }

      unlockCameraFromInertial(globalViewer); // 解除 ECI 锁定，避免与跟随冲突
      setSatelliteFaceEarth(satelliteLayer, noradID, true); // 模型朝向地球

      console.log(graphic.trackedEntity, "graphic.entity");

      globalViewer.trackedEntity = graphic.trackedEntity; // 持续跟随

      this.trackedNorad = noradID;
    },

    /**
     * 释放卫星跟随并还原模型朝向
     * @returns {void}
     */
    releaseTracking() {
      if (!globalViewer) return;

      globalViewer.trackedEntity = undefined;

      if (this.trackedNorad) {
        setSatelliteFaceEarth(satelliteLayer, this.trackedNorad, false);
        this.trackedNorad = "";
      }
    },

    handleToggleGeoCirclePositions() {
      if (this.showGeoCirclePositions) {
        addGeoCirclePositions(globalViewer);
      } else {
        removeGeoCirclePositions(globalViewer);
      }
    },

    handleToggleGeoCircleLabel() {
      if (this.showGeoCircleLabel) {
        addGeoCircleLabel(globalViewer);
      } else {
        removeGeoCircleLabel(globalViewer);
      }
    },

    handleToggleSate(state) {
      // console.log("handleToggleSate", state);
      geoMapStore.TOGGLE_COMPONENT_VISIBLE(state);
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
