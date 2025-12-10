<script setup>
import { defineProps, defineEmits, watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import QuestionnaireFormSkeleton from './QuestionnaireFormSkeleton.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: 'Questionnaire' },
  confirmLabel: { type: String, default: null },
  cancelLabel: { type: String, default: null },
  disableConfirm: { type: Boolean, default: false },
  schema: { type: Array, default: () => [] }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible', 'update:modelValue'])

const formData = ref({})
const isValid = ref(false)

const modalRef = ref(null)
let previousActive = null

function onConfirm() {
  if (props.disableConfirm || !isValid.value) return
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
            <slot>
              <QuestionnaireFormSkeleton
                :schema="schema"
                v-model:modelValue="formData"
                @validity="onValidity"
                @update:modelValue="onModelUpdate"
              />
            </slot>
          </main>

          <footer class="modal__footer">
            <button class="btn btn--secondary" @click="onCancel">
              {{ cancelLabel || ($t ? $t('cancel') : 'Annuler') }}
            </button>
            <button
              class="btn btn--primary"
              :disabled="props.disableConfirm ? props.disableConfirm : !isValid"
              :aria-disabled="(props.disableConfirm ? props.disableConfirm : !isValid) ? 'true' : 'false'"
              @click="onConfirm"
            >
              {{ confirmLabel || ($t ? $t('confirm') : 'Valider') }}
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
  background: rgba(2,6,23,0.5);
  z-index: 2000;
  padding: 16px;
}

.modal{
  width: 100%;
  max-width: 560px;
  background: var(--backgroundColor, #fff);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(2,6,23,0.16);
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
  max-height: 70vh;
  overflow: auto;
}

.modal__footer{
  padding: 12px 16px;
  border-top: 1px solid rgba(0,0,0,0.06);
  justify-content: flex-end;
  display:flex;
  gap:8px;
}

.btn{
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight:600;
}

.btn--primary{
  background: var(--accentColor, #007bff);
  color: white;
}

.btn--primary[disabled], .btn--primary[aria-disabled='true']{
  opacity:0.6; cursor:not-allowed;
}

.btn--secondary{
  background: transparent;
  color: var(--textColor, #444);
  border: 1px solid rgba(0,0,0,0.04);
}
</style>

