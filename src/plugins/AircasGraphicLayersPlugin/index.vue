<template>
  <AircasPanel v-show="aircasGraphicLayersPluginVisiable" title="数据目录树" width="300" height="700" top="120" left="100" @close="handlePanelClose">
    <el-input v-model="filterText" placeholder="请输入名称" style="margin-bottom: 5px" @keyup.enter="handleSearchByName" />
    <el-tree-v2 ref="aircasGraphicLayersTree" class="aircas-el-tree-v2" :data="graphicLayersTree" node-key="id" :filter-method="filterNode" :height="600">
      <template #default="{ node, data }">
        <template v-if="node.isLeaf">
          <span @click.stop="handleFlyTo(data)">
            {{ node.label }}
          </span>
        </template>

        <template v-else>
          <span>{{ node.label }}</span>
        </template>
      </template>
    </el-tree-v2>
  </AircasPanel>
</template>

<script>
import { mapState } from "pinia";
import { useAircasPluginStore } from "@/store/useAircasPluginStore";
import { globalViewer } from "@/utils/initEarth";

export default {
  name: "AircasGraphicLayersPlugin",
  data() {
    return {
      timer: null,
      filterText: "",
      graphicLayersTree: [],
    };
  },
  mounted() {
    this.timer = setInterval(() => {
      this.updateAllLayers();
    }, 1000);
  },
  computed: {
    ...mapState(useAircasPluginStore, ["aircasGraphicLayersPluginVisiable"]),
  },
  methods: {
    // TODO 当 globalViewer 没有初始化，globalViewer.getLayers()获取不到数据会报错，需要优化解决
    updateAllLayers() {
      let graphicLayersTree = [];
      const layers = globalViewer.getLayers();

      layers.forEach((layer) => {
        if (layer.type === "graphic" && layer.name) {
          const graphics = layer.getGraphics();

          let layerItem = {
            id: layer.id,
            layerId: layer.id,
            label: layer.name,
            type: "graphic",
            children: [],
          };

          graphics.forEach((graphic) => {
            if (!graphic.name) return;

            let graphicItem = {
              id: graphic.id,
              layerId: layer.id,
              graphicId: graphic.id,
              label: graphic.name,
            };

            layerItem.children.push(graphicItem);
          });

          graphicLayersTree.push(layerItem);
        }
      });

      this.graphicLayersTree = graphicLayersTree;
    },

    // 定位至数据位置
    handleFlyTo(data) {
      const layer = globalViewer.getLayerById(data.layerId);
      const graphic = layer.getGraphicById(data.graphicId);

      globalViewer.flyToGraphic(graphic);
    },

    handleSearchByName() {
      this.$refs.aircasGraphicLayersTree.filter(this.filterText);
    },

    filterNode(value, data) {
      if (!value) return true;
      return data.label && data.label.indexOf(value) !== -1;
    },

    handlePanelClose() {
      const aircasPluginStore = useAircasPluginStore();
      aircasPluginStore.SET_COMPONENT_VISIBLE_FALSE("aircasGraphicLayersPluginVisiable");
    },
  },

  beforeDestroy() {
    if (this.timer) clearInterval(this.timer);
  },
};
</script>

<style lang="scss" scoped></style>
