<template>
  <aircas-panel v-show="sceneControlPlugin" title="场景控制" width="320" height="550" bottom="100" right="20" @close="handlePanelClose">
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
            <el-checkbox size="small" :model-value="showGeoCirclePositions" @change="handleToggleSate('showGeoCirclePositions')" label="同步轨道"></el-checkbox>
          </div>
          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showGeoCircleLabel" @change="handleToggleSate('showGeoCircleLabel')" label="经度标签"></el-checkbox>
          </div>
          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showPatrolArea" @change="handleToggleSate('showPatrolArea')" label="巡视区域"></el-checkbox>
          </div>
        </div>
      </div>

      <div class="form-item" style="border-bottom: none">
        <div class="form-title">图层控制</div>

        <div class="button-group">
          <div class="button-group-item" v-if="coordinate === 'ECI'">
            <el-checkbox
              size="small"
              :model-value="showImportSatelliteOrbitScene"
              @change="handleToggleSate('showImportSatelliteOrbitScene')"
              label="从星轨道"
            ></el-checkbox>
          </div>

          <div class="button-group-item" v-if="coordinate === 'ECI'">
            <el-checkbox
              size="small"
              :model-value="showThreatSatelliteOrbitScene"
              @change="handleToggleSate('showThreatSatelliteOrbitScene')"
              label="主星轨道"
            ></el-checkbox>
          </div>

          <div class="button-group-item" v-if="coordinate === 'ECEF'">
            <el-checkbox
              size="small"
              :model-value="showImportSatelliteTrajectoryScene"
              @change="handleToggleSate('showImportSatelliteTrajectoryScene')"
              label="从星轨迹"
            ></el-checkbox>
          </div>

          <div class="button-group-item" v-if="coordinate === 'ECEF'">
            <el-checkbox
              size="small"
              :model-value="showThreatSatelliteTrajectoryScene"
              @change="handleToggleSate('showThreatSatelliteTrajectoryScene')"
              label="主星轨迹"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showRelativeTrajectoryScene"
              @change="handleToggleSate('showRelativeTrajectoryScene')"
              label="相对轨迹"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatellitePointScene"
              @change="handleToggleSate('showSatellitePointScene')"
              label="卫星点位"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox size="small" :model-value="showSatelliteNameScene" @change="handleToggleSate('showSatelliteNameScene')" label="卫星名称"></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteModelScene"
              @change="handleToggleSate('showSatelliteModelScene')"
              label="卫星模型"
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
              :model-value="showSatelliteBodyCoordinateAxisScene"
              @change="handleToggleSate('showSatelliteBodyCoordinateAxisScene')"
              label="本体坐标系"
            ></el-checkbox>
          </div>

          <div class="button-group-item">
            <el-checkbox
              size="small"
              :model-value="showSatelliteOrbitCoordinateAxisScene"
              @change="handleToggleSate('showSatelliteOrbitCoordinateAxisScene')"
              label="轨道坐标系"
            ></el-checkbox>
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
import { satelliteSceneLayer } from "../utils/initMars3dLayers.js";

import {
  removeSatelliteSceneLayer,
  toggleImportSatelliteOrbit,
  toggleThreatSatelliteOrbit,
  toggleRelativeTrajectories,
  toggleSatelliteName,
  toggleSatelliteModel,
  toggleSatellitePoint,
  addSatelliteOrbitSceneECEF,
  addSatelliteOrbitSceneECI,
  toggleSatelliteSensor,
  toggleSatelliteCoordinateAxis,
  toggleSatelliteOrbitCoordinateAxis,
  toggleSatelliteLightDirection,
  toggleSatelliteImageDirection,
  toggleImportSatelliteTrajectory,
  toggleThreatSatelliteTrajectory,
} from "../utils/mars3dSatellite.js";
import {
  unlockCameraFromInertial,
  lockCameraToInertial,
  lockCameraToInertialSouthPoleSide,
  lockCameraToInertialSatellite,
  lockCameraToInertialSatelliteThreat,
} from "../utils/satelliteViewConfig.js";

