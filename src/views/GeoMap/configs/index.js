export const GLOBAL_VIEW_ALT = 160_000_000;

export const BASE_VIEW_PRESETS = [
  { id: "default", label: "默认视角" },
  { id: "southPole", label: "南极视角" },
  { id: "equator", label: "赤道视角" },
];

export const ECEF_PRESETS = [
  { id: "default", label: "默认视角" },
  { id: "southPoleFront", label: "南极俯视" },
  { id: "southPoleSide", label: "南极侧视" },
  { id: "starPole", label: "恒星视角" },
];

export const ECI_PRESETS = [
  { id: "default", label: "默认视角" },
  { id: "southPoleFront", label: "南极俯视" },
  { id: "southPoleSide", label: "南极侧视" },
  { id: "importSatellite", label: "从星固定" },
  { id: "firstSatPole", label: "第一视角" },
];

// USA271 4
// USA270 3
// USA325 6
// USA253 1
// USA324 5
// USA254 2

// 62485; shijian-25

export const DEFAULT_NORAD_USA = ["41745", "41744"]; // USA271, USA270
export const DEFAULT_NORAD_CHINA = ["62485"]; // shijian-25

/**
 * @description 场景列表
 * @param {string} sceneID - 场景ID
 * @param {string} startTime - 开始时间
 * @param {string} endTime - 结束时间
 * @param {string} closeTime - 接近时间
 * @param {string} timeFront - 前轨时间，注意closeTime - timeFront 不能小于 startTime
 * @param {string} timeBack - 后轨时间，注意closeTime + timeBack 不能大于 endTime
 * @param {string} timeStep - 时间步长，注意timeStep 不能大于 timeFront 和 timeBack
 * @param {string} threatSatelliteNoradID - 主动卫星ID
 * @param {string} importSatelliteNoradID - 从动卫星ID
 * @param {string} threatSatelliteName - 主动卫星名称
 * @param {string} importSatelliteName - 从动卫星名称
 * @param {string[]} satelliteNoradIDs - 场景中涉及的卫星ID
 * @param {string[][]} satelliteTles - 场景中涉及的卫星TLE
 * @param {string} satelliteTles[0][0].date - 卫星TLE日期
 * @param {string} satelliteTles[0][0].tle1 - 卫星TLE第一行
 * @param {string} satelliteTles[0][0].tle2 - 卫星TLE第二行
 * */
export const SCENE_LISTS = [
  {
    sceneID: "1", // 场景ID
    startTime: "2026-02-04 12:00:00", // 开始时间
    endTime: "2026-02-16 12:00:00", // 结束时间
    closeTime: "2026-02-09 10:23:34", // 接近时间
    timeFront: 1 * 24 * 60 * 60 * 1000, // 前轨时间：1天
    timeBack: 1 * 24 * 60 * 60 * 1000, // 后轨时间：1天
    timeStep: 1 * 60 * 1000, // 默认时间步长：1分钟

    threatSatelliteNoradID: "25019", // 主动卫星NORAD ID
    importSatelliteNoradID: "23712", // 从动卫星NORAD ID
    threatSatelliteName: "敌方卫星", // 主动卫星名称
    importSatelliteName: "我方卫星", // 从动卫星名称

    satelliteNoradIDs: ["25019", "23712"], // 场景中涉及的卫星NORAD ID
    satelliteTles: [
      [
        {
          tle1: "1 25019U 97065A   26043.52290661 -.00000058  00000+0  00000+0 0  9992",
          tle2: "2 25019  12.6353  22.6432 0006767 297.8053 258.3016  1.00273698 31700",
        },
        {
          tle1: "1 25019U 97065A   26039.52914447 -.00000062  00000+0  00000+0 0  9997",
          tle2: "2 25019  12.6309  22.6747 0006963 296.0205 258.3469  1.00274064 31663",
        },
      ],
      [
        {
          tle1: "1 23712U 95060A   26043.49072709 -.00000011  00000+0  00000+0 0  9999",
          tle2: "2 23712  14.0274   4.6692 0003582 328.2460 226.2728  1.00271884 31638",
        },
        {
          tle1: "1 23712U 95060A   26039.45634406 -.00000016  00000+0  00000+0 0  9993",
          tle2: "2 23712  14.0259   4.7009 0003767 324.3763 213.7730  1.00271064 31591",
        },
      ],
    ],
  },
];
