<template>
  <aircas-panel v-show="sceneControlPlugin" title="场景控制" width="320" height="380" bottom="100" right="20" @close="handlePanelClose">
    <div class="scene-control-panel">
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
  toggleSatelliteCoordinate,
} from "../utils/mars3dSatellite.js";

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
