<template>
  <aircas-panel v-show="historyCasePlugin" title="历史案例" width="980" height="620" top="120" left="calc(50% - 490px)" @close="handlePanelClose">
    <div class="history-case-panel">
      <div v-if="noticeText" class="notice" :class="`notice-${noticeType}`">{{ noticeText }}</div>

      <div class="toolbar">
        <div class="search-area">
          <input v-model.trim="searchKeyword" class="native-input search-input" type="text" placeholder="请输入场景名称/案例名称" @keyup.enter="handleSearch" />
          <button class="native-button primary" type="button" @click="handleSearch">检索</button>
          <button class="native-button" type="button" @click="handleResetSearch">重置</button>
        </div>

        <button class="native-button primary" type="button" @click="handleAddScene">新增场景</button>
      </div>

      <div class="table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>案例名称</th>
              <th>主星</th>
              <th>从星</th>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>操作</th>
              <th>场景管理</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pagedCaseList" :key="item.id">
              <td :title="item.caseName">{{ item.caseName }}</td>
              <td :title="item.mainSatellite">{{ item.mainSatellite }}</td>
              <td :title="item.slaveSatellite">{{ item.slaveSatellite }}</td>
              <td>{{ item.startTime }}</td>
              <td>{{ item.endTime }}</td>
              <td>
                <button class="text-button" type="button" @click="handleSummaryImage(item)">总结图</button>
              </td>
              <td>
                <div class="manage-actions">
                  <button class="text-button" type="button" @click="handleViewDetail(item)">详情</button>
                  <button class="text-button" type="button" @click="handleEditScene(item)">编辑</button>
                  <button class="text-button danger" type="button" @click="handleDeleteScene(item)">删除</button>
                </div>
              </td>
            </tr>

            <tr v-if="pagedCaseList.length === 0">
              <td class="empty-cell" colspan="7">暂无历史案例数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="pagination-info">共 {{ filteredCaseList.length }} 条，每页</div>
        <select v-model.number="pageSize" class="native-select" @change="handlePageSizeChange">
          <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
        </select>
        <span>条</span>

        <button class="page-button" type="button" :disabled="currentPage <= 1" @click="handlePageChange(currentPage - 1)">上一页</button>
        <button
          v-for="page in pageNumbers"
          :key="page"
          class="page-button"
          :class="{ active: currentPage === page }"
          type="button"
          @click="handlePageChange(page)"
        >
          {{ page }}
        </button>
        <button class="page-button" type="button" :disabled="currentPage >= totalPages" @click="handlePageChange(currentPage + 1)">下一页</button>
      </div>
    </div>

    <div v-if="dialogVisible" class="dialog-mask" @click.self="handleCloseDialog">
      <div class="native-dialog">
        <div class="dialog-header">
          <div class="dialog-title">{{ dialogTitle }}</div>
          <button class="dialog-close" type="button" @click="handleCloseDialog">×</button>
        </div>

        <div v-if="dialogMode === 'detail'" class="detail-content">
          <div class="detail-item">
            <span>案例名称</span>
            <strong>{{ currentCase.caseName }}</strong>
          </div>
          <div class="detail-item">
            <span>主星</span>
            <strong>{{ currentCase.mainSatellite }}</strong>
          </div>
          <div class="detail-item">
            <span>从星</span>
            <strong>{{ currentCase.slaveSatellite }}</strong>
          </div>
          <div class="detail-item">
            <span>开始时间</span>
            <strong>{{ currentCase.startTime }}</strong>
          </div>
          <div class="detail-item">
            <span>结束时间</span>
            <strong>{{ currentCase.endTime }}</strong>
          </div>
        </div>

        <form v-else class="case-form" @submit.prevent="handleSaveScene">
          <label class="form-item">
            <span>案例名称</span>
            <input v-model.trim="caseForm.caseName" class="native-input" type="text" placeholder="请输入案例名称" />
          </label>
          <label class="form-item">
            <span>主星</span>
            <input v-model.trim="caseForm.mainSatellite" class="native-input" type="text" placeholder="请输入主星" />
          </label>
          <label class="form-item">
            <span>从星</span>
            <input v-model.trim="caseForm.slaveSatellite" class="native-input" type="text" placeholder="请输入从星" />
          </label>
          <label class="form-item">
            <span>开始时间</span>
            <input v-model="caseForm.startTime" class="native-input" type="datetime-local" />
          </label>
          <label class="form-item">
            <span>结束时间</span>
            <input v-model="caseForm.endTime" class="native-input" type="datetime-local" />
          </label>
        </form>

        <div class="dialog-footer">
          <button class="native-button" type="button" @click="handleCloseDialog">取消</button>
          <button v-if="dialogMode !== 'detail'" class="native-button primary" type="button" @click="handleSaveScene">保存</button>
        </div>
      </div>
    </div>
  </aircas-panel>
