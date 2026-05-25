const templateRouter = [
  {
    path: "/layout/TemplatePage",
    name: "TemplatePage",
    component: () => import("@/views/TemplatePage/index.vue"),
    meta: {
      title: "模板页面",
      roles: [],
    },
  },
];

export default templateRouter;
