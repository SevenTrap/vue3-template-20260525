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
];

export default geoRouter;