</template>

<script>
import { mapState } from "pinia";
import { useGeoMapStore } from "@/store/useGeoMapStore";

const geoMapStore = useGeoMapStore();

/**
 * @description 创建空历史案例表单
 * @returns {Object} 历史案例表单对象
 */
const createEmptyCaseForm = () => ({
  id: "",
  caseName: "",
  mainSatellite: "",
  slaveSatellite: "",
  startTime: "",
  endTime: "",
});

/**
 * @description 转换 datetime-local 值为页面展示文本
 * @param {string} value - datetime-local 表单值
 * @returns {string} 页面展示时间
 */
const formatDateTimeText = (value) => {
  if (!value) return "";
  return value.replace("T", " ");
};

export default {
  name: "HistoryCasePlugin",
  data() {
    return {
      searchKeyword: "",
      appliedKeyword: "",
      currentPage: 1,
      pageSize: 6,
      pageSizeOptions: [6, 8, 10],
      dialogVisible: false,
      dialogMode: "add",
      currentCase: createEmptyCaseForm(),
      caseForm: createEmptyCaseForm(),
      noticeText: "",
      noticeType: "info",
      noticeTimer: null,
      caseList: [
        {
          id: 1,
          caseName: "GEO近距离伴飞案例",
          mainSatellite: "中星-10",
          slaveSatellite: "实践-21",
          startTime: "2026-02-04 08:00",
          endTime: "2026-02-04 12:30",
        },
        {
          id: 2,
          caseName: "同步轨道抵近观测案例",
          mainSatellite: "天链二号",
          slaveSatellite: "高分十三号",
          startTime: "2026-02-05 09:20",
          endTime: "2026-02-05 14:40",
        },
        {
          id: 3,
          caseName: "东西向漂移监测案例",
          mainSatellite: "北斗GEO-3",
          slaveSatellite: "风云四号",
          startTime: "2026-02-06 06:10",
          endTime: "2026-02-06 11:50",
        },
        {
          id: 4,
          caseName: "轨道面交会风险案例",
          mainSatellite: "亚太6D",
          slaveSatellite: "通信技术试验卫星",
          startTime: "2026-02-07 10:00",
          endTime: "2026-02-07 15:30",
        },
        {
          id: 5,
          caseName: "光照角突变分析案例",
          mainSatellite: "实践二十号",
          slaveSatellite: "中星-16",
          startTime: "2026-02-08 13:15",
          endTime: "2026-02-08 18:45",
        },
        {
          id: 6,
          caseName: "定点经度偏移案例",
          mainSatellite: "天通一号",
          slaveSatellite: "银河航天试验星",
          startTime: "2026-02-09 07:35",
          endTime: "2026-02-09 12:05",
        },
        {
          id: 7,
          caseName: "主从星相对距离案例",
          mainSatellite: "中星-6E",
          slaveSatellite: "中星-9B",
          startTime: "2026-02-10 08:45",
          endTime: "2026-02-10 16:20",
        },
        {
          id: 8,
          caseName: "轨道高度差评估案例",
          mainSatellite: "鑫诺二号",
          slaveSatellite: "遥感三十号",
          startTime: "2026-02-11 05:30",
          endTime: "2026-02-11 10:15",
        },
        {
          id: 9,
          caseName: "异常接近复盘案例",
          mainSatellite: "中星-1A",
          slaveSatellite: "实践十七号",
          startTime: "2026-02-12 12:00",
          endTime: "2026-02-12 19:30",
        },
        {
          id: 10,
          caseName: "长时段跟踪分析案例",
          mainSatellite: "风云四号B",
          slaveSatellite: "实践二十三号",
          startTime: "2026-02-13 09:00",
          endTime: "2026-02-13 20:00",
        },
      ],
    };
  },
  computed: {
    ...mapState(useGeoMapStore, ["historyCasePlugin"]),

    filteredCaseList() {
      const keyword = this.appliedKeyword.trim().toLowerCase();
      if (!keyword) return this.caseList;

      return this.caseList.filter((item) => {
        return item.caseName.toLowerCase().includes(keyword);
      });
    },

    totalPages() {
      return Math.max(Math.ceil(this.filteredCaseList.length / this.pageSize), 1);
    },

    pageNumbers() {
      return Array.from({ length: this.totalPages }, (_, index) => index + 1);
    },

    pagedCaseList() {
      const safePage = Math.min(this.currentPage, this.totalPages);
      const startIndex = (safePage - 1) * this.pageSize;
      return this.filteredCaseList.slice(startIndex, startIndex + this.pageSize);
    },

    dialogTitle() {
      const titleMap = {
        add: "新增场景",
        edit: "编辑场景",
        detail: "场景详情",
      };
      return titleMap[this.dialogMode] || "历史案例";
    },
  },
  beforeUnmount() {
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
    }
  },
  methods: {
    /**
     * @description 关闭历史案例插件面板
     * @returns {void}
     */
    handlePanelClose() {
      geoMapStore.SET_COMPONENT_VISIBLE_FALSE("historyCasePlugin");
    },

    /**
     * @description 根据案例名称检索历史案例
     * @returns {void}
     */
    handleSearch() {
      this.appliedKeyword = this.searchKeyword;
      this.currentPage = 1;
    },

    /**
     * @description 重置历史案例检索条件
     * @returns {void}
     */
    handleResetSearch() {
      this.searchKeyword = "";
      this.appliedKeyword = "";
      this.currentPage = 1;
    },

    /**
     * @description 切换当前分页页码
     * @param {number} page - 目标页码
     * @returns {void}
     */
    handlePageChange(page) {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
    },

    /**
     * @description 修改每页显示条数
     * @returns {void}
     */
    handlePageSizeChange() {
      this.currentPage = 1;
    },

    /**
     * @description 打开新增场景弹窗
     * @returns {void}
     */
    handleAddScene() {
      this.dialogMode = "add";
      this.caseForm = createEmptyCaseForm();
      this.dialogVisible = true;
    },

    /**
     * @description 打开场景详情弹窗
     * @param {Object} item - 历史案例数据
     * @returns {void}
     */
    handleViewDetail(item) {
      this.dialogMode = "detail";
      this.currentCase = { ...item };
      this.dialogVisible = true;
    },

    /**
     * @description 打开编辑场景弹窗
     * @param {Object} item - 历史案例数据
     * @returns {void}
     */
    handleEditScene(item) {
      this.dialogMode = "edit";
      this.caseForm = {
        ...item,
        startTime: item.startTime.replace(" ", "T"),
        endTime: item.endTime.replace(" ", "T"),
      };
      this.dialogVisible = true;
    },

    /**
     * @description 删除历史案例
     * @param {Object} item - 历史案例数据
     * @returns {void}
     */
    handleDeleteScene(item) {
      const confirmed = window.confirm(`确认删除「${item.caseName}」吗？`);
      if (!confirmed) return;

      this.caseList = this.caseList.filter((caseItem) => caseItem.id !== item.id);

      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }

      this.showNotice("删除成功", "success");
    },

    /**
     * @description 保存新增或编辑后的历史案例
     * @returns {void}
     */
    handleSaveScene() {
      if (!this.validateCaseForm()) return;

      if (this.dialogMode === "add") {
        const maxId = this.caseList.reduce((id, item) => Math.max(id, item.id), 0);
        this.caseList.unshift({
          ...this.caseForm,
          id: maxId + 1,
          startTime: formatDateTimeText(this.caseForm.startTime),
          endTime: formatDateTimeText(this.caseForm.endTime),
        });
        this.currentPage = 1;
        this.showNotice("新增场景成功", "success");
      }

      if (this.dialogMode === "edit") {
        this.caseList = this.caseList.map((item) => {
          if (item.id !== this.caseForm.id) return item;
          return {
            ...this.caseForm,
            startTime: formatDateTimeText(this.caseForm.startTime),
            endTime: formatDateTimeText(this.caseForm.endTime),
          };
        });
        this.showNotice("编辑场景成功", "success");
      }

      this.handleCloseDialog();
    },

    /**
     * @description 校验历史案例表单
     * @returns {boolean} 表单是否校验通过
     */
    validateCaseForm() {
      const requiredFields = [
        { key: "caseName", label: "案例名称" },
        { key: "mainSatellite", label: "主星" },
        { key: "slaveSatellite", label: "从星" },
        { key: "startTime", label: "开始时间" },
        { key: "endTime", label: "结束时间" },
      ];

      for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!this.caseForm[field.key]) {
          this.showNotice(`请输入${field.label}`, "warning");
          return false;
        }
      }

      if (new Date(this.caseForm.startTime).getTime() > new Date(this.caseForm.endTime).getTime()) {
        this.showNotice("开始时间不能晚于结束时间", "warning");
        return false;
      }

      return true;
    },

    /**
     * @description 关闭历史案例弹窗
     * @returns {void}
     */
    handleCloseDialog() {
      this.dialogVisible = false;
      this.currentCase = createEmptyCaseForm();
      this.caseForm = createEmptyCaseForm();
    },

    /**
     * @description 处理总结图操作
     * @param {Object} item - 历史案例数据
     * @returns {void}
     */
    handleSummaryImage(item) {
      this.showNotice(`「${item.caseName}」总结图功能待接入`, "info");
    },

    /**
     * @description 显示组件内原生提示信息
     * @param {string} message - 提示文案
     * @param {string} type - 提示类型
     * @returns {void}
     */
    showNotice(message, type = "info") {
      this.noticeText = message;
      this.noticeType = type;

      if (this.noticeTimer) {
        clearTimeout(this.noticeTimer);
      }

      this.noticeTimer = setTimeout(() => {
        this.noticeText = "";
        this.noticeTimer = null;
      }, 2200);
    },
  },
};
</script>

