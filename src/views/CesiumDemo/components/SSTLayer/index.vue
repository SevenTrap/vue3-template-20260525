<template>
  <aircas-panel v-show="sstLayer" :title="elementConfig.elementName" width="400px" height="360px" @close="handlePanelClose">
    <div class="element-config-item">
      <label>来源产品:</label>
      <span>{{ elementConfig.productName }}</span>
    </div>

    <div class="element-config-item">
      <label>来源课题:</label>
      <span>{{ elementConfig.source }}</span>
    </div>

    <div class="element-config-item">
      <label>当前层级</label>
      <span>{{ queryOptions.level }}</span>
    </div>

    <div class="element-config-item">
      <label for="">采样间隔</label>
      <AircasRadioGroup :radioGroupArr="elementConfig.sampleArr" :selectedRadio="selectedSample" type="sample" @changeOption="handleChangeOption" />
    </div>

    <div class="element-config-item">
      <label for="">渲染类型</label>
      <AircasRadioGroup :radioGroupArr="elementConfig.resultTypeArr" :selectedRadio="selectedRenderType" type="resultType" @changeOption="handleChangeOption" />
    </div>

    <div>图例</div>

    <div class="element-config-item">
      <label>最小值</label>
      <input type="number" v-model="elementConfig.minValue" />
    </div>

    <div class="element-config-item">
      <label>最大值</label>
      <input type="number" v-model="elementConfig.maxValue" />
    </div>

    <!-- 获取数据层级 -->
    <AircasDepthLevel :depthLevels="elementConfig.level" :defaultLevel="selectedLevel" @changeOption="handleChangeOption" />
  </aircas-panel>
</template>

<script>
import { mapState } from "pinia";
import { useCesiumDemoStore } from "@/store/useCesiumDemoStore.js";
import * as mars3d from "mars3d";
import * as d3 from "d3";

import { globalViewer } from "@/utils/initEarth";
import { ColoringImage } from "./utils/ColoringImage";
import { elementConfig } from "./utils/elementConfig";
import { querySSTData } from "./apis/index";

import AircasDepthLevel from "./AircasDepthLevel.vue";
import AircasRadioGroup from "./AircasRadioGroup.vue";

let SSTImageLayer = null;

