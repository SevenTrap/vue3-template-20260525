<template>
  <aircas-panel v-show="orbitDynamicsPlugin" title="轨道动力学可视化" width="320" height="320" top="120" left="430" @close="handlePanelClose">
    <div class="orbit-dynamics-panel">
      <div class="form-item">
        <div class="form-label">坐标系</div>
        <el-radio-group v-model="coordinate" size="small" @change="handleCoordinateChange">
          <el-radio-button label="ECEF">ECEF（地固系）</el-radio-button>
          <el-radio-button label="ECI">ECI（惯性系）</el-radio-button>
        </el-radio-group>
      </div>

      <div class="form-item">
        <div class="form-label">参考起始时刻</div>
        <el-date-picker v-model="startDate" type="datetime" size="small" style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" @change="handleConfigChange" />
      </div>

      <div class="form-item">
        <div class="form-label">外推步长 (秒)</div>
        <el-input-number v-model="stepSec" :min="1" :max="86400" :step="60" size="small" style="width: 100%" @change="handleConfigChange" />
      </div>

      <div class="form-tip">
        已勾选 {{ checkedNorads.length }} 颗卫星，已绘制 {{ drawnNorads.length }} 颗。<br />
        ECEF 模式：地球不动，GEO 卫星地面轨迹呈 8 字。<br />
        ECI 模式：地球自转，轨道呈静态标准圆。
      </div>
    </div>
  </aircas-panel>
</template>

<script>
import dayjs from "dayjs";
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
} from "../utils/mars3dOrbitDynamics.js";

const geoMapStore = useGeoMapStore();

export default {
  name: "OrbitDynamicsPlugin",
  data() {
    return {
      coordinate: "ECEF",
      startDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      stepSec: 3600,
      drawnNorads: [],
    };
  },
  computed: {
    ...mapState(useGeoMapStore, ["orbitDynamicsPlugin", "checkedNorads", "satelliteModels"]),
  },
  watch: {
    checkedNorads: {
      handler(newVal, oldVal) {
        if (!this.orbitDynamicsPlugin) return;
        this.syncSatellites(newVal || [], oldVal || []);
      },
      deep: true,
    },
    orbitDynamicsPlugin(visible) {
      if (visible) {
        this.rebuildAll();
      }
    },
  },
  mounted() {
    this.coordinate = geoMapStore.coordinate || "ECEF";
    ensureOrbitLayer(globalViewer);
  },
  beforeUnmount() {
    this.cleanup();
  },
  methods: {
    /**
     * 关闭面板回调
     * @returns {void}
     */
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("orbitDynamicsPlugin");
      this.cleanup();
    },

    /**
     * 坐标系切换
     * @param {string} value - "ECEF" 或 "ECI"
     * @returns {void}
     */
    handleCoordinateChange(value) {
      geoMapStore.SET_COORDINATE(value);
      this.applyCameraLock();
      this.rebuildAll();
    },

    /**
     * 起始时间或步长变化时重建
     * @returns {void}
     */
    handleConfigChange() {
      this.rebuildAll();
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
     * 解析当前起始时间为 Date 对象
     * @returns {Date}
     */
    resolveStartDate() {
      if (!this.startDate) return new Date();
      return dayjs(this.startDate).toDate();
    },

    /**
     * 计算 buildSampledPositionProperty 所需 frame
     * @returns {"INERTIAL"|"FIXED"}
     */
    resolveFrame() {
      return this.coordinate === "ECI" ? "INERTIAL" : "FIXED";
    },

    /**
     * 全量重建所有已勾选卫星的轨道
     * @returns {void}
     */
    rebuildAll() {
      if (!this.orbitDynamicsPlugin) return;
      ensureOrbitLayer(globalViewer);
      clearOrbitGraphics();
      this.drawnNorads = [];

      const frame = this.resolveFrame();
      const startDate = this.resolveStartDate();
      const step = Math.max(1, Number(this.stepSec) || 3600) * 1000;

      const norads = this.checkedNorads || [];
      norads.forEach((norad) => {
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

    /**
     * 清理图层与相机锁定
     * @returns {void}
     */
    cleanup() {
      unlockCameraFromInertial(globalViewer);
      destroyOrbitLayer(globalViewer);
      this.drawnNorads = [];
    },
  },
};
</script>

<style lang="scss" scoped>
.orbit-dynamics-panel {
  padding: 8px 4px;

  .form-item {
    margin-bottom: 12px;

    .form-label {
      font-size: 12px;
      color: #ddd;
      margin-bottom: 4px;
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
