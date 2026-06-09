<template>
  <aircas-panel v-show="sceneControlPlugin" title="场景控制" width="320" height="500" bottom="100" right="20" @close="handlePanelClose">
    <div class="scene-control-panel">
      <div class="form-item">
        <div class="form-title">坐标系</div>

        <el-radio-group :model-value="coordinate" size="small" @change="handleCoordinateChange">
          <el-radio value="ECEF">地固系</el-radio>
          <el-radio value="ECI">惯性系</el-radio>
        </el-radio-group>
      </div>

      <!-- ECEF 坐标系下的视角预设 -->
      <div v-if="coordinate === 'ECEF'" class="form-item">
        <div class="form-title">地固系视角</div>

        <el-radio-group v-model="viewMode" size="small" @change="handleApplyView">
          <el-radio v-for="preset in ecefPresets" :key="preset.id" :value="preset.id">{{ preset.label }}</el-radio>
        </el-radio-group>
      </div>

      <!-- ECI 坐标系下的视角预设 -->
      <div v-if="coordinate === 'ECI'" class="form-item">
        <div class="form-title">惯性系视角</div>

        <el-radio-group v-model="viewMode" size="small" @change="handleApplyView">
          <el-radio v-for="preset in eciPresets" :key="preset.id" :value="preset.id">{{ preset.label }}</el-radio>
        </el-radio-group>
      </div>

      <div class="form-item">
        <div class="form-title">显示控制</div>

        <div class="button-group">
          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showGeoCirclePositions"
              @change="handleToggleSate('showGeoCirclePositions')"
              label="显示同步轨道"
            ></el-checkbox>
          </div>
          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showGeoCircleLabel" @change="handleToggleSate('showGeoCircleLabel')" label="显示经度标签"></el-checkbox>
          </div>
          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showPatrolArea" @change="handleToggleSate('showPatrolArea')" label="显示巡视区域"></el-checkbox>
          </div>
        </div>
      </div>

      <div class="form-item">
        <div class="form-title">图层控制</div>

        <div class="button-group">
          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showImportSatelliteOrbitScene"
              @change="handleToggleSate('showImportSatelliteOrbitScene')"
              label="从星轨迹"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showThreatSatelliteOrbitScene"
              @change="handleToggleSate('showThreatSatelliteOrbitScene')"
              label="主星轨迹"
            ></el-checkbox>
          </div>

          <!-- <div class="button-group-item">
            <el-checkbox size="small" :model-value="showChangePoints" @change="handleToggleSate('showChangePoints')" label="变轨点"></el-checkbox>
          </div> -->

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatellitePointScene"
              @change="handleToggleSate('showSatellitePointScene')"
              label="显示卫星点位"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteNameScene"
              @change="handleToggleSate('showSatelliteNameScene')"
              label="显示卫星名称"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteModelScene"
              @change="handleToggleSate('showSatelliteModelScene')"
              label="显示卫星模型"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteSensorScene"
              @change="handleToggleSate('showSatelliteSensorScene')"
              label="可视锥角"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteLightDirectionScene"
              @change="handleToggleSate('showSatelliteLightDirectionScene')"
              label="光照方向"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteImageDirectionScene"
              @change="handleToggleSate('showSatelliteImageDirectionScene')"
              label="成像方向"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteBodyCoordinateScene"
              @change="handleToggleSate('showSatelliteBodyCoordinateScene')"
              label="本体坐标系"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteOrbitCoordinateScene"
              @change="handleToggleSate('showSatelliteOrbitCoordinateScene')"
              label="轨道坐标系"
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
import { satelliteLayer, satelliteSceneLayer } from "../utils/initMars3dLayers.js";
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
  setSatelliteFaceEarth,
  addSatelliteScene,
  addSatelliteSceneByTle,
  toggleSatelliteSensor,
  toggleSatelliteBodyCoordinate,
  toggleSatelliteLightDirection,
} from "../utils/mars3dSatellite.js";
import { lockCameraToInertial, unlockCameraFromInertial } from "../utils/mars3dOrbitDynamics.js";
import {
  rebuildRelativeTrajectoriesByFrame,
  toggleRelativeTrajectories,
  destroyRelativeTrajectoryLayer,
  julianDateToTimeMs,
} from "../utils/mars3dRelativeTrajectory.js";
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

      startDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      endDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      stepSec: 3600,

      trackedNorad: "", // 当前跟随的卫星 NORAD ID
    };
  },

  computed: {
    ...mapState(useGeoMapStore, [
      "sceneControlPlugin",
      "currentSceneConfig",
      "coordinate",
      "satRelativeData",
      "threatTargetID",
      "importTargetID",
      "threatTargetName",
      "importTargetName",
      "showSatellitePointScene",
      "showImportSatelliteOrbitScene",
      "showThreatSatelliteOrbitScene",
      "showChangePoints",
      "showSatelliteNameScene",
      "showSatelliteModelScene",
      "showGeoCirclePositions",
      "showGeoCircleLabel",
      "showPatrolArea",
      "showSatelliteSensorScene",
      "showSatelliteBodyCoordinateScene",
      "showSatelliteLightDirectionScene",
      "showSatelliteImageDirectionScene",
      "showSatelliteOrbitCoordinateScene",
    ]),
  },
  mounted() {},
  beforeUnmount() {
    destroyRelativeTrajectoryLayer(globalViewer);
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
    showSatellitePointScene(newVal) {
      toggleSatellitePoint(satelliteSceneLayer, newVal);
    },
    showImportSatelliteOrbitScene(newVal) {
      toggleSatelliteOribit(satelliteSceneLayer, newVal);
    },
    showThreatSatelliteOrbitScene(newVal) {
      toggleSatelliteOribit(satelliteSceneLayer, newVal);
    },

    showSatelliteLightDirectionScene(newVal) {
      toggleSatelliteLightDirection(satelliteSceneLayer, newVal);
    },

    // 显示变轨点
    showChangePoints(newVal) {
      toggleRelativeTrajectories(newVal);
    },
    showSatelliteNameScene(newVal) {
      toggleSatelliteName(satelliteSceneLayer, newVal);
    },
    showSatelliteModelScene(newVal) {
      toggleSatelliteModel(satelliteSceneLayer, newVal);
    },
    showSatelliteSensorScene(newVal) {
      toggleSatelliteSensor(satelliteSceneLayer, newVal);
    },
    showSatelliteBodyCoordinateScene(newVal) {
      toggleSatelliteBodyCoordinate(satelliteSceneLayer, newVal);
    },
  },
  methods: {
    handleCoordinateChange(value) {
      geoMapStore.SET_STATE_DATA({ key: "coordinate", value: value });

      globalViewer.trackedEntity = undefined;
      this.applyCameraLock();
      this.handleApplyView("default");
      this.viewMode = "default";
    },

    handleApplyView(presetId) {
      if (!globalViewer) return;

      if (this.coordinate === "ECI") {
        this.applyEciView(presetId); // 应用 ECI 视角
        geoMapStore.SET_COMPONENT_VISIBLE_TRUE("showSatelliteOrbit");
        geoMapStore.SET_COMPONENT_VISIBLE_FALSE("showChangePoints");
      } else {
        this.applyEcefView(presetId); // 应用 ECEF 视角
        geoMapStore.SET_COMPONENT_VISIBLE_FALSE("showSatelliteOrbit");
        geoMapStore.SET_COMPONENT_VISIBLE_TRUE("showChangePoints");
      }
    },

    /**
     * 根据当前坐标系决定是否锁定惯性相机
     * @returns {void}
     */
    applyCameraLock() {
      if (!globalViewer) return;

      if (this.coordinate === "ECI") {
        lockCameraToInertial(globalViewer);
        addSatelliteSceneByTle(satelliteSceneLayer, this.currentSceneConfig);
      } else {
        unlockCameraFromInertial(globalViewer);
        addSatelliteScene(satelliteSceneLayer, this.satRelativeData);
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
          // this.flyToGlobal(0, 90, GLOBAL_VIEW_ALT, -90); // 恒星视角
          this.flyToStarPole();
          break;
        case "equator":
          this.flyToGlobal(0, 0, GLOBAL_VIEW_ALT, -90); // 赤道视角
          break;
        default:
          break;
      }
    },

    flyToStarPole() {
      if (!globalViewer) return;

      const importGraphicLine = satelliteSceneLayer.getGraphicById("importSatellite");
      if (!importGraphicLine) return;
      // importGraphicLine.path.show = true;
      importGraphicLine.flyToPoint({
        complete: () => {
          globalViewer.trackedEntity = importGraphicLine.trackedEntity;
        },
      });

      // importGraphicLine.flyTo();
      // const positionShow = importGraphicLine.positionShow;

      // const positionShowLLA = mars3d.Cesium.Cartographic.fromCartesian(positionShow);
      // globalViewer.flyToPoint();

      // console.log(positionShowLLA, "positionShowLLA");

      // setTimeout(() => {
      //   globalViewer.flyToGraphic(importGraphicLine, {
      //     radius: 100000,
      //     heading: 60,
      //     pitch: -89,
      //     roll: 90,
      //     duration: 1.5,
      //   });
      // }, 1000);
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

    handleToggleSate(state) {
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
