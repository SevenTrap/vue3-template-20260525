<template>
  <TitleBarLeo></TitleBarLeo>
  <SystemFunc></SystemFunc>
  <main>
    <router-view></router-view>
  </main>
</template>

<script>
import TitleBarLeo from "./components/TitleBarLeo/index.vue";
import SystemFunc from "./components/SystemFunc/index.vue";

export default {
  name: "layoutLeo",
  components: { TitleBarLeo, SystemFunc },
};
</script>

<style lang="scss" scoped>
main {
  width: 100vw;
  height: calc(100vh - 55px);
  position: relative;
}
</style>