import { ECEF_PRESETS, ECI_PRESETS } from "../configs/index.js";
import {
  setSouthPoleFrontECEF,
  setSouthPoleSideECEF,
  setStarPoleECEF,
  setDefaultPoleECEF,
  setDefaultPoleECI,
  setSouthPoleFrontECI,
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
      "clockStartTime",
      "clockEndTime",
      "satelliteTracks",
      "currentSceneConfig",

      "coordinate",
      "satRelativeData",
      "threatSatelliteNoradID",
      "importSatelliteNoradID",
      "threatTargetName",
      "importTargetName",
      "showSatellitePointScene",
      "showImportSatelliteOrbitScene",
      "showThreatSatelliteOrbitScene",
      "showImportSatelliteTrajectoryScene",
      "showThreatSatelliteTrajectoryScene",
      "showRelativeTrajectoryScene",
      "showSatelliteNameScene",
      "showSatelliteModelScene",
      "showGeoCirclePositions",
      "showGeoCircleLabel",
      "showPatrolArea",
      "showSatelliteSensorScene",
      "showSatelliteBodyCoordinateAxisScene",
      "showSatelliteLightDirectionScene",
      "showSatelliteImageDirectionScene",
      "showSatelliteOrbitCoordinateAxisScene",
    ]),
  },
  mounted() {
    setTimeout(() => {
      this.applyEcefView("default");
    }, 100);
  },
  beforeUnmount() {},
  watch: {
    // 显示卫星点位
    showSatellitePointScene(newVal) {
      toggleSatellitePoint(satelliteSceneLayer, newVal);
    },
    // 显示从星轨道
    showImportSatelliteOrbitScene(newVal) {
      toggleImportSatelliteOrbit(satelliteSceneLayer, newVal);
    },
    // 显示主星轨道
    showThreatSatelliteOrbitScene(newVal) {
      toggleThreatSatelliteOrbit(satelliteSceneLayer, newVal);
    },
    // 显示从星轨迹
    showImportSatelliteTrajectoryScene(newVal) {
      toggleImportSatelliteTrajectory(satelliteSceneLayer, newVal);
    },
    // 显示主星轨迹
    showThreatSatelliteTrajectoryScene(newVal) {
      toggleThreatSatelliteTrajectory(satelliteSceneLayer, newVal);
    },

    // 显示相对轨迹
    showRelativeTrajectoryScene(newVal) {
      toggleRelativeTrajectories(satelliteSceneLayer, newVal);
    },

    // 显示光照方向
    showSatelliteLightDirectionScene(newVal) {
      toggleSatelliteLightDirection(satelliteSceneLayer, newVal);
    },

    // 显示成像方向
    showSatelliteImageDirectionScene(newVal) {
      toggleSatelliteImageDirection(satelliteSceneLayer, newVal);
    },

    // 显示卫星名称
    showSatelliteNameScene(newVal) {
      toggleSatelliteName(satelliteSceneLayer, newVal);
    },

    // 显示卫星模型
    showSatelliteModelScene(newVal) {
      toggleSatelliteModel(satelliteSceneLayer, newVal);
    },

    // 显示可视锥角
    showSatelliteSensorScene(newVal) {
      toggleSatelliteSensor(satelliteSceneLayer, newVal);
    },

    // 显示卫星本体坐标轴
    showSatelliteBodyCoordinateAxisScene(newVal) {
      toggleSatelliteCoordinateAxis(satelliteSceneLayer, newVal);
    },

    // 显示卫星轨道坐标轴
    showSatelliteOrbitCoordinateAxisScene(newVal) {
      toggleSatelliteOrbitCoordinateAxis(satelliteSceneLayer, newVal);
    },
  },
  methods: {
    handleCoordinateChange(value) {
      geoMapStore.SET_STATE_DATA({ key: "coordinate", value: value });

      unlockCameraFromInertial(globalViewer);
      removeSatelliteSceneLayer(satelliteSceneLayer);

      if (value === "ECI") {
        addSatelliteOrbitSceneECI(satelliteSceneLayer, this.satelliteTracks, this.clockStartTime, this.clockEndTime);

        // toggleSatelliteModel(satelliteSceneLayer, false);

        // geoMapStore.SET_STATE_DATA({ key: "showImportSatelliteOrbitScene", value: true });
        // geoMapStore.SET_STATE_DATA({ key: "showThreatSatelliteOrbitScene", value: true });
        // geoMapStore.SET_STATE_DATA({ key: "showImportSatelliteTrajectoryScene", value: false });
        // geoMapStore.SET_STATE_DATA({ key: "showThreatSatelliteTrajectoryScene", value: false });
      } else {
        addSatelliteOrbitSceneECEF(satelliteSceneLayer, this.satelliteTracks, this.clockStartTime, this.clockEndTime);
        // geoMapStore.SET_STATE_DATA({ key: "showImportSatelliteOrbitScene", value: false });
        // geoMapStore.SET_STATE_DATA({ key: "showThreatSatelliteOrbitScene", value: false });
        // geoMapStore.SET_STATE_DATA({ key: "showImportSatelliteTrajectoryScene", value: true });
        // geoMapStore.SET_STATE_DATA({ key: "showThreatSatelliteTrajectoryScene", value: true });
      }
      this.handleApplyView("default");

      toggleSatelliteCoordinateAxis(satelliteSceneLayer, this.showSatelliteBodyCoordinateAxisScene);
      toggleSatelliteOrbitCoordinateAxis(satelliteSceneLayer, this.showSatelliteOrbitCoordinateAxisScene);

      if (this.showRelativeTrajectoryScene) {
        toggleRelativeTrajectories(satelliteSceneLayer, true);
      }
    },

    handleApplyView(presetId) {
      this.viewMode = presetId;
      const { importSatelliteNoradID } = this.currentSceneConfig;

      if (this.coordinate === "ECI") {
        this.applyEciView(presetId, importSatelliteNoradID); // 应用 ECI 视角
      } else {
        this.applyEcefView(presetId, importSatelliteNoradID); // 应用 ECEF 视角
      }
    },

    // 应用 ECEF 视角预设
    applyEcefView(presetId, importSatelliteNoradID) {
      globalViewer.trackedEntity = null;
      globalViewer.clock.shouldAnimate = false;

      switch (presetId) {
        case "default":
          setDefaultPoleECEF(satelliteSceneLayer, importSatelliteNoradID);
          break;

        // 南极正视
        case "southPoleFront":
          setSouthPoleFrontECEF(satelliteSceneLayer);
          break;

        // 南极侧视
        case "southPoleSide":
          setSouthPoleSideECEF(satelliteSceneLayer, importSatelliteNoradID);
          break;

        // 恒星视角
        case "starPole":
          setStarPoleECEF(satelliteSceneLayer, importSatelliteNoradID);
          break;

        default:
          console.log("未找到对应的视角");
          break;
      }

      globalViewer.clock.shouldAnimate = true;
    },

    // 应用 ECI 视角预设
    applyEciView(presetId, importSatelliteNoradID) {
      globalViewer.trackedEntity = null;
      globalViewer.clock.shouldAnimate = false;
      unlockCameraFromInertial(globalViewer);

      switch (presetId) {
        case "default":
          lockCameraToInertial(globalViewer);
          setDefaultPoleECI(satelliteSceneLayer, importSatelliteNoradID);
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
      gap: 5px 20px;

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
      width: calc(30% - 10px);
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
  }
}
</style>
