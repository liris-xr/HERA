// Liens vers la page demo : https://localhost:8082/viewer/questionnaire-demo
<script setup>
import { watch, ref, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: 'Votre avis compte !' },
  confirmLabel: { type: String, default: null },
  cancelLabel: { type: String, default: null },
  disableConfirm: { type: Boolean, default: false },
  schema: { type: Array, default: () => [] },
  quitMessage: { type: String, default: '' },
  quitUrl: { type: String, default: '' }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible', 'update:modelValue'])

const formData = ref({})
const isValid = ref(false)

const modalRef = ref(null)
let previousActive = null

const DEFAULT_QUIT_URL = 'https://www.youtube.com/'

function onConfirm() {
  if (props.disableConfirm) return
  const targetUrl = props.quitUrl || DEFAULT_QUIT_URL
  if (targetUrl) {
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }
  emit('confirm', formData.value)
  emit('update:visible', false)
}

function onCancel() {
  emit('cancel')
  emit('update:visible', false)
}

function handleKey(e) {
  if (!props.visible) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    onCancel()
  }
  if (e.key === 'Tab' && modalRef.value) {
    const focusable = modalRef.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

function onOverlayClick(e) {
  if (e.target === e.currentTarget) onCancel()
}

watch(() => props.visible, async (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
  if (v) {
    previousActive = document.activeElement
    await nextTick()
    if (modalRef.value) {
      const focusable = modalRef.value.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      ;(focusable[0] || modalRef.value).focus()
    }
    window.addEventListener('keydown', handleKey)
  } else {
    window.removeEventListener('keydown', handleKey)
    try { previousActive && previousActive.focus() } catch (e) {}
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKey)
  document.body.style.overflow = ''
})

function onValidity(v) {
  isValid.value = !!v
}

function onModelUpdate(v) {
  formData.value = { ...(v || {}) }
  emit('update:modelValue', formData.value)
}
</script>

<template>
  <transition name="overlay-fade">
    <div
      v-show="visible"
      class="overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click="onOverlayClick"
    >
      <transition name="modal-scale">
        <div class="modal" ref="modalRef" role="document">
          <header class="modal__header">
            <h3 class="modal__title">{{ title }}</h3>
          </header>

          <main class="modal__body">
            <!-- Message : valeur par défaut si vide -->
            <div class="q-block">
              <p class="q-value">
                {{ quitMessage || 'Vous allez être redirigé vers un questionnaire externe.' }}
              </p>
            </div>
            <div class="q-block">
              <label class="q-label">URL de redirection</label>
              <p class="q-value">
                {{ quitUrl || 'https://www.youtube.com/' }}
              </p>
            </div>
          </main>

          <footer class="modal__footer">
            <button class="btn btn--secondary" @click="onCancel">
              {{ cancelLabel || ($t ? $t('projectView.arView.questionnairePopup.cancel') : 'Fermer') }}
            </button>
            <button
              class="btn btn--primary"
              :disabled="props.disableConfirm"
              :aria-disabled="props.disableConfirm ? 'true' : 'false'"
              @click="onConfirm"
            >
              {{ confirmLabel || ($t ? $t('projectView.arView.questionnairePopup.confirm') : 'Ouvrir le questionnaire') }}
            </button>
          </footer>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.overlay{
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 58, 80, 0.35);
  z-index: 2000;
  padding: 16px;
}

.modal{
  width: 100%;
  max-width: 560px;
  background: var(--backgroundColor);
  border-radius: 14px;
  box-shadow: var(--defaultUniformShadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal__header{
  padding: 18px 20px 12px;
  border-bottom: 1px solid rgba(34, 58, 80, 0.08);
}

.modal__title{
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--textImportantColor);
}

.modal__body{
  padding: 16px 20px 12px;
  min-height: 120px;
  max-height: 70vh;
  overflow: auto;
}

.modal__footer{
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(34, 58, 80, 0.06);
  justify-content: flex-end;
  display:flex;
  gap:10px;
}

.btn{
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight:600;
  font-size: 14px;
  transition: background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, transform 0.08s ease;
}

.btn--primary{
  background: var(--accentColor);
  color: #fff;
  box-shadow: 0 4px 10px rgba(63, 155, 240, 0.35);
}

.btn--primary:hover:not([disabled]):not([aria-disabled='true']){
  background: #3187d6;
  transform: translateY(-1px);
}

.btn--primary[disabled], .btn--primary[aria-disabled='true']{
  opacity:0.6;
  cursor:not-allowed;
  box-shadow: none;
}

.btn--secondary{
  background: transparent;
  color: var(--textImportantColor);
  border: 1px solid rgba(34, 58, 80, 0.15);
}

.btn--secondary:hover{
  background: rgba(229, 231, 232, 0.6);
}

.q-block{ margin-bottom:12px; }
.q-label{ display:block; font-size:13px; font-weight:600; color:var(--textImportantColor); margin-bottom:4px; }
.q-value{ margin:0; padding:9px 11px; border-radius:10px; background:#F5F7F9; font-size:14px; color:var(--textColor); word-break:break-word; }

/* Animations cohérentes avec le reste de l’UI */
.overlay-fade-enter-active,
.overlay-fade-leave-active{
  transition: opacity 0.18s ease-out;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to{
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active{
  transition: opacity 0.18s ease-out, transform 0.18s ease-out;
}
.modal-scale-enter-from,
.modal-scale-leave-to{
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
</style>