export default {
  name: "SSTLayer",
  components: { AircasDepthLevel, AircasRadioGroup },

  data() {
    return {
      elementConfig,

      selectedLevel: 0, // 设置的深度层级
      selectedRenderType: "nc", // 可视化渲染类型
      selectedMinValue: null, // 设置的最小温度值
      selectedMaxValue: null, // 设置的最大温度值
      selectedSample: 1, // 设置的采样间隔

      queryOptions: {
        bbox: null,
        start_time: null,
        level: null,
        sample: null,
        result_type: null,
        h3_resolution: null,
      },
      colorScale: null,
    };
  },
  computed: {
    ...mapState(useCesiumDemoStore, ["sstLayer"]),
  },
  mounted() {
    this.queryOptions.bbox = elementConfig.bboxDefault;
    this.queryOptions.start_time = elementConfig.timeSpan[0];
    this.queryOptions.level = elementConfig.levelDefault;
    this.queryOptions.sample = elementConfig.sampleDefault;
    this.queryOptions.result_type = elementConfig.resultTypeDefault;
    this.queryOptions.h3_resolution = elementConfig.h3ResolutionDefault;

    this.initColorScale();
    this.queryElementData();
  },
  methods: {
    // 关闭此插件弹窗
    handlePanelClose() {
      const cesiumDemoStore = useCesiumDemoStore();
      cesiumDemoStore.TOGGLE_COMPONENT_VISIBLE("sstLayer", false);
    },

    // 初始化d3图例函数
    initColorScale(minValue, maxValue) {
      this.colorScale = d3.scaleSequential(d3[elementConfig.colorDefault]).domain([minValue, maxValue]);
    },

    handleChangeOption(name, itemValue) {
      console.log(name, itemValue);

      switch (name) {
        case "level":
          this.selectedLevel = itemValue;
          this.queryOptions.level = itemValue;

          break;

        case "sample":
          this.selectedSample = itemValue;
          this.queryOptions.sample = itemValue;

        case "resultType":
          this.selectedRenderType = itemValue;
          this.queryOptions.result_type = itemValue;

        default:
          break;
      }

      this.queryElementData();
    },

    // 请求环境要素数据
    async queryElementData() {
      console.time("获取数据的时间");
      const elementRes = await querySSTData(this.queryOptions).then((res) => res);
      console.timeEnd("获取数据的时间");
      console.log(elementRes);

      const lats = elementRes.data.lats;
      const lons = elementRes.data.lons;
      const gridData = elementRes.data.values;
      const latsLength = elementRes.data.rows;
      const lonsLength = elementRes.data.cols;

      // 默认取第一个数据作为最小值和最大值
      let minValue = gridData[0][0];
      let maxValue = gridData[0][0];
      console.log("初始阈值: ", minValue, maxValue);

      // 计算整个数据的最大值
      console.time("计算数据阈值的时间");
      for (let latIndex = 0; latIndex < latsLength; latIndex++) {
        for (let lonIndex = 0; lonIndex < lonsLength; lonIndex++) {
          let valueIndex = gridData[latIndex][lonIndex];
          if (typeof valueIndex !== "object" && valueIndex !== 0) {
            if (valueIndex < minValue) minValue = valueIndex;

            if (valueIndex > maxValue) maxValue = valueIndex;
          }
        }
      }
      console.log("最终阈值: ", minValue, maxValue);
      console.timeEnd("计算数据阈值的时间");

      this.initColorScale(minValue, maxValue);

      this.renderDataLayer(gridData, lats, lons, latsLength, lonsLength);
    },

    renderDataLayer(gridData, lats, lons, latsLength, lonsLength) {
      console.time("renderDataLayer");

      const coloringImage = new ColoringImage(gridData, latsLength, lonsLength, this.colorScale);

      const sstImage = coloringImage.generateImage();

      // const SSTImageLayer = globalViewer.getLayer("SSTImageLayer", "name");

      if (SSTImageLayer) {
        SSTImageLayer.url = sstImage;
      } else {
        SSTImageLayer = new mars3d.layer.ImageLayer({
          name: "海水温度",
          show: true,
          url: sstImage,
          crs: "EPSG:4326",
          rectangle: {
            // lons 排列从小到大
            // lats 排列从大到小
            xmin: lons[0],
            xmax: lons[lonsLength - 1],
            ymin: lats[latsLength - 1],
            ymax: lats[0],
          },
          alpha: 1,
        });

        globalViewer.addLayer(SSTImageLayer);
      }

      console.timeEnd("renderDataLayer");
    },

    renderEchartsGL(lons, lats, depth, datas, minValue, maxValue) {
      const chartDom = document.getElementById("echartsGL");
      const myChart = echarts.init(chartDom);

      let options = {
        grid3D: {},
        visualMap: {
          show: true,
          min: minValue,
          max: maxValue,
          inRange: {
            symbolSize: [0.5, 15],
            color: ["#313695", "#4575b4", "#a50026"],
          },
        },
        xAxis3D: {
          min: lons[0],
          max: lons[lons.length - 1],
        },
        yAxis3D: {
          min: lats[0],
          max: lats[lats.length - 1],
        },
        zAxis3D: {
          min: -100,
          max: 0,
          // max: -depth[0],
          // min: -depth[depth.length - 1],
        },
        // dataset: {},
        series: [
          {
            type: "scatter3D",
            data: datas,
          },
        ],
      };

      myChart.setOption(options);
    },
  },
};
</script>

<style lang="scss" scoped>
.element-config-item {
  padding: 10px;
  color: #ffffff;
  font-size: 14px;
}
</style>
