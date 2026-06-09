export const GLOBAL_VIEW_ALT = 160_000_000;

export const BASE_VIEW_PRESETS = [
  { id: "default", label: "默认视角" },
  { id: "southPole", label: "南极视角" },
  { id: "equator", label: "赤道视角" },
];

export const ECEF_PRESETS = [
  { id: "default", label: "默认视角" },
  { id: "southPole", label: "南极视角" },
  { id: "starPole", label: "恒星视角" },
  { id: "equator", label: "赤道视角" },
];

export const ECI_PRESETS = [
  { id: "default", label: "默认视角" },
  { id: "southPole", label: "南极视角" },
  // { id: "firstSatPole", label: "主星视角" },
  // { id: "secondSatPole", label: "从星视角" },
  // { id: "orbitalPlanePole", label: "轨道平面" },
  { id: "equatorPlanePole", label: "赤道视角" },
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

export const SCENE_LISTS = [
  {
    sceneID: "1", // 场景ID
    threatTargetID: "41745", // 主动卫星ID
    importTargetID: "62485", // 从动卫星ID
    besideTargetIDs: [], // 旁观目标ID

    threatName: "敌方卫星", // 主动卫星名称
    importName: "我方卫星", // 从动卫星名称
    besideTargetNames: [], // 旁观目标名称

    startTime: "2026-02-06 12:00:00", // 开始时间
    endTime: "2026-02-07 12:00:00", // 结束时间
    closeTime: "2026-02-07 10:23:34", // 接近时间
    timeStep: 1 * 60 * 1000, // 默认时间步长：1分钟
    timeFront: 3 * 24 * 60 * 60 * 1000, // 前轨时间：1天
    timeBack: 3 * 24 * 60 * 60 * 1000, // 后轨时间：1天
    distanceThreshold: 100, // 距离阈值（km）
    sunAngleThreshold: 90, // 光照角阈值（°）
    besideTles: {}, // 旁观目标TLE { ID: [{ tle1: "", tle2: "" }] }
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
    ],
  },
];
