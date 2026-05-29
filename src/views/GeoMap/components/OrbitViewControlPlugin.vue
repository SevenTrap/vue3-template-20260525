<template>
  <aircas-panel v-show="orbitViewControlPlugin" title="视角控制" width="320" height="640" bottom="100" right="20" @close="handlePanelClose">
    <div class="orbit-view-control-panel">
      <div class="form-item">
        <div class="form-label">坐标系</div>

        <el-radio-group v-model="coordinateProxy" size="small">
          <el-radio value="ECEF">地固系(ECEF)</el-radio>
          <el-radio value="ECI">惯性系(ECI)</el-radio>
        </el-radio-group>
      </div>

      <!-- ECEF 坐标系下的视角预设 -->
      <div v-if="coordinate === 'ECEF'" class="form-item">
        <div class="form-label">ECEF 视角</div>

        <el-radio-group v-model="viewMode" size="small">
          <el-radio v-for="preset in ecefPresets" :key="preset.id" :value="preset.id">{{ preset.label }}</el-radio>
        </el-radio-group>
      </div>

      <!-- ECI 坐标系下的视角预设 -->
      <div v-if="coordinate === 'ECI'" class="form-item">
        <div class="form-label">ECI 视角</div>

        <el-radio-group v-model="viewMode" size="small">
          <el-radio v-for="preset in eciPresets" :key="preset.id" :value="preset.id">{{ preset.label }}</el-radio>
        </el-radio-group>
      </div>

      <div class="form-tip">
        已勾选 {{ checkedNorads.length }} 颗卫星，已绘制 {{ drawnNorads.length }} 颗。<br />
        ECEF 模式：地球不动，GEO 卫星地面轨迹呈 8 字。<br />
        ECI 模式：地球自转，轨道呈静态标准圆。<br />
        第一人称 / 第三人称视角需先勾选聚焦卫星。
      </div>
    </div>
  </aircas-panel>
</template>

<script>
import dayjs from "dayjs";
import * as mars3d from "mars3d";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { globalViewer } from "@/utils/initEarth.js";
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

const geoMapStore = useGeoMapStore();

import { ECEF_PRESETS, ECI_PRESETS } from "../configs/index.js";
import { GLOBAL_VIEW_ALT, POLE_VIEW_ALT, EQUATOR_VIEW_ALT, ORBITAL_PLANE_ALT } from "../configs/index.js";

