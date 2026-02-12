<template>
  <div class="demo-page">
    <h1>{{ $t ? $t('projectView.arView.questionnairePopup.title') : 'Questionnaire popup' }}</h1>

    <div class="controls">
      <div class="actions">
        <button class="btn primary" @click="visible = true">
          {{ $t ? $t('projectView.arView.questionnairePopup.confirm') : 'Open the questionnaire' }}
        </button>
      </div>
    </div>

    <QuestionnairePopup
      v-model:visible="visible"
      :title="title"
      :schema="demoSchema"
      @confirm="onConfirm"
      @cancel="onCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import QuestionnairePopup from '@/components/utils/QuestionnairePopup.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const visible = ref(false)
const title = computed(() => t('projectView.arView.questionnairePopup.title'))
const status = ref('')

const demoSchema = [
  { model: 'name', label: t('questionnaireDemo.nameLabel'), type: 'string', required: true, placeholder: t('questionnaireDemo.namePlaceholder') },
  { model: 'comment', label: t('questionnaireDemo.commentLabel'), type: 'textarea', required: false, placeholder: t('questionnaireDemo.commentPlaceholder') }
]

function reset() {
  status.value = ''
}

function onConfirm(payload) {
  status.value = t('questionnaireDemo.confirmed')
  console.log('confirm payload', payload)
  visible.value = false
}

function onCancel() {
  status.value = t('questionnaireDemo.cancelled')
  visible.value = false
}
</script>

<style scoped>
.demo-page{ padding:20px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial; }
.title-static{ font-size:16px; font-weight:600; margin-bottom:8px; }
.actions{ display:flex; gap:8px; margin-bottom:8px; }
.btn{ padding:8px 12px; border-radius:8px; border:0; cursor:pointer; }
.btn.primary{ background: linear-gradient(90deg,#2563eb,#1d4ed8); color:#fff }
.status{ margin-top:8px; color:#0f5132; background:#d1fae5; padding:6px 8px; border-radius:6px; display:inline-block }
</style>
