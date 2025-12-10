<template>
  <div class="demo-page">
    <h1>Questionnaire</h1>

    <div class="controls">
      <div class="title-static">Questionnaire de démonstration</div>

      <div class="actions">
        <button class="btn primary" @click="visible = true">Ouvrir le popup</button>
        <button class="btn" @click="reset">Réinitialiser</button>
      </div>

      <p v-if="status" class="status">{{ status }}</p>
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
import { ref } from 'vue'
import QuestionnairePopup from '@/components/utils/QuestionnairePopup.vue'

const visible = ref(false)
const title = ref('Questionnaire de démonstration')
const status = ref('')

const demoSchema = [
  { model: 'name', label: 'Nom', type: 'string', required: true, placeholder: 'Entrez votre nom' },
  { model: 'comment', label: 'Commentaire', type: 'textarea', required: false, placeholder: 'Optionnel' }
]

function reset() {
  status.value = ''
}

function onConfirm(payload) {
  status.value = 'Confirmé'
  console.log('confirm payload', payload)
  visible.value = false
}

function onCancel() {
  status.value = 'Annulé'
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
