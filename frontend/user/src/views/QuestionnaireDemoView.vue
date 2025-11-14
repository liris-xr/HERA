<template>
  <div style="padding:24px">
    <h1>Questionnaire</h1>

    <button @click="visible = true" style="padding:8px 12px; border-radius:6px; background:#007bff; color:#fff; border:none; cursor:pointer">Ouvrir le popup</button>

    <QuestionnairePopup
      :visible="visible"
      title="Questionnaire de démonstration"
      @confirm="onConfirm"
      @cancel="onCancel"
      @update:visible="(v) => visible = v"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import QuestionnairePopup from '@/components/utils/QuestionnairePopup.vue'

const visible = ref(false)

function onConfirm() {
  console.log('Questionnaire confirmé')
  visible.value = false
}

function onCancel() {
  console.log('Questionnaire annulé')
  visible.value = false
}
</script>

<style scoped>

</style>

