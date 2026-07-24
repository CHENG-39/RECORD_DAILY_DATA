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
    desc: '每克蛋白质对应的磷含量（mg/g）。该比值越低，说明摄入蛋白质时带入的磷越少，可作为慢病营养管理中的参考。',
    source: 'Noori, Kalantar-Zadeh 等 (2010, CJASN): P/Pro ≥ 16 mg/g 时透析患者死亡风险翻倍 (HR=1.99)',
  },
  {
    term: '生物可利用磷（过滤磷）',
    desc: '经过肠道吸收后实际进入血液的磷。不同食物的磷吸收率差异很大——动物性食物约 60%，植物性仅 30-40%。慢病管理模式将此值用于提示记录中的磷负荷。',
    source: 'Karp et al. (2007); Moe et al. (2011, CJASN); St-Jules et al. (2017, JRN)',
  },
  {
    term: '磷吸收率',
    desc: '该餐食物中磷被肠道吸收进入血液的比例（%）。肉类 ~60%、乳制品 ~50%、主食 ~40%、蔬菜水果 ~30%。加工食品中添加的无机磷酸盐吸收率可达 90-100%，应尽量避免。',
    source: 'KDIGO 2024：优先选择天然食物，关注加工食品中的磷添加剂',
  },
  {
    term: 'PRAL（膳食酸负荷）',
    desc: '食物代谢后产生的净酸量（mEq）。正值 = 产酸性饮食（肉/谷为主），负值 = 产碱性饮食（蔬果为主）。在慢病营养管理中，该指标应结合个人方案解读；增加蔬果通常有助于降低饮食酸负荷。',
    source: 'Goraya, Wesson 等 (2024, ASN)：长期饮食酸负荷管理研究',
  },
  {
    term: 'KDIGO 2024',
    desc: 'KDIGO 2024 是专业临床实践指南。本应用将其中有关钾、磷、钠和蛋白质记录的原则用于慢病管理提示；实际目标必须结合个人检查结果和专业方案确定。',
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
