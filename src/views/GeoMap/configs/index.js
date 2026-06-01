export const GLOBAL_VIEW_ALT = 160_000_000;

export const ECEF_PRESETS = [
  { id: "default", label: "默认视角" },
  { id: "southPole", label: "南极视角" },
  { id: "starPole", label: "恒星视角" },
  { id: "equator", label: "赤道视角" },
];

export const ECI_PRESETS = [
  { id: "default", label: "默认视角" },
  { id: "southPole", label: "南极视角" },
  { id: "firstSatPole", label: "主星视角" },
  { id: "secondSatPole", label: "从星视角" },
  // { id: "orbitalPlanePole", label: "轨道平面" },
  { id: "equatorPlanePole", label: "赤道平面" },
];

// USA271 4
// USA270 3
// USA325 6
// USA253 1
// USA324 5
// USA254 2

// 62485; shijian-25

export const SCENE_LISTS = [
  {
    id: 1,
    threatTargetId: "41745",
    threatTle1: "1 41745U 16052B   25229.77426406 -.00000357  00000+0  00000+0 0  9995",
    threatTle2: "2 41745   3.3916  81.0830 0000698 162.2044 123.4419  0.99877634 24875",
    importTargetId: "62485",
    importTle1: "1 62485U 25002A   25232.73662537 -.00000369  00000+0  00000+0 0  9994",
    importTle2: "2 62485   4.4283  62.8934 0055655 163.9399 134.6503  1.00282227  2352",
    closeTime: "2026-06-01 12:00:00",
    defaultTimeFront: 24 * 60 * 60 * 1000, // 默认时间周期：1天
    defaultTimeBack: 24 * 60 * 60 * 1000, // 默认时间周期：1天
    defaultTimeStep: 1 * 60 * 1000, // 默认时间步长：1分钟
  },
];
