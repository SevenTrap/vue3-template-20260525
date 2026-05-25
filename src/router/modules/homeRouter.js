const homeRouter = [
  {
    path: "/layout/homePage",
    name: "HomePage",
    component: () => import("@/views/HomePage/index.vue"),
    meta: {
      title: "项目模板首页",
      desc: "--",
      roles: [],
    },
  },
];

export default homeRouter;
