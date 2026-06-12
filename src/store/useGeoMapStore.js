import { defineStore } from "pinia";
import { markRaw } from "vue";

export const useGeoMapStore = defineStore("geoMap", {
  state: () => ({
    // 场景案例和基础场景的通用配置
    focusedNorad: "", // 当前视角聚焦的卫星 NORAD ID
    coordinate: "ECEF", // 坐标系
    currentSceneTimeMs: 0, // web 球 clock 当前时刻（毫秒时间戳）
    currentSceneConfig: {}, // 当前场景配置
    clockStartTime: null, // 场景时钟开始时间（毫秒时间戳）
    clockEndTime: null, // 场景时钟结束时间（毫秒时间戳）
    showGeoCirclePositions: true, // 显示同步轨道带
    showGeoCircleLabel: true, // 显示经度标签
    showPatrolArea: true, // 显示巡视区域

    distanceThreshold: 100, // 距离阈值（km）
    sunAngleThreshold: 90, // 光照角阈值（°）

    checkedNorads: [], // SatelliteTreePlugin 当前勾选的 NORAD ID 列表
    satellitesTree: markRaw([]), // 卫星树
    satelliteTracks: markRaw(new Map()), // NORAD -> SatelliteTrack 实例
    satelliteModels: markRaw(new Map()), // NORAD -> SatelliteClass 实例

    satelliteTreePlugin: false, // 卫星插件
    geoSatRelativeEchartsPlugin: false, // GEO卫星相对距离与光照角插件
    geoLngHeightEchartsPlugin: false, // GEO卫星高度与经度插件

    satRelativeData: markRaw({
      startTime: "",
      endTime: "",
      threatTrack: [],
      importTrack: [],
      distances: [], // 两星三维距离（km），按时间索引对齐
      sunAngles: [], // threat->import 与 sun->import 的夹角（°），按时间索引对齐
    }),

    sceneControlPlugin: true, // 场景控制插件
    historyCasePlugin: false, // 历史案例插件

    // 基础场景的通用配置
    sceneControlPluginBase: false, // 场景控制插件（基础）
    showSatellitePointBase: true, // 显示卫星当前实时点位
    showSatelliteOrbitBase: true, // 显示轨道线
    showSatelliteNameBase: true, // 显示卫星名称
    showSatelliteModelBase: true, // 显示卫星模型

    // 场景案例的特殊配置
    showImportSatelliteOrbitScene: false, // 显示从星轨道线
    showThreatSatelliteOrbitScene: false, // 显示主星轨道线
    showImportSatelliteTrajectoryScene: true, // 显示从星轨迹线
    showThreatSatelliteTrajectoryScene: true, // 显示主星轨迹线
    showSatelliteNameScene: true, // 显示卫星名称
    showSatellitePointScene: true, // 显示卫星当前实时点位
    showSatelliteModelScene: false, // 显示卫星模型
    showSatelliteSensorScene: false, // 显示卫星传感器
    showSatelliteBodyCoordinateAxisScene: false, // 显示卫星本体坐标系
    showSatelliteOrbitCoordinateAxisScene: false, // 显示卫星轨道坐标系
    showSatelliteLightDirectionScene: true, // 显示卫星光照方向
    showSatelliteImageDirectionScene: false, // 显示卫星成像方向
  }),
  getters: {
    getMenuBarVisible: (state) => {
      return (item) => state[item];
    },
  },
  actions: {
    /**
     * @description 切换菜单栏组件显隐
     * @param {string} menuItem
     */
    TOGGLE_COMPONENT_VISIBLE(menuItem) {
      this[menuItem] = !this[menuItem];
    },

    /**
     * @description 设置菜单栏组件为true
     * @param {string} menuItem
     */
    SET_COMPONENT_VISIBLE_TRUE(menuItem) {
      this[menuItem] = true;
    },

    /**
     * @description 设置菜单栏组件为false
     * @param {string} menuItem
     */
    SET_COMPONENT_VISIBLE_FALSE(menuItem) {
      this[menuItem] = false;
    },

    /**
     * @description 设置状态数据
     * @param {Object} paylod
     * @param {string} paylod.key
     * @param {any} paylod.value
     */
    SET_STATE_DATA(paylod) {
      this[paylod.key] = paylod.value;
    },

    /**
     * @description 同步 SatelliteTreePlugin 当前勾选的 NORAD ID
     * @param {Array<string>} norads
     */
    SET_CHECKED_NORADS(norads) {
      this.checkedNorads = Array.isArray(norads) ? [...norads] : [];
    },

    /**
     * @description 保存经度-相对同步轨道高度的计算结果（LLA、两星距离、光照角等）
     * @param {Object} data
     * @param {number} data.startTime - 起始时间（ms 时间戳）
     * @param {number} data.endTime - 结束时间（ms 时间戳）
     * @param {Array} data.threatTrack - 威胁目标轨迹
     * @param {Array} data.importTrack - 被威胁目标轨迹
     * @param {Array} data.distances - 两星距离（km）
     * @param {Array} data.sunAngles - 光照角（°）
     */
    SET_LNG_HEIGHT_DATA(data) {
      this.lngHeightData = markRaw({ ...data });
    },

    /**
     * @description 保存GEO相对距离与光照角计算结果
     * @param {Object} data
     * @param {number} data.startTime - 起始时间（ms 时间戳）
     * @param {number} data.endTime - 结束时间（ms 时间戳）
     * @param {Array} data.threatTrack - 主动卫星轨迹
     * @param {Array} data.importTrack - 从动卫星轨迹
     * @param {Array} data.distances - 两星距离（km）
     * @param {Array} data.sunAngles - 光照角（°）
     * @param {Array} data.metrics - 图表指标
     */
    SET_SAT_RELATIVE_DATA(data) {
      this.satRelativeData = markRaw({ ...data });
    },
  },
});
