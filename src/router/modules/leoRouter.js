const leoRouter = [
  {
    path: "/layoutLeo/leoEcharts",
    name: "LeoEcharts",
    component: () => import("@/views/LeoEcharts/index.vue"),
    meta: {
      title: "低轨态势(echarts)",
      desc: "以经纬网构建的二维直角坐标系",
      roles: [],
    },
  },
];

export default leoRouter;
