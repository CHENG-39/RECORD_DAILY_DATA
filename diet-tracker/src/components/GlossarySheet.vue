<template>
  <van-action-sheet
    v-model:show="show"
    title="术语说明"
    cancel-text="关闭"
    :close-on-click-action="false"
    :round="true"
    :style="{ maxHeight: '70vh' }"
  >
    <div class="glossary-content">
      <div v-for="item in glossaryItems" :key="item.term" class="glossary-item">
        <h4 class="g-term">{{ item.term }}</h4>
        <p class="g-desc">{{ item.desc }}</p>
        <span v-if="item.source" class="g-source">{{ item.source }}</span>
      </div>
    </div>
  </van-action-sheet>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)

function open(): void {
  show.value = true
}

defineExpose({ open })

const glossaryItems = [
  {
    term: 'P/Pro（磷蛋白比）',
    desc: '每克蛋白质对应的磷含量（mg/g）。该比值越低越好——说明摄入蛋白质的同时带入的磷越少，对 CKD 患者更友好。',
    source: 'Noori, Kalantar-Zadeh 等 (2010, CJASN): P/Pro ≥ 16 mg/g 时透析患者死亡风险翻倍 (HR=1.99)',
  },
  {
    term: '生物可利用磷（过滤磷）',
    desc: '经过肠道吸收后实际进入血液、需要肾脏过滤的磷。不同食物的磷吸收率差异很大——动物性食物约 60%，植物性仅 30-40%。肾脏模式下以此值评估磷负荷才准确。',
    source: 'Karp et al. (2007); Moe et al. (2011, CJASN); St-Jules et al. (2017, JRN)',
  },
  {
    term: '磷吸收率',
    desc: '该餐食物中磷被肠道吸收进入血液的比例（%）。肉类 ~60%、乳制品 ~50%、主食 ~40%、蔬菜水果 ~30%。加工食品中添加的无机磷酸盐吸收率可达 90-100%，应尽量避免。',
    source: 'KDIGO 2024 建议 CKD 患者优先选择天然食物，避免磷添加剂',
  },
  {
    term: 'PRAL（膳食酸负荷）',
    desc: '食物代谢后产生的净酸量（mEq）。正值 = 产酸性饮食（肉/谷为主），负值 = 产碱性饮食（蔬果为主）。CKD 时肾脏排酸能力下降，酸性代谢产物堆积会加速肾功能丧失。多吃蔬果降 PRAL 是最有效的饮食干预之一。',
    source: 'Goraya, Wesson 等 (2024, ASN) 10年RCT: 通过蔬果将 PRAL 减半，终末期肾病风险从 51.6% 降至 13.8%',
  },
  {
    term: 'KDIGO 2024',
    desc: '国际肾脏病学会 (KDIGO) 2024 年发布的慢性肾脏病 (CKD) 评估与管理临床实践指南。本 APP 的肾脏模式（养生模式）基于此指南设计，包括蛋白限制 0.8 g/kg/天、磷限制 800-1000 mg/天、建议植物性饮食为主等。',
    source: 'KDIGO 2024 CKD Guideline',
  },
]
</script>

<style scoped>
.glossary-content {
  padding: 8px 16px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.glossary-item {
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}

.glossary-item:last-child {
  border-bottom: none;
}

.g-term {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

.g-desc {
  margin: 0 0 4px;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

.g-source {
  font-size: 10px;
  color: #bbb;
  font-style: italic;
}
</style>
