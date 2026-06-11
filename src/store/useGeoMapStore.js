import { defineStore } from "pinia";
import { markRaw } from "vue";

export const useGeoMapStore = defineStore("geoMap", {
  state: () => ({
    sceneID: "1", // 场景ID
    threatTargetID: "41745", // 威胁目标ID
    threatTargetName: "敌方卫星", // 威胁目标名称
    threatTles: [
      {
        date: "20260204",
        tle1: "1 41745U 16052B   26033.67594623 -.00000323  00000+0  00000+0 0  9998",
        tle2: "2 41745   3.8242  78.9996 0001019 330.8376 104.2921  1.00127864 26579",
      },
      {
        date: "20260206",
        tle1: "1 41745U 16052B   26036.44045084 -.00000324  00000+0  00000+0 0  9999",
        tle2: "2 41745   3.8312  78.9622 0001079 329.7097  21.9661  1.00126717 26590",
      },
      {
        date: "20260207",
        tle1: "1 41745U 16052B   26036.44045084 -.00000324  00000+0  00000+0 0  9999",
        tle2: "2 41745   3.8312  78.9622 0001079 329.7097  21.9661  1.00126717 26590",
      },
      {
        date: "20260209",
        tle1: "1 41745U 16052B   26039.57811139 -.00000324  00000+0  00000+0 0  9998",
        tle2: "2 41745   3.8394  78.9201 0001147 329.0474  73.6737  1.00125343 26638",
      },
    ],
    importTargetID: "62485", // 被威胁目标ID
    importTargetName: "我方卫星", // 被威胁目标名称
    importTles: [
      {
        date: "20260204",
        tle1: "1 62485U 25002A   26034.80283026 -.00000358  00000+0  00000+0 0  9993",
        tle2: "2 62485   4.7976  61.9375 0046612 167.1807 321.1272  1.00264786  4028",
      },
      {
        date: "20260206",
        tle1: "1 62485U 25002A   26036.74607634 -.00000353  00000+0  00000+0 0  9998",
        tle2: "2 62485   4.8021  61.9290 0046379 167.1567 302.5938  1.00263457  4047",
      },
      {
        date: "20260207",
        tle1: "1 62485U 25002A   26037.76404020 -.00000348  00000+0  00000+0 0  9999",
        tle2: "2 62485   4.8043  61.9244 0047042 166.3696 310.8584  1.00283003  4051",
      },
      {
        date: "20260208",
        tle1: "1 62485U 25002A   26038.79769294 -.00000346  00000+0  00000+0 0  9998",
        tle2: "2 62485   4.8066  61.9183 0046962 166.3455 324.0627  1.00282454  4066",
      },
    ], // 被威胁目标TLE
    besideTargetIDs: [], // 旁观目标ID
    besideTles: {}, // 旁观目标TLE { ID: [{ tle1: "", tle2: "" }] }
    startTime: "2026-02-04 00:00:00", // 开始时间
    endTime: "2026-02-10 23:59:59", // 结束时间
    closeTime: "2026-02-07 10:23:34", // 接近时间
    timeStep: 1 * 60 * 1000, // 默认时间步长：1分钟
    timeFront: 3 * 24 * 60 * 60 * 1000, // 前轨时间：1天
    timeBack: 3 * 24 * 60 * 60 * 1000, // 后轨时间：1天

    checkedNorads: [], // SatelliteTreePlugin 当前勾选的 NORAD ID 列表
    satellitesTree: markRaw([]), // 卫星树
    satelliteModels: markRaw(new Map()), // NORAD -> SatelliteClass 实例

    satelliteTreePlugin: false, // 卫星插件
    geoSatRelativeEchartsPlugin: false, // GEO卫星相对距离与光照角插件
    geoLngHeightEchartsPlugin: false, // GEO卫星高度与经度插件

    // 经度-相对同步轨道高度计算结果（供多个组件复用）
    lngHeightData: markRaw({
      startTime: 0, // 计算起始时间（ms 时间戳）
      endTime: 0, // 计算结束时间（ms 时间戳）
      threatTrack: [], // 威胁目标轨迹 [{ timeMs, time, lon, lat, altKm, heightDiff }]
      importTrack: [], // 被威胁目标轨迹 [{ timeMs, time, lon, lat, altKm, heightDiff }]
      distances: [], // 两星三维距离（km），按时间索引对齐
      sunAngles: [], // threat->import 与 threat->sun 的夹角（°），按时间索引对齐
    }),

    // GEO 相对距离与光照角计算结果（供图表和 ECI/ECEF 上球复用）
    satRelativeData: markRaw({
      startTime: 0, // 计算起始时间（ms 时间戳）
      endTime: 0, // 计算结束时间（ms 时间戳）
      threatTrack: [], // 主动卫星轨迹 [{ timeMs, time, eciKm, ecefKm, lon, lat, altKm }]
      importTrack: [], // 从动卫星轨迹 [{ timeMs, time, eciKm, ecefKm, lon, lat, altKm }]
      distances: [], // 两星三维距离（km），按时间索引对齐
      sunAngles: [], // threat->import 与 threat->sun 的夹角（°），按时间索引对齐
      metrics: [], // 图表指标 [{ timeMs, time, distanceKm, sunAngleDeg }]
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

    // 场景案例和基础场景的通用配置
    focusedNorad: "", // 当前视角聚焦的卫星 NORAD ID
    coordinate: "ECEF", // 坐标系
    currentSceneTimeMs: 0, // web 球 clock 当前时刻（ms 时间戳）
    currentSceneConfig: {}, // 当前场景配置
    showGeoCirclePositions: true, // 显示同步轨道带
    showGeoCircleLabel: true, // 显示经度标签
    showPatrolArea: true, // 显示巡视区域
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
