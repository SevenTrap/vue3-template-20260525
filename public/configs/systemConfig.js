const SYSTEM_CONFIG = {
  systemTitle: "项目模版",

  menuListLeft: [
    // { path: "/layout/homePage", name: "HomePage", label: "首页" },
    // { path: "/layoutGeo/geoEcharts", name: "GeoEcharts", label: "高轨echarts" },
    // { path: "/layoutGeo/geoMap", name: "GeoMap", label: "高轨cesium" },
  ],

  menuListRight: [
    // { path: "/layout/menuthree", name: "MenuThree", label: "菜单栏三" },
    // { path: "/layout/menufour", name: "MenuFour", label: "菜单栏四" },
  ],

  menuQuickList: [
    // { path: "javascript:void(0)", name: "MenuFive", label: "菜单栏五", iconType: "element", iconName: "Setting" },
    // { path: "javascript:void(0)", name: "MenuSix", label: "菜单栏六", iconType: "element", iconName: "Suitcase" },
  ],
};

const SYSTEM_CONFIG_Satellite = {
  satelliteColors: {
    中国: "#ff0000",
    美国: "#0000ff",
    日本: "#e89951",
    俄罗斯: "#f9b2d7",
  },
  defaultTimeFront: 24 * 60 * 60 * 1000, // 默认时间周期：1天
  defaultTimeBack: 24 * 60 * 60 * 1000, // 默认时间周期：1天
  defaultTimeStep: 1 * 60 * 1000, // 默认时间步长：1分钟
};
