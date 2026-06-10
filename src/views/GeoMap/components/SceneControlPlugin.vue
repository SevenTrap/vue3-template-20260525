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
import { satelliteSceneLayer } from "../utils/initMars3dLayers.js";
import {
  addGeoCirclePositions,
  removeGeoCirclePositions,
  addGeoCircleLabel,
  removeGeoCircleLabel,
  addPatrolArea,
  removePatrolArea,
} from "@/utils/mars3d/mars3dGeoStyle.js";
import {
  toggleImportSatelliteOrbit,
  toggleThreatSatelliteOrbit,
  toggleSatelliteName,
  toggleSatelliteModel,
  toggleSatellitePoint,
  addSatelliteScene,
  addSatelliteSceneByTle,
  toggleSatelliteSensor,
  toggleSatelliteBodyCoordinate,
  toggleSatelliteLightDirection,
  toggleSatelliteImageDirection,
} from "../utils/mars3dSatellite.js";
import {
  lockCameraToInertial,
  unlockCameraFromInertial,
  lockCameraToInertialSouthPoleSide,
  lockCameraToInertialSatellite,
  lockCameraToInertialSatelliteThreat,
} from "../utils/mars3dOrbitDynamics.js";
import { toggleRelativeTrajectories, destroyRelativeTrajectoryLayer } from "../utils/mars3dRelativeTrajectory.js";
import { ECEF_PRESETS, ECI_PRESETS } from "../configs/index.js";
import {
  setSouthPoleFrontECEF,
  setSouthPoleSideECEF,
  setStarPoleECEF,
  setDefaultPoleECEF,
  setDefaultPoleECI,
  setSouthPoleFrontECI,
  setSouthPoleSideECI,
} from "../utils/satelliteViewConfig.js";

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
  mounted() {
    setTimeout(() => {
      this.applyEcefView("default");
    }, 1000);
  },
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
      toggleImportSatelliteOrbit(satelliteSceneLayer, newVal);
    },
    showThreatSatelliteOrbitScene(newVal) {
      toggleThreatSatelliteOrbit(satelliteSceneLayer, newVal);
    },

    // 显示光照方向
    showSatelliteLightDirectionScene(newVal) {
      toggleSatelliteLightDirection(satelliteSceneLayer, newVal);
    },

    // 显示成像方向
    showSatelliteImageDirectionScene(newVal) {
      toggleSatelliteImageDirection(satelliteSceneLayer, newVal);
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
      unlockCameraFromInertial(globalViewer);
      if (value === "ECI") {
        // lockCameraToInertial(globalViewer);
        addSatelliteSceneByTle(satelliteSceneLayer, this.currentSceneConfig);
      } else {
        // unlockCameraFromInertial(globalViewer);
        addSatelliteScene(satelliteSceneLayer, this.satRelativeData);
      }
      this.handleApplyView("default");

      // 重置图层控制显示状态
      if (this.showSatelliteLightDirectionScene) {
        toggleSatelliteLightDirection(satelliteSceneLayer, true);
      }
      if (this.showSatelliteImageDirectionScene) {
        toggleSatelliteImageDirection(satelliteSceneLayer, true);
      }
    },

    handleApplyView(presetId) {
      this.viewMode = presetId;

      if (this.coordinate === "ECI") {
        this.applyEciView(presetId); // 应用 ECI 视角
      } else {
        this.applyEcefView(presetId); // 应用 ECEF 视角
      }
    },

    // 应用 ECEF 视角预设
    applyEcefView(presetId) {
      globalViewer.trackedEntity = null;
      globalViewer.clock.shouldAnimate = false;

      switch (presetId) {
        case "default":
          setDefaultPoleECEF(satelliteSceneLayer, "importSatellite");
          break;

        // 南极正视
        case "southPoleFront":
          setSouthPoleFrontECEF(satelliteSceneLayer);
          break;

        // 南极侧视
        case "southPoleSide":
          setSouthPoleSideECEF(satelliteSceneLayer, "importSatellite");
          break;

        // 恒星视角
        case "starPole":
          setStarPoleECEF(satelliteSceneLayer, "importSatellite");
          break;

        default:
          console.log("未找到对应的视角");
          break;
      }

      globalViewer.clock.shouldAnimate = true;
    },

    // 应用 ECI 视角预设
    applyEciView(presetId) {
      globalViewer.trackedEntity = null;
      globalViewer.clock.shouldAnimate = false;
      unlockCameraFromInertial(globalViewer);

      switch (presetId) {
        case "default":
          lockCameraToInertial(globalViewer);
          setDefaultPoleECI(satelliteSceneLayer, "importSatellite");
          break;

        case "southPoleFront":
          lockCameraToInertial(globalViewer);
          setSouthPoleFrontECI(satelliteSceneLayer);
          break;

        case "southPoleSide":
          lockCameraToInertialSouthPoleSide(globalViewer);
          break;

        case "importSatellite":
          lockCameraToInertialSatellite(globalViewer);
          break;

        case "firstSatPole":
          lockCameraToInertialSatelliteThreat(globalViewer);
          break;

        default:
          break;
      }

      globalViewer.clock.shouldAnimate = true;
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
