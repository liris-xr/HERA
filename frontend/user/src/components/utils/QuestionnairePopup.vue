<script setup>
import { defineProps, defineEmits, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: 'Questionnaire' }
});

const emit = defineEmits(['confirm', 'cancel', 'update:visible']);

function onConfirm() {
  emit('confirm');
  emit('update:visible', false);
}

function onCancel() {
  emit('cancel');
  emit('update:visible', false);
}

watch(() => props.visible, (v) => {
  document.body.style.overflow = v ? 'hidden' : '';
});
</script>

<template>
  <div v-show="visible" class="overlay" role="dialog" aria-modal="true" :aria-label="title">
    <div class="modal">
      <header class="modal__header">
        <h3 class="modal__title">{{ title }}</h3>
      </header>

      <main class="modal__body">
        <!-- Ici le formulaire sera injecté plus tard (Vue Form Generator) -->
        <p class="placeholder">Formulaire à venir...</p>
      </main>

      <footer class="modal__footer">
        <button class="btn btn--secondary" @click="onCancel">{{ $t ? $t('cancel') : 'Annuler' }}</button>
        <button class="btn btn--primary" @click="onConfirm">{{ $t ? $t('confirm') : 'Valider' }}</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.overlay{
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  z-index: 2000;
  padding: 16px;
}

.modal{
  width: 100%;
  max-width: 560px;
  background: var(--backgroundColor, #fff);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal__header{
  padding: 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.modal__title{
  margin: 0;
  font-size: 1.1rem;
  color: var(--textImportantColor, #111);
}

.modal__body{
  padding: 16px;
  min-height: 120px;
}

.placeholder{
  color: var(--textColor, #666);
  font-style: italic;
}

.modal__footer{
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(0,0,0,0.06);
  justify-content: flex-end;
}

.btn{
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}

.btn--primary{
  background: var(--accentColor, #007bff);
  color: white;
}

.btn--secondary{
  background: transparent;
  color: var(--textColor, #444);
}
</style>
