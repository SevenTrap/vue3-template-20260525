const geoRouter = [
  {
    path: "/layoutGeo/geoEcharts",
    name: "GeoEcharts",
    component: () => import("@/views/GeoEcharts/index.vue"),
    meta: {
      title: "高轨态势(echarts)",
      desc: "以经高网构建的二维直角坐标系",
      roles: [],
    },
  },
  {
    path: "/layoutGeo/geoMap",
    name: "GeoMap",
    component: () => import("@/views/GeoMap/index.vue"),
    meta: {
      title: "高轨态势(cesium)",
      desc: "以mars3d为基础构建的三维球",
      roles: [],
    },
  },
];

export default geoRouter;
