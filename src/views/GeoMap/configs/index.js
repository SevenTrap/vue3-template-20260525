export const GLOBAL_VIEW_ALT = 160_000_000;
export const POLE_VIEW_ALT = 25_000_000;
export const EQUATOR_VIEW_ALT = 80_000_000;
export const ORBITAL_PLANE_ALT = 60_000_000;

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
