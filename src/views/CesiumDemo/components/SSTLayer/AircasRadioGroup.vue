<template>
  <div class="aircas-radio-group">
    <div
      class="aircas-radio-button"
      :class="{ selected: radioItem.value == selectedRadio }"
      v-for="(radioItem, index) in radioGroupArr"
      :key="index"
      @click="handleChangeOption(radioItem)"
    >
      {{ radioItem.label || redioItem }}
    </div>
  </div>
</template>

<script>
export default {
  name: "AircasRadioGroup",
  props: {
    radioGroupArr: {
      type: Array,
      required: true,
    },
    selectedRadio: {
      type: [Number, String],
      required: true,
    },
    type: {
      type: String,
      required: false,
    },
  },

  methods: {
    handleChangeOption(item) {
      if (this.type) {
        item.value ? this.$emit("changeOption", this.type, item.value) : this.$emit("changeOption", this.type, item);
      } else {
        item.value ? this.$emit("changeOption", item.value) : this.$emit("changeOption", item);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.aircas-radio-group {
  display: flex;
  justify-content: flex-start;
  align-items: center;

  .aircas-radio-button {
    padding: 8px 15px;
    border: 1px solid #4c4d4f;
    border-left: 0;
    font-size: 14px;
    color: #cfd3dc;
    cursor: pointer;
    transition: all 0.3s;

    &:first-child {
      border-left: 1px solid #4c4d4f;
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
    }

    &:last-child {
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }

    &:hover {
      color: #409eff;
    }

    &.selected {
      color: #ffffff;
      background-color: #409eff;
    }
  }
}
</style>
