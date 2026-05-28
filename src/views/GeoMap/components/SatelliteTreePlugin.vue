<template>
  <aircas-panel v-show="satelliteTreePlugin" title="卫星列表" width="300" height="700" top="120" left="100" @close="handlePanelClose">
    <el-input v-model="filterText" placeholder="请输入卫星名称" style="margin-bottom: 5px" @keyup.enter="handleSearch" />
    <el-tree-v2
      ref="satelliteTree"
      class="aircas-el-tree-v2"
      :data="satellitesTree"
      node-key="id"
      show-checkbox
      @check="handleCheckChange"
      :filter-method="filterNode"
      :height="600"
    >
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
  </aircas-panel>
</template>

<script>
import * as mars3d from "mars3d";
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { globalViewer } from "@/utils/initEarth.js";

import { addSatellite } from "@/utils/mars3d/mars3dSatellite.js";
import { initSatellitesTree } from "../utils/initSatellitesTree.js";

const geoMapStore = useGeoMapStore();
let satelliteLayer = null;
let satellitePathLayer = null;
let dmzLayer = null;

export default {
  name: "Satellite",
  data() {
    return {
      filterText: "",
      satellitesTree: [],
      defaultCheckedKeys: [],
      checkedNorads: [],
      satelliteModels: null,
    };
  },
  async mounted() {
    const { satellitesTree, satelliteModels } = await initSatellitesTree();

    this.satellitesTree = satellitesTree;
    this.satelliteModels = satelliteModels;

    geoMapStore.SET_SATELLITE_MODELS(satelliteModels);

    this.$nextTick(() => {
      this.initLayer();
      this.initDmzLayer();
    });
  },
  computed: {
    ...mapState(useGeoMapStore, ["satelliteTreePlugin"]),
  },
  methods: {
    handleCheckChange(data, info) {
      const currentCheckedNorads = info.checkedKeys;
      const oldCheckedNorads = this.checkedNorads.slice();

      const addedNorads = currentCheckedNorads.filter((norad) => !oldCheckedNorads.includes(norad));
      const removeNorads = oldCheckedNorads.filter((norad) => !currentCheckedNorads.includes(norad));

      for (let i = 0, len = addedNorads.length; i < len; i++) {
        try {
          const norad = addedNorads[i];
          const satelliteModel = this.satelliteModels.get(norad);
          if (satelliteModel) addSatellite(satelliteLayer, satelliteModel);
        } catch (e) {
          console.error(e);
        }
      }

      for (let i = 0, len = removeNorads.length; i < len; i++) {
        const norad = removeNorads[i];
        this.removeSatelliteById(norad);
      }

      this.checkedNorads = currentCheckedNorads;
      geoMapStore.SET_CHECKED_NORADS(currentCheckedNorads);
    },

    handleFlyTo(data) {
      const currentGraphic = satelliteLayer.getGraphicById(data.id);
      if (currentGraphic) globalViewer.flyToGraphic(currentGraphic);
    },

    /**
     * 根据卫星名称进行检索
     * @param {string} filterText
     * */
    handleSearch() {
      this.$refs.satelliteTree.filter(this.filterText);
    },

    /**
     * 过滤节点
     * @param {string} value
     * @param {Object} data
     * */
    filterNode(value, data) {
      if (!value) return true;
      return data.label && data.label.indexOf(value) !== -1;
    },

    initLayer() {
      satelliteLayer = new mars3d.layer.GraphicLayer({ name: "卫星图层" });
      satellitePathLayer = new mars3d.layer.GraphicLayer({
        name: "卫星路径图层",
      });
      dmzLayer = new mars3d.layer.GraphicLayer({ name: "地面站图层" });

      globalViewer.addLayer(satelliteLayer);
      globalViewer.addLayer(satellitePathLayer);
      globalViewer.addLayer(dmzLayer);

      satelliteLayer.on(mars3d.EventType.click, (event) => {
        console.log("点击了卫星", event);
      });

      satelliteLayer.on(mars3d.EventType.change, (event) => {
        requestAnimationFrame(() => {
          this.processInArea(event.graphic);
          this.processSatsLinks(event.graphic);
        });
        // this.processInArea(event.graphic);
        // this.processSatsLinks(event.graphic);
      });

      // globalViewer.clock.onTick.addEventListener((clock) => {
      //   console.log("时间变化了", clock.currentTime);
      //   console.log("时间变化了2", globalViewer.clock.currentTime);
      // });
    },
    initSatelliteLayer() {
      this.satelliteModels.forEach((satelliteModel) => {
        const llaArray = satelliteModel.getLLAsByPeriod(new Date(), 60 * 1000);

        const positions = [];
        const positions2 = [];
        const positions3 = [];
        llaArray.map((item) => {
          const position = {
            lng: item.lon,
            lat: item.lat,
            alt: item.heightKm * 1000,
            currTime: item.time,
          };
          const position2 = {
            lng: item.lon,
            lat: item.lat,
            alt: 0,
            currTime: item.time,
          };

          positions.push(position);
          positions2.push(position2);
          positions3.push([item.lon, item.lat, item.heightKm * 1000]);
        });

        const pathGraphic = new mars3d.graphic.PathEntity({
          position: {
            type: "time",
            list: positions,
            timeField: "currTime",
            pauseTime: 12 * 60 * 60,
            interpolation: true,
            interpolationAlgorithm: mars3d.Cesium.LagrangePolynomialApproximation,
            interpolationDegree: 3,
            forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
          },
          style: {
            width: 2,
            color: "#ff0000",
            opacity: 0.7,
            resolution: 1,
            leadTime: 0,
            trailTime: 3600,
          },
        });

        const pathGraphic2 = new mars3d.graphic.PathEntity({
          position: {
            type: "time",
            list: positions2,
            timeField: "currTime",
            forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
          },
          style: {
            width: 2,
            color: "#ff0000",
            opacity: 0.7,
            resolution: 1,
            leadTime: 0,
            trailTime: 3600,
          },
        });

        const graphic = new mars3d.graphic.PolylineEntity({
          positions: positions3,
          style: {
            width: 5,
            color: "#3388ff",
            // color: Cesium.CallbackProperty(function () {
            //   return Cesium.Color.BLUE
            // }, false),

            label: { text: "鼠标移入会高亮", pixelOffsetY: -30 },
            // 高亮时的样式（默认为鼠标移入，也可以指定type:'click'单击高亮），构造后也可以openHighlight、closeHighlight方法来手动调用
            highlight: {
              color: "#ff0000",
            },
          },
        });
        // satellitePathLayer.addGraphic(pathGraphic);
        // satellitePathLayer.addGraphic(pathGraphic2);
        // satellitePathLayer.addGraphic(graphic);

        addSatellite(satelliteModel);

        const satelliteGraphic = new mars3d.graphic.Satellite({
          id: satelliteModel.noradID,
          name: satelliteModel.noradID,
          tle1: satelliteModel.tle1,
          tle2: satelliteModel.tle2,
          model: {
            url: "assets/gltf/weixin.gltf",
            scale: 1,
            minimumPixelSize: 90,
            silhouette: false,
          },

          label: {
            text: satelliteModel.noradID,
            font_size: 20,
            font_family: "楷体",
            color: "#ffffff",
            opacity: 1,
            outline: true,
            outlineColor: "#000000",
            outlineWidth: 2,
            background: true,
            backgroundColor: "#000000",
            backgroundOpacity: 0.5,
            backgroundPadding: new mars3d.Cesium.Cartesian2(2, 5),
            pixelOffsetX: 0,
            pixelOffsetY: -20,
            pixelOffsetScaleByDistance: true,
            pixelOffsetScaleByDistance_far: 1000000,
            pixelOffsetScaleByDistance_farValue: 0.5,
            pixelOffsetScaleByDistance_near: 1000,
            pixelOffsetScaleByDistance_nearValue: 1.0,
            scaleByDistance: true,
            scaleByDistance_far: 1000000,
            scaleByDistance_farValue: 0.5,
            scaleByDistance_near: 1000,
            scaleByDistance_nearValue: 1.0,
          },

          cone: {
            sensorType: mars3d.graphic.SatelliteSensor.Type.Conic,
            angle1: 30,
            angle: 15,
            color: "rgba(0,255,0,0.3)",
            show: false,
          },

          path: {
            color: "#00ff00",
            width: 1,
            opacity: 0.5,
          },
          popup: `${satelliteModel.noradID}`,
        });

        satelliteLayer.addGraphic(satelliteGraphic);

        const graphicPosition = new mars3d.graphic.PolylinePrimitive({
          positions: new mars3d.Cesium.CallbackProperty((time) => {
            const satPosition = satelliteGraphic.position?.getValue(time);
            if (!satPosition) {
              return [];
            }
            const cartographic = mars3d.Cesium.Cartographic.fromCartesian(satPosition);

            const groundPosition = mars3d.Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height - 1000);

            return [satPosition, groundPosition];
          }, false),
          style: {
            width: 2,
            color: "#ff0000",
            opacity: 0.7,
            arcType: mars3d.Cesium.ArcType.NONE,
            clampToGround: false,
          },
        });

        satellitePathLayer.addGraphic(graphicPosition);

        graphicPosition.entity.polyline.arcType = Cesium.ArcType.NONE;
      });
    },

    initDmzLayer() {
      const arr = [
        {
          name: "西安",
          radius: 1500000,
          point: [108.938314, 34.345614, 342.9],
        },
        {
          name: "喀什",
          radius: 1800000,
          point: [75.990372, 39.463507, 1249.5],
        },
        { name: "文昌", radius: 1200000, point: [110.755151, 19.606573, 21.1] },
      ];

      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        // 地面站gltf模型
        const graphic = new mars3d.graphic.ModelEntity({
          name: "地面站模型",
          position: item.point,
          style: {
            url: "assets/gltf/leida.glb",
            heading: 270,
            scale: 30,
            minimumPixelSize: 40,
          },
          popup: item.name,
        });
        dmzLayer.addGraphic(graphic);

        const dmfwGraphic = new mars3d.graphic.CircleEntity({
          name: item.name,
          position: item.point,
          style: {
            radius: item.radius,
            color: "#ff0000",
            opacity: 0.3,
          },
          popup: item.name,
        });
        dmzLayer.addGraphic(dmfwGraphic);

        // 判断时会用到的变量
        dmfwGraphic._isFW = true;
        dmfwGraphic._lastInPoly = {};
      }
    },

    /**
     * 判断卫星是否进入地面站的通信范围内
     * @param {*} graphic
     * */
    processInArea(graphic) {
      const position = graphic.position;
      if (!position) {
        return;
      }

      dmzLayer.eachGraphic((dmzGraphic) => {
        if (!dmzGraphic._isFW) {
          return;
        }

        dmzGraphic._lastInPoly[graphic.id] = dmzGraphic._lastInPoly[graphic.id] || {};
        const lastState = dmzGraphic._lastInPoly[graphic.id];

        const thisIsInPoly = dmzGraphic.isInPoly(position);

        // console.log(lastState.state, thisIsInPoly);

        if (thisIsInPoly !== lastState.state) {
          if (thisIsInPoly) {
            // console.log(`卫星${graphic.id}进入地面站${dmzGraphic.name}的覆盖范围`);

            const line = new mars3d.graphic.PolylineEntity({
              positions: new mars3d.Cesium.CallbackProperty(() => {
                const pt1 = graphic.position;
                const pt2 = dmzGraphic.position;
                if (pt1 && pt2) {
                  return [pt1, pt2];
                }
                return [];
              }, false),
              style: {
                color: "#00ff00",
                opacity: 0.5,
                width: 1,
                outline: false,
              },
            });
            satellitePathLayer.addGraphic(line);
            lastState.line = line;
            graphic.coneShow = true;
          } else {
            // console.log(`卫星${graphic.id}离开地面站${dmzGraphic.name}的覆盖范围`);

            if (lastState.line) {
              satellitePathLayer.removeGraphic(lastState.line);
              delete lastState.line;
            }

            graphic.coneShow = false;
          }

          dmzGraphic._lastInPoly[graphic.id].state = thisIsInPoly;
        }
      });
    },
    /**
     * 判断卫星之间是否具备通信能力
     * @param {*} graphic
     * */
    processSatsLinks(graphic) {
      // console.log(`${graphic.name}的卫星链路`);
      // console.log(satelliteLayer.getGraphics());

      // TODO 处理卫星间链路
      satelliteLayer.eachGraphic((otherGraphic) => {
        if (otherGraphic.id === graphic.id || !graphic._isSate || !otherGraphic._isSate) {
          return;
        }

        graphic._sateLinks[otherGraphic.id] = graphic._sateLinks[otherGraphic.id] || {};
        const lastState = graphic._sateLinks[otherGraphic.id];

        // 计算两卫星间距离
        const pos1 = graphic.position;
        const pos2 = otherGraphic.position;

        // console.log(graphic.entity.position.getValue(globalViewer.clock.currentTime));

        // const graphicPosition1 = mars3d.LngLatPoint.fromCartesian(pos1);

        if (!pos1 || !pos2) {
          return;
        }

        const distance = mars3d.Cesium.Cartesian3.distance(pos1, pos2);

        // TODO 根据距离判断是否具备通信能力，距离阈值可配置
        if (10 < distance && distance < 1500 * 1000) {
          if (lastState.state) {
            // console.log(`卫星${graphic.id}和卫星${otherGraphic.id}通信链路已存在`);
            return;
          }
          // console.log(`卫星${graphic.id}和卫星${otherGraphic.id}具备通信能力，距离是${distance}米`);
          const id = `link-${graphic.id}-${otherGraphic.id}`;

          const linkGraphic = new mars3d.graphic.PolylineEntity({
            id: id,
            positions: new mars3d.Cesium.CallbackProperty(() => {
              const pt1 = graphic.position;
              const pt2 = otherGraphic.position;

              // const graphicPosition2 = mars3d.LngLatPoint.fromCartesian(pt1);
              // console.log("position1", graphic.name, graphicPosition1.lng, graphicPosition1.lat, graphicPosition1.alt);
              // console.log("position2", graphic.name, graphicPosition2.lng, graphicPosition2.lat, graphicPosition2.alt);
              if (pt1 && pt2) {
                return [pt1, pt2];
              }
              return [];
            }, false),
            style: {
              width: 2,
              color: "#ff0000",
            },
          });
          satelliteLayer.addGraphic(linkGraphic);
          lastState.linkGraphic = linkGraphic;
          lastState.state = true;
        } else {
          lastState.linkGraphic && satelliteLayer.removeGraphic(lastState.linkGraphic);
          lastState.state = false;
        }
      });
    },

    removeGraphicById(graphicLayer, id) {
      const graphic = graphicLayer.getGraphicById(id);
      if (!graphic) return;
      graphicLayer.removeGraphic(graphic);
    },
    removeSatelliteById(id) {
      const sateGraphic = satelliteLayer.getGraphicById(id);
      const pathGraphic = satelliteLayer.getGraphicById(`${id}-path`);
      if (pathGraphic) satelliteLayer.removeGraphic(pathGraphic);
      if (sateGraphic) satelliteLayer.removeGraphic(sateGraphic);
    },

    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("satelliteTreePlugin");
    },
  },
};
</script>

<style lang="scss" scoped>
.satellite {
  width: 100%;
  height: 100%;
}
</style>
