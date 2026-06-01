import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import * as ElementPlusIcons from "@element-plus/icons-vue";
import "font-awesome/css/font-awesome.min.css";

// style 样式配置
import "element-plus/dist/index.css";
import "./styles/theme.css";
import "./styles/index.scss";

import App from "./App.vue";
import router from "./router/index";
import ComponentRegister from "./components/register";
import PluginsRegister from "./plugins/register";

const app = createApp(App);
const pinia = createPinia();

// 注册element-icon图标
for (const [key, component] of Object.entries(ElementPlusIcons)) {
  app.component(key, component);
}

// element-plus本地化语言设置
app.use(ElementPlus, {
  locale: zhCn,
});
app.use(ComponentRegister);
app.use(PluginsRegister);
app.use(pinia);
app.use(router);
app.mount("#app");
