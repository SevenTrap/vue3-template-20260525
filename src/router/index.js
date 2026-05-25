import { createRouter, createWebHashHistory } from "vue-router";
import { getStorage } from "../utils/storage";

import LayoutPage from "@/layout/index.vue";
import LayoutGeo from "@/layoutGeo/index.vue";
import LayoutLeo from "@/layoutLeo/index.vue";

import homeRouter from "./modules/homeRouter";
import aiRouter from "./modules/aiRouter";
import geoRouter from "./modules/geoRouter";
import cesiumRouter from "./modules/cesiumsRouter";
import openlayersRouter from "./modules/openlayersRouter";
import leoRouter from "./modules/leoRouter";
import elementRouter from "./modules/elementRouter";
import templateRouter from "./modules/templateRouter";
import geoserverRouter from "./modules/geoserver";

const routes = [
  {
    path: "/",
    redirect: "/layout/homePage",
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/LoginPage/index.vue"),
  },
  {
    path: "/layout",
    redirect: "/layout/homePage",
    component: LayoutPage,
    children: [...homeRouter, ...elementRouter, ...templateRouter, ...geoserverRouter],
  },

  {
    path: "/layoutGeo",
    redirect: "/layoutGeo/homePage",
    component: LayoutGeo,
    children: [...aiRouter, ...cesiumRouter, ...geoRouter, ...openlayersRouter],
  },
  {
    path: "/layoutLeo",
    redirect: "/layoutLeo/leoEcharts",
    component: LayoutLeo,
    children: [...leoRouter],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes: routes,
});

router.beforeEach((to, from) => {
  const token = getStorage("token");
  const username = getStorage("username");

  document.title = to.meta.title || SYSTEM_CONFIG.systemTitle;

  // next();

  // if (to.name === "Login") {
  //   return true;
  // } else {
  //   if (token && username) {
  //     return true;
  //   } else {
  //     return {
  //       path: "/login",
  //     };
  //   }
  // }
});

router.afterEach((to, from, failure) => {
  // console.log(failure);
});

export default router;
