<template>
  <aircasPanel
    v-show="aircasManagerLayersPlugin"
    title="图层管理"
    @close="handlePanelClose"
  >
    <div class="layer-manager">
      <header>
        <el-input class="search-input" type="text" />

        <el-button class="search-btn" type="primary">查询</el-button>
      </header>

      <el-tree
        :props="{ label: 'name' }"
        :data="layersTree"
        :default-checked-keys="defaultCheckedKeys"
        node-key="id"
        show-checkbox
        @check-change="handleCheckChange"
      />
    </div>
  </aircasPanel>
</template>

<script>
import * as mars3d from "mars3d";
import { mapState } from "pinia";
import { useAircasPluginStore } from "@/store/useAircasPluginStore";
import { globalViewer } from "@/utils";
import { v4 as uuidV4 } from "uuid";

export default {
  name: "AircasManagerLayersPlugin",
  data() {
    return {
      layersTree: [],
      defaultCheckedKeys: [],
    };
  },
  mounted() {
    // TODO 由于在mounted阶段时，web球尚未完成初始化，因此需要在下次更新页面时加载图层
    // 但是el-tree中的默认选中需要在mounted阶段完成初始化，并完成渲染

    layerManagerTree.map((tree) => {
      tree.id = uuidV4();
      if (tree.children && tree.children.length) {
        tree.children.map((layer) => {
          layer.id = uuidV4();
          if (layer.show) {
            this.defaultCheckedKeys.push(layer.id);
            this.$nextTick(() => this.addLayer(layer));
          }
        });
      }

      this.layersTree = layerManagerTree;
    });
  },

  computed: {
    ...mapState(useAircasPluginStore, ["aircasManagerLayersPlugin"]),
  },

  methods: {
    handlePanelClose() {
      const aircasPluginStore = useAircasPluginStore();
      aircasPluginStore.SET_COMPONENT_VISIBLE_FALSE(
        "aircasManagerLayersPlugin",
      );
    },

    handleCheckChange(data, checked, indeterminate) {
      // console.log("handleCurrentChange", data);
      // console.log("handleCurrentChange", checked);
      // console.log("handleCurrentChange", indeterminate);

      if (data.children && data.children.length) {
        // console.log(data.children);
        if (checked) {
          data.children.map((layer) => {
            this.addLayer(layer);
          });
        }
      } else {
        if (checked) {
          this.addLayer(data);
        } else {
          this.removeLayer(data);
        }
      }
    },

    // TODO 在此处可以增加对各种类型的数据处理，例如视角收藏
    addLayer(layer) {
      switch (layer.type) {
        case "wmts":
          this.addWmtsLayer(layer);
          break;
        case "xyz":
          this.addXyzLayer(layer);
          break;
        default:
          this.$message.info("图层类型不正确");
      }
    },

    addWmtsLayer(layer) {
      const layerToRemove = globalViewer.getLayer(layer.id, "id");

      // console.log(layer.id);

      // 避免图层重复添加
      if (layerToRemove) {
        return;
      }

      layer.show = true;

      const layerOption = new mars3d.layer.WmtsLayer(layer);

      globalViewer.addLayer(layerOption);

      if (layer.center) {
        const position = new mars3d.LngLatPoint(
          layer.center.longitude,
          layer.center.latitude,
          layer.center.height,
        );

        globalViewer.flyToPoint(position, {
          radius: 100,
        });
      }
    },
    addXyzLayer() {},

    removeLayer(layer) {
      const layerToRemove = globalViewer.getLayer(layer.id, "id");

      if (layerToRemove) {
        globalViewer.removeLayer(layerToRemove, true);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.layer-manager {
  padding: 10px;

  header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;

    .search-input {
      margin-right: 10px;
    }

    .search-btn {
      width: 100px;
    }
  }
}
</style>
