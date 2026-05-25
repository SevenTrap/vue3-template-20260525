import { defineStore } from "pinia";
import { mockTreeData } from "../configs/index";

export const useTreeConfigsStore = defineStore("treeConfigs", {
  state: () => ({
    originalTreeData: mockTreeData,
    selectedTreeData: [],
    selectedNodeIds: [],
  }),
  getters: {},
  actions: {
    rebuildSelectedTree() {
      const buildSubtree = (nodes) => {
        const result = [];
        for (const node of nodes) {
          const isSelected = this.selectedNodeIds.includes(node.id);
          const hasChildren = node.children && node.children.length > 0;

          if (isSelected) {
            // 节点被选中：保留整个子树
            const newNode = { ...node };

            if (hasChildren) {
              newNode.children = buildSubtree(node.children);
            }

            result.push(newNode);
          } else if (hasChildren) {
            // 未选中但有子节点：递归处理子节点
            const filteredChildren = buildSubtree(node.children);

            if (filteredChildren.length > 0) {
              // 有子节点被选中，则保留当前节点作为路径
              result.push({
                ...node,
                children: filteredChildren,
              });
            }
          }
          // 否则：不保留该节点
        }
        return result;
      };

      this.selectedTreeData = buildSubtree(this.originalTreeData);
    },
    handleCheckChange(checkedKeys) {
      this.selectedNodeIds = checkedKeys;

      this.rebuildSelectedTree();
    },
  },
});
