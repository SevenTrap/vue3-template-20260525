<template>
  <div class="level-container">
    <header>
      <h2 class="name">深度</h2>
      <span class="unit">(米)</span>
    </header>

    <main>
      <div
        class="number-item"
        :class="{ selected: defaultLevel == levelItem }"
        v-for="(levelItem, index) in depthLevels"
        :key="index"
        @click="handleSelected(levelItem)"
      >
        {{ levelItem }}
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: "AircasDepthLevel",
  props: {
    defaultLevel: {
      type: [Number, String],
      required: true,
    },
    depthLevels: {
      type: Array,
      required: true,
    },
  },

  methods: {
    handleSelected(item) {
      this.$emit("changeOption", "level", item);
    },
  },
};
</script>

<style lang="scss" scoped>
.level-container {
  color: #ffffff;
  position: fixed;
  right: 20px;
  top: 100px;
  width: 100px;
  height: calc(100% - 200px);
  padding: 10px 5px;
  background-color: rgba($color: #000000, $alpha: 0.5);

  header {
    height: 35px;
    padding-bottom: 10px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    .name {
      letter-spacing: 2px;
      font-size: 18px;
      text-align: center;
    }
    .unit {
      font-size: 14px;
    }
  }

  main {
    height: calc(100% - 35px);
    overflow-y: scroll;
    -ms-overflow-style: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    .number-item {
      padding: 3px 10px;
      text-align: center;
      background-color: rgb(149, 160, 149);
      border: 1px solid #eeeeee;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background-color: rgb(195, 141, 76);
        border: 1px solid #a56363;
      }

      &.selected {
        background-color: rgb(39, 164, 41);
        border: 1px solid #2d8f7f;
      }
    }
  }
}
</style>