export default {
  name: "OrbitViewControlPlugin",
  data() {
    return {
      ecefPresets: ECEF_PRESETS,
      eciPresets: ECI_PRESETS,

      startDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      stepSec: 3600,
      selectedNorad: "",
      drawnNorads: [],
    };
  },
  computed: {
    ...mapState(useGeoMapStore, ["orbitViewControlPlugin", "coordinate", "viewMode", "checkedNorads", "satelliteModels", "focusedNorad"]),
    coordinateProxy: {
      get() {
        return this.coordinate;
      },
      set(value) {
        this.handleCoordinateChange(value);
      },
    },
  },
  watch: {
    checkedNorads: {
      handler(newVal) {
        const oldVal = this.drawnNorads;
        if (this.orbitViewControlPlugin) {
          this.syncSatellites(newVal || [], oldVal || []);
        }

        if (this.selectedNorad && !newVal.includes(this.selectedNorad)) {
          this.selectedNorad = newVal[0] || "";
          geoMapStore.SET_FOCUSED_NORAD(this.selectedNorad);
        } else if (!this.selectedNorad && newVal.length > 0) {
          this.selectedNorad = newVal[0];
          geoMapStore.SET_FOCUSED_NORAD(this.selectedNorad);
        }
      },
      deep: true,
    },
    orbitViewControlPlugin(visible) {
      if (visible) {
        this.rebuildAll();
      } else {
        // this.cleanup();
      }
    },
  },
  mounted() {
    this.startDate = dayjs().format("YYYY-MM-DD HH:mm:ss");
    ensureOrbitLayer(globalViewer);

    if (this.checkedNorads.length > 0) {
      this.selectedNorad = this.focusedNorad || this.checkedNorads[0];
      geoMapStore.SET_FOCUSED_NORAD(this.selectedNorad);
    }
  },
  beforeUnmount() {
    // this.cleanup();
  },
  methods: {
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("orbitViewControlPlugin");
      // this.cleanup();
    },

    handleCoordinateChange(value) {
      geoMapStore.SET_COORDINATE(value);
      this.applyCameraLock();
      this.rebuildAll();
    },

    /**
     * 轨道配置变化（起始时刻/步长）
     * @returns {void}
     */
    handleOrbitConfigChange() {
      this.rebuildAll();
    },

    /**
     * 卫星下拉选择回调
     * @param {string} noradID - 卫星 NORAD ID
     * @returns {void}
     */
    handleSelectSatellite(noradID) {
      geoMapStore.SET_FOCUSED_NORAD(noradID);
    },

    /**
     * 通过 NORAD ID 取卫星名称（找不到则返回 NORAD 本身）
     * @param {string} noradID - 卫星 NORAD ID
     * @returns {string}
     */
    resolveSatelliteLabel(noradID) {
      const model = this.satelliteModels.get(noradID);
      return model ? `${model.name} (${noradID})` : String(noradID);
    },

    /**
     * 视角按钮统一入口：按 coordinate 分派到 ECEF / ECI 子方法
     * @param {string} presetId - 视角预设 id
     * @returns {void}
     */
    handleApplyView(presetId) {
      if (!globalViewer) return;
      geoMapStore.SET_VIEW_MODE(presetId);

      this.releaseTracking();

      if (this.coordinate === "ECI") {
        this.applyEciView(presetId);
      } else {
        this.applyEcefView(presetId);
      }
    },

    /**
     * 释放跟踪卫星与重置相机变换
     * @returns {void}
     */
    releaseTracking() {
      if (!globalViewer) return;
      globalViewer.trackedEntity = undefined;
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
    },

    /**
     * 解析当前起始时间
     * @returns {Date}
     */
    resolveStartDate() {
      if (!this.startDate) return new Date();
      return dayjs(this.startDate).toDate();
    },

    /**
     * 解析轨道绘制坐标系
     * @returns {"INERTIAL"|"FIXED"}
     */
    resolveFrame() {
      return this.coordinate === "ECI" ? "INERTIAL" : "FIXED";
    },

    /**
     * 全量重建当前勾选卫星轨道
     * @returns {void}
     */
    rebuildAll() {
      if (!this.orbitViewControlPlugin) return;
      ensureOrbitLayer(globalViewer);
      clearOrbitGraphics();
      this.drawnNorads = [];

      const frame = this.resolveFrame();
      const startDate = this.resolveStartDate();
      const step = Math.max(1, Number(this.stepSec) || 3600) * 1000;

      (this.checkedNorads || []).forEach((norad) => {
        const satelliteClass = this.satelliteModels.get(norad);
        if (!satelliteClass) return;
        addSatelliteOrbit(satelliteClass, { frame, startDate, step });
        this.drawnNorads.push(norad);
      });

      this.applyCameraLock();
    },

    /**
     * 根据勾选变化增量同步轨道
     * @param {Array<string>} newVal - 新勾选
     * @param {Array<string>} oldVal - 旧勾选
     * @returns {void}
     */
    syncSatellites(newVal, oldVal) {
      const added = newVal.filter((n) => !oldVal.includes(n));
      const removed = oldVal.filter((n) => !newVal.includes(n));

      removed.forEach((norad) => {
        removeSatelliteOrbit(norad);
        this.drawnNorads = this.drawnNorads.filter((n) => n !== norad);
      });

      const frame = this.resolveFrame();
      const startDate = this.resolveStartDate();
      const step = Math.max(1, Number(this.stepSec) || 3600) * 1000;

      added.forEach((norad) => {
        const satelliteClass = this.satelliteModels.get(norad);
        if (!satelliteClass) return;
        addSatelliteOrbit(satelliteClass, { frame, startDate, step });
        this.drawnNorads.push(norad);
      });
    },

    resolveFocusedGraphic() {
      if (!this.selectedNorad) return null;
      return getSatelliteGraphic(this.selectedNorad);
    },

    /**
     * 取当前选中卫星的 SatelliteClass 实例
     * @returns {object|null}
     */
    resolveFocusedClass() {
      if (!this.selectedNorad) return null;
      return this.satelliteModels.get(this.selectedNorad);
    },

    /**
     * ECEF 视角预设分派
     * @param {string} presetId - 预设 id
     * @returns {void}
     */
    applyEcefView(presetId) {
      switch (presetId) {
        case "default":
          this.flyToGlobal(0, 0, GLOBAL_VIEW_ALT, -90);
          break;
        case "firstPerson":
          this.flyToFirstPerson();
          break;
        case "thirdPerson":
          this.flyToThirdPerson();
          break;
        case "southPole":
          this.flyToGlobal(0, -90, POLE_VIEW_ALT, -90);
          break;
        case "northPole":
          this.flyToGlobal(0, 90, POLE_VIEW_ALT, -90);
          break;
        case "equator":
          this.flyToGlobal(0, 0, EQUATOR_VIEW_ALT, 0);
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
          this.flyToGlobal(0, 0, GLOBAL_VIEW_ALT, -90);
          break;
        case "firstPerson":
          this.flyToFirstPerson();
          break;
        case "thirdPerson":
          this.flyToThirdPerson();
          break;
        case "polarAxis":
          this.flyToGlobal(0, 90, POLE_VIEW_ALT, -90);
          break;
        case "orbitalPlane":
          this.flyToOrbitalPlane();
          break;
        case "equatorialPlane":
          this.flyToGlobal(0, 0, EQUATOR_VIEW_ALT, 0);
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
     * 第一人称：相机绑定到卫星模型上、近距离视角
     * @returns {void}
     */
    flyToFirstPerson() {
      const graphic = this.resolveFocusedGraphic();
      if (!graphic) {
        console.warn("[OrbitViewControlPlugin] 未找到聚焦卫星 graphic，请先在当前插件中绘制轨道");
        return;
      }
      globalViewer.trackedEntity = graphic.entity || graphic._entity;
      globalViewer.flyToGraphic(graphic, {
        radius: 200,
        heading: 0,
        pitch: 0,
        duration: 1.5,
      });
    },

    /**
     * 第三人称：相机在卫星后方/上方，距离更远
     * @returns {void}
     */
    flyToThirdPerson() {
      const graphic = this.resolveFocusedGraphic();
      if (!graphic) {
        console.warn("[OrbitViewControlPlugin] 未找到聚焦卫星 graphic，请先在当前插件中绘制轨道");
        return;
      }
      globalViewer.trackedEntity = graphic.entity || graphic._entity;
      globalViewer.flyToGraphic(graphic, {
        radius: 5_000_000,
        heading: 0,
        pitch: -30,
        duration: 1.5,
      });
    },

    /**
     * 飞到与卫星轨道倾角对应的"轨道平面"侧视
     * 用 RAAN 决定方位，用倾角决定俯仰
     * @returns {void}
     */
    flyToOrbitalPlane() {
      const satelliteClass = this.resolveFocusedClass();
      if (!satelliteClass) {
        this.flyToGlobal(0, 0, ORBITAL_PLANE_ALT, -45);
        return;
      }

      const raanDeg = mars3d.Cesium.Math.toDegrees(satelliteClass.raan || 0);
      const inclinationDeg = mars3d.Cesium.Math.toDegrees(satelliteClass.inclination || 0);

      const lon = ((raanDeg + 90) % 360) - 180;
      const lat = Math.max(-80, Math.min(80, 90 - inclinationDeg));

      this.flyToGlobal(lon, lat, ORBITAL_PLANE_ALT, -30);
    },

    /**
     * 清理轨道图层、相机锁定与跟踪状态
     * @returns {void}
     */
    cleanup() {
      this.releaseTracking();
      unlockCameraFromInertial(globalViewer);
      destroyOrbitLayer(globalViewer);
      this.drawnNorads = [];
    },
  },
};
</script>

<style lang="scss" scoped>
.orbit-view-control-panel {
  padding: 8px 4px;

  .form-item {
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--aircas-color-border);

    .form-label {
      font-size: 12px;
      color: #ddd;
      margin-bottom: 4px;
      font-size: 13px;
      color: #fff;
      border-left: 3px solid #018a87;
      padding-left: 6px;
    }

    .form-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    :deep(.el-button) {
      margin-left: 0;
    }
  }

  .form-tip {
    margin-top: 12px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.3);
    color: #aaa;
    font-size: 12px;
    line-height: 1.7;
    border-radius: 4px;
  }
}
</style>
