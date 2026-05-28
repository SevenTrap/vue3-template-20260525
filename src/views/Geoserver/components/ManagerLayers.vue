<template>
  <aircasPanel v-show="managerLayersPlugin" title="图层管理" @close="handlePanelClose">
    <div class="layer-manager">
      <header>
        <el-input class="search-input" type="text" v-model="searchValue" />

        <el-button class="search-btn" type="primary" @click="handleSearch">查询</el-button>
      </header>

      <el-tree
        :data="layersTree"
        :default-checked-keys="defaultCheckedKeys"
        node-key="id"
        show-checkbox
        @check-change="handleCheckChange"
        :filter-node="filterNode"
      />
    </div>
  </aircasPanel>
</template>

<script>
import { mapState } from "pinia";
import { useGeoserverStore } from "@/store/useGeoserverStore";
import { globalViewer } from "@/utils";

import { getLayersTree } from "../apis";
import { layerManagerTree } from "../configs";
import { addWmtsLayer, add3dtilesLayer, addTerrainLayer } from "../utils/mars3dLayers";

export default {
  name: "ManagerLayers",
  data() {
    return {
      searchValue: "",
      layersTree: [],
      defaultCheckedKeys: [],
    };
  },
  mounted() {
    this.initLayersTree();
  },

  computed: {
    ...mapState(useGeoserverStore, ["managerLayersPlugin"]),
  },

  methods: {
    async initLayersTree() {
      const res = await getLayersTree();
      const serverList = res.data.serverList;

      layerManagerTree[0].children = [];
      layerManagerTree[1].children = [];
      layerManagerTree[2].children = [];

      serverList.map((server) => {
        if (server.server_type === "3dtiles") {
          layerManagerTree[1].children.push({
            id: server.id,
            name: server.server_name,
            label: server.server_name,
            type: "3dtiles",
            ...server,
          });
        } else if (server.server_type === "terrain") {
          layerManagerTree[2].children.push({
            id: server.id,
            name: server.server_name,
            label: server.server_name,
            // disabled: true,
            type: "terrain",
            ...server,
          });
        } else {
          layerManagerTree[0].children.push({
            id: server.id,
            name: server.server_name,
            label: server.server_name,
            type: "wmts",
            ...server,
          });
        }
      });

      this.layersTree = layerManagerTree;
    },
    handlePanelClose() {
      const geoserverStore = useGeoserverStore();
      geoserverStore.SET_COMPONENT_VISIBLE_FALSE("managerLayersPlugin");
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
          addWmtsLayer(layer);
          break;
        case "3dtiles":
          add3dtilesLayer(layer);
          break;
        case "terrain":
          addTerrainLayer(layer);
          break;
        case "xyz":
          this.addXyzLayer(layer);
          break;
        default:
          this.$message.info("图层类型不正确");
      }
    },

    filterNode(value, data) {
      if (!value) return true;
      return data.name.includes(value);
    },
    handleSearch() {
      console.log(this.searchValue);
      if (!this.searchValue) {
        this.layersTree = layerManagerTree;
        return;
      }
      this.layersTree = layerManagerTree.filter((item) => item.name.includes(this.searchValue));
    },

    addXyzLayer(layer) {},

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
