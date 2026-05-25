<template>
  <div class="all-configs">
    <h2>全部配置</h2>

    <el-tree ref="allTreeConfigs" class="aircas-el-tree" :data="originalTreeData" node-key="id" show-checkbox @check-change="handleNodeCheckChange"></el-tree>
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
    ...mapState(useTreeConfigsStore, ["originalTreeData", "selectedNodeIds"]),
  },

  methods: {
    handleNodeCheckChange() {
      const checked = this.$refs.allTreeConfigs.getCheckedKeys();

      console.log(checked, "allTreeConfigs");

      const treeConfigsStore = useTreeConfigsStore();
      treeConfigsStore.handleCheckChange(checked);
    },
  },
};
</script>

<style lang="scss" scoped>
.all-configs {
  color: #1e1e1e;
  height: 100%;
}
</style>