<style lang="scss" scoped>
.history-case-panel {
  position: relative;
  width: 100%;
  height: 100%;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.notice {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  min-width: 180px;
  padding: 8px 16px;
  border-radius: 3px;
  text-align: center;
  font-size: 13px;
  background: rgba(0, 25, 34, 0.94);
  border: 1px solid #018a87;
}

.notice-success {
  border-color: #1fc790;
  color: #b9ffe7;
}

.notice-warning {
  border-color: #d99c2b;
  color: #ffe2a8;
}

.notice-info {
  border-color: #2c9aff;
  color: #cce7ff;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.search-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.native-input,
.native-select {
  height: 30px;
  color: #fff;
  background: rgba(0, 25, 34, 0.86);
  border: 1px solid #018a87;
  border-radius: 3px;
  outline: none;
}

.native-input {
  box-sizing: border-box;
  padding: 0 10px;
}

.native-input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.native-input:focus,
.native-select:focus {
  border-color: #12c7c0;
}

.search-input {
  width: 240px;
}

.native-select {
  padding: 0 6px;
}

.native-button,
.page-button,
.text-button {
  cursor: pointer;
  color: #fff;
  border: 1px solid #018a87;
  background: rgba(0, 25, 34, 0.86);
  border-radius: 3px;
  transition: all 0.2s;
}

.native-button {
  height: 30px;
  padding: 0 14px;
}

.native-button.primary,
.page-button.active {
  background: rgba(173, 91, 24, 0.85);
  border-color: #d78339;
}

.native-button:hover,
.page-button:hover:not(:disabled),
.text-button:hover {
  border-color: #12c7c0;
  color: #bffdfa;
}

.table-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid rgba(1, 138, 135, 0.75);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}

.history-table th,
.history-table td {
  padding: 10px 8px;
  border-bottom: 1px solid rgba(1, 138, 135, 0.35);
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.history-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #00343e;
  color: #c9fffb;
  font-weight: 700;
}

.history-table tr:hover td {
  background: rgba(1, 138, 135, 0.16);
}

.manage-actions {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.text-button {
  padding: 3px 8px;
  font-size: 12px;
  background: transparent;
}

.text-button.danger {
  border-color: rgba(231, 76, 60, 0.75);
  color: #ffb0a8;
}

.empty-cell {
  height: 260px;
  color: rgba(255, 255, 255, 0.7);
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
}

.pagination-info {
  color: rgba(255, 255, 255, 0.78);
}

.page-button {
  min-width: 30px;
  height: 28px;
  padding: 0 8px;
}

.page-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.native-dialog {
  width: 460px;
  color: #fff;
  background: rgba(0, 25, 34, 0.98);
  border: 1px solid #018a87;
  box-shadow: 0 0 20px rgba(1, 138, 135, 0.35);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 42px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(1, 138, 135, 0.55);
}

.dialog-title {
  font-size: 15px;
  font-weight: 700;
}

.dialog-close {
  cursor: pointer;
  color: #fff;
  font-size: 22px;
  line-height: 1;
  border: 0;
  background: transparent;
}

.case-form,
.detail-content {
  padding: 18px;
}

.form-item,
.detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.form-item span,
.detail-item span {
  width: 86px;
  color: rgba(255, 255, 255, 0.78);
  text-align: right;
  margin-right: 12px;
}

.form-item .native-input {
  flex: 1;
}

.detail-item strong {
  flex: 1;
  min-height: 30px;
  line-height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(1, 138, 135, 0.45);
  border-radius: 3px;
  background: rgba(0, 25, 34, 0.58);
  font-weight: 400;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 18px;
}
</style>
