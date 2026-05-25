<template>
  <div class="selected-configs">
    <h2>已选择的配置</h2>

    <el-tree class="aircas-el-tree" :data="selectedTreeData" node-key="id" default-expand-all></el-tree>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useTreeConfigsStore } from "../store/useTreeConfigsStore.js";

export default {
  name: "AllConfigs",
  data() {
    return {};
  },

  computed: {
    ...mapState(useTreeConfigsStore, ["selectedTreeData"]),
  },

  methods: {},
};
</script>

<style lang="scss" scoped>
.selected-configs {
  color: #1e1e1e;
  height: 100%;
}
</style>
