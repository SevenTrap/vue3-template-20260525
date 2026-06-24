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
    sceneID: "1",
    startTime: "2026-02-04 12:00:00",
    endTime: "2026-02-16 12:00:00",
    closeTime: "2026-02-09 10:23:34",
    timeFront: 1 * 24 * 60 * 60 * 1000,
    timeBack: 1 * 24 * 60 * 60 * 1000,
    timeStep: 1 * 60 * 1000,

    threatSatelliteNoradID: "25019",
    importSatelliteNoradID: "23712",
    threatSatelliteName: "敌方卫星",
    importSatelliteName: "我方卫星",

    satelliteNoradIDs: ["25019", "23712"],
    satelliteTles: [
      [
        {
          tle1: "1 25019U 97065A   26035.09331389 -.00000071  00000+0  00000+0 0  9993",
          tle2: "2 25019  12.6258  22.7086 0007173 292.0101 101.0307  1.00274069 31624",
        },
        {
          tle1: "1 25019U 97065A   26037.05452846 -.00000066  00000+0  00000+0 0  9997",
          tle2: "2 25019  12.6281  22.6940 0007090 293.9441  87.0912  1.00274143 31643",
        },
        {
          tle1: "1 25019U 97065A   26037.54908848 -.00000065  00000+0  00000+0 0  9998",
          tle2: "2 25019  12.6287  22.6902 0007071 294.4707 265.1005  1.00274161 31649",
        },
        {
          tle1: "1 25019U 97065A   26038.53069631 -.00000063  00000+0  00000+0 0  9994",
          tle2: "2 25019  12.6298  22.6826 0007020 295.2725 258.6569  1.00274113 31659",
        },
        {
          tle1: "1 25019U 97065A   26039.52914447 -.00000062  00000+0  00000+0 0  9997",
          tle2: "2 25019  12.6309  22.6747 0006963 296.0205 258.3469  1.00274064 31663",
        },
        {
          tle1: "1 25019U 97065A   26040.52761402 -.00000060  00000+0  00000+0 0  9998",
          tle2: "2 25019  12.6320  22.6668 0006908 296.5726 258.2406  1.00274020 31673",
        },
        {
          tle1: "1 25019U 97065A   26042.52441510 -.00000059  00000+0  00000+0 0  9993",
          tle2: "2 25019  12.6343  22.6511 0006803 297.5301 258.1243  1.00273854 31693",
        },
        {
          tle1: "1 25019U 97065A   26043.52290661 -.00000058  00000+0  00000+0 0  9992",
          tle2: "2 25019  12.6353  22.6432 0006767 297.8053 258.3016  1.00273698 31700",
        },
        {
          tle1: "1 25019U 97065A   26046.29603890 -.00000057  00000+0  00000+0 0  9990",
          tle2: "2 25019  12.6383  22.6213 0006697 297.9537 179.2435  1.00273185 31730",
        },
        {
          tle1: "1 25019U 97065A   26046.48417075 -.00000057  00000+0  00000+0 0  9999",
          tle2: "2 25019  12.6385  22.6198 0006694 297.9676 247.1446  1.00273166 31731",
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
