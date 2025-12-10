<template>
  <form class="qfs" @submit.prevent>
    <div v-for="field in schema" :key="field.model" class="qfs__field">
      <label class="qfs__label">{{ field.label }} <span v-if="field.required" aria-hidden="true">*</span></label>

      <input
        v-if="field.type === 'string'"
        :type="field.inputType || 'text'"
        class="qfs__input"
        :placeholder="field.placeholder || ''"
        v-model="localModel[field.model]"
      />

      <textarea
        v-else-if="field.type === 'textarea'"
        class="qfs__input qfs__textarea"
        :placeholder="field.placeholder || ''"
        v-model="localModel[field.model]"
        rows="4"
      ></textarea>

      <select
        v-else-if="field.type === 'select'"
        class="qfs__input"
        v-model="localModel[field.model]"
      >
        <option value="" disabled hidden>{{ field.placeholder || 'Choisir' }}</option>
        <option v-for="opt in field.options || []" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>

      <div v-else-if="field.type === 'checkbox'" class="qfs__checkbox">
        <input type="checkbox" v-model="localModel[field.model]" />
        <span class="qfs__checkbox-label">{{ field.checkboxLabel || field.label }}</span>
      </div>

      <p v-if="field.help" class="qfs__help">{{ field.help }}</p>
    </div>
  </form>
</template>

<script setup>
import { toRefs, reactive, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  schema: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'validity'])

const { schema } = toRefs(props)

// Local copy to avoid mutating parent without emitting
const localModel = reactive({})

function initModel() {
  // Initialize fields if not present
  (schema.value || []).forEach(f => {
    if (!(f.model in localModel)) {
      // copy from modelValue if present
      localModel[f.model] = props.modelValue[f.model] ?? (f.type === 'checkbox' ? false : '')
    }
  })
}

initModel()

// Sync parent -> local when modelValue changes
watch(() => props.modelValue, (nv) => {
  Object.keys(nv || {}).forEach(k => { localModel[k] = nv[k] })
})

// Emit local -> parent on change
watch(localModel, (nv) => {
  // build plain object
  const out = {}
  for (const k in nv) out[k] = nv[k]
  emit('update:modelValue', out)
  // validity: required fields non-empty
  const valid = (schema.value || []).every(f => {
    if (!f.required) return true
    const val = out[f.model]
    if (f.type === 'checkbox') return !!val
    return val !== undefined && val !== null && String(val).trim() !== ''
  })
  emit('validity', valid)
}, { deep: true, immediate: true })
</script>

<style scoped>
.qfs{ display:flex; flex-direction:column; gap:12px; }
.qfs__field{ display:flex; flex-direction:column; }
.qfs__label{ font-size:13px; color:#0f172a; margin-bottom:6px; }
.qfs__input{ padding:10px 12px; border-radius:8px; border:1px solid rgba(15,23,42,0.06); font-size:14px; }
.qfs__textarea{ resize:vertical; }
.qfs__help{ margin:6px 0 0; font-size:12px; color:rgba(15,23,42,0.6); }
.qfs__checkbox{ display:flex; gap:8px; align-items:center; }
.qfs__checkbox-label{ font-size:14px; }
</style>
