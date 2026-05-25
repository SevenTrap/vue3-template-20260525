import * as d3 from "d3";

/**
 * 将格网点数据转换为图片
 * 3010*2476个格网点，渲染时间在0.12秒左右
 * @param {Array} gridData
 * @param {Object} colorConfig
 * */

export class ColoringImage {
  constructor(gridData, latsLength, lonsLength, colorScale) {
    this.gridData = gridData;
    this.colorScale = colorScale;
    this.width = lonsLength;
    this.height = latsLength;

    this.canvas = document.createElement("canvas");
    this.canvas.width = lonsLength;
    this.canvas.height = latsLength;
    this.ctx = this.canvas.getContext("2d");
  }

  // 根据网格数据生成图片
  generateImage() {
    const imageData = this.ctx.createImageData(this.width, this.height);
    const data = imageData.data;
    for (let latIndex = 0; latIndex < this.height; latIndex++) {
      for (let lonIndex = 0; lonIndex < this.width; lonIndex++) {
        const value = this.gridData[this.height - latIndex - 1][lonIndex];

        if (value === 0) {
          const index = (latIndex * this.width + lonIndex) * 4;

          data[index] = 0;
          data[index + 1] = 0;
          data[index + 2] = 0;
          data[index + 3] = 0;
        } else {
          // debugger;
          // const rgb = this.colorScale(value).rgb();
          const rgb = this.colorScale(value);
          const colorArr = d3.color(rgb);

          const index = (latIndex * this.width + lonIndex) * 4;

          // data[index] = rgb[0];
          // data[index + 1] = rgb[1];
          // data[index + 2] = rgb[2];
          // data[index + 3] = 255;

          data[index] = colorArr.r;
          data[index + 1] = colorArr.g;
          data[index + 2] = colorArr.b;
          data[index + 3] = 255;
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
    return this.canvas.toDataURL("image/png");
  }
}
