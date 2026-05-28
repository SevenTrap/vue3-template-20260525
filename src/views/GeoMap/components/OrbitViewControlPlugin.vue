<template>
  <aircas-panel v-show="orbitViewControlPlugin" title="视角控制" width="280" height="460" bottom="100" right="20" @close="handlePanelClose">
    <div class="orbit-view-control-panel">
      <div class="form-item">
        <div class="form-label">当前坐标系</div>
        <el-tag :type="coordinate === 'ECI' ? 'warning' : 'success'" size="default">
          {{ coordinate === "ECI" ? "ECI 惯性系" : "ECEF 地固系" }}
        </el-tag>
      </div>

      <div class="form-item">
        <div class="form-label">聚焦卫星</div>
        <el-select v-model="selectedNorad" placeholder="请选择卫星" size="small" style="width: 100%" @change="handleSelectSatellite">
          <el-option v-for="norad in checkedNorads" :key="norad" :label="resolveSatelliteLabel(norad)" :value="norad" />
        </el-select>
      </div>

      <!-- ECEF 坐标系下的视角预设 -->
      <div v-if="coordinate === 'ECEF'" class="view-group">
        <div class="view-group-title">ECEF 视角</div>
        <div class="view-grid">
          <el-button
            v-for="preset in ecefPresets"
            :key="preset.id"
            :type="viewMode === preset.id ? 'primary' : 'default'"
            size="small"
            @click="handleApplyView(preset.id)"
          >
            {{ preset.label }}
          </el-button>
        </div>
      </div>

      <!-- ECI 坐标系下的视角预设 -->
      <div v-if="coordinate === 'ECI'" class="view-group">
        <div class="view-group-title">ECI 视角</div>
        <div class="view-grid">
          <el-button
            v-for="preset in eciPresets"
            :key="preset.id"
            :type="viewMode === preset.id ? 'primary' : 'default'"
            size="small"
            @click="handleApplyView(preset.id)"
          >
            {{ preset.label }}
          </el-button>
        </div>
      </div>

      <div class="form-tip">提示：第一人称 / 第三人称视角需要先勾选卫星且打开轨道动力学插件。</div>
    </div>
  </aircas-panel>
</template>

<script>
import * as mars3d from "mars3d";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { globalViewer } from "@/utils/initEarth.js";
import { getSatelliteGraphic } from "../utils/mars3dOrbitDynamics.js";

const geoMapStore = useGeoMapStore();

const ECEF_PRESETS = [
  { id: "default", label: "默认全球" },
  { id: "firstPerson", label: "卫星第一人称" },
  { id: "thirdPerson", label: "卫星第三人称" },
  { id: "southPole", label: "南极俯视" },
  { id: "northPole", label: "北极俯视" },
  { id: "equator", label: "赤道侧视" },
];

const ECI_PRESETS = [
  { id: "default", label: "惯性系全球" },
  { id: "firstPerson", label: "卫星第一人称" },
  { id: "thirdPerson", label: "卫星第三人称" },
  { id: "polarAxis", label: "极轴俯视" },
  { id: "orbitalPlane", label: "轨道平面" },
  { id: "equatorialPlane", label: "赤道平面" },
];

const GLOBAL_VIEW_ALT = 30_000_000;
const POLE_VIEW_ALT = 25_000_000;
const EQUATOR_VIEW_ALT = 80_000_000;
const ORBITAL_PLANE_ALT = 60_000_000;

export default {
  name: "OrbitViewControlPlugin",
  data() {
    return {
      ecefPresets: ECEF_PRESETS,
      eciPresets: ECI_PRESETS,
      selectedNorad: "",
    };
  },
  computed: {
    ...mapState(useGeoMapStore, ["orbitViewControlPlugin", "coordinate", "viewMode", "checkedNorads", "satelliteModels", "focusedNorad"]),
  },
  watch: {
    checkedNorads: {
      handler(newVal) {
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
  },
  mounted() {
    if (this.checkedNorads.length > 0) {
      this.selectedNorad = this.focusedNorad || this.checkedNorads[0];
      geoMapStore.SET_FOCUSED_NORAD(this.selectedNorad);
    }
  },
  beforeUnmount() {
    this.releaseTracking();
  },
  methods: {
    /**
     * 关闭面板回调
     * @returns {void}
     */
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("orbitViewControlPlugin");
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
     * 取当前选中卫星 graphic（来自 OrbitDynamicsPlugin 绘制的图层）
     * @returns {object|null}
     */
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
        console.warn("[OrbitViewControlPlugin] 未找到聚焦卫星 graphic，请先在 OrbitDynamicsPlugin 中绘制");
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
        console.warn("[OrbitViewControlPlugin] 未找到聚焦卫星 graphic，请先在 OrbitDynamicsPlugin 中绘制");
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
  },
};
</script>

<style lang="scss" scoped>
.orbit-view-control-panel {
  padding: 8px 4px;

  .form-item {
    margin-bottom: 12px;

    .form-label {
      font-size: 12px;
      color: #ddd;
      margin-bottom: 4px;
    }
  }

  .view-group {
    margin-top: 8px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;

    .view-group-title {
      font-size: 13px;
      color: #fff;
      margin-bottom: 8px;
      border-left: 3px solid #018a87;
      padding-left: 6px;
    }

    .view-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;

      :deep(.el-button) {
        margin-left: 0;
      }
    }
  }

  .form-tip {
    margin-top: 12px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.3);
    color: #aaa;
    font-size: 12px;
    line-height: 1.6;
    border-radius: 4px;
  }
}
</style>
