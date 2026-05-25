<template>
  <div class="tree-configs">
    <AllConfigs class="all-configs"></AllConfigs>
    <SelectedConfigs class="selected-configs"></SelectedConfigs>
  </div>
</template>

<script>
import AllConfigs from "./components/AllConfigs.vue";
import SelectedConfigs from "./components/SelectedConfigs.vue";

export default {
  name: "TreeConfigs",
  components: {
    AllConfigs,
    SelectedConfigs,
  },
};
</script>

<style lang="scss" scoped>
.tree-configs {
  width: 100%;
  height: 100%;
  background-color: #82b18b;
  display: flex;
  justify-content: space-between;
  gap: 10px;

  .all-configs,
  .selected-configs {
    width: 50%;
    height: 100%;
    background-color: burlywood;
    color: #1e1e1e;
  }
}
</style>
