<script setup>

import {computed, ref} from "vue";
import {useI18n} from "vue-i18n";

const {t} = useI18n()

const props = defineProps({
  title: {type: String, required: true},
  sectionName: {type: String, required: true},
  fields: {type: Array},
  subject: {type: Object},
})

const fieldRefs = ref({})

defineEmits(['confirm', 'cancel'])

const inputType = (field) => {
  if(field.type === "boolean")
    return "checkbox"
  return field.type
}

function handleFile(event, fieldName) {
  const file = event.target.files[0]
  if(file)
    props.subject[fieldName] = file
}

function validateFields() {
  let ok = true;

  console.log(fieldRefs.value)

  for(const field of props.fields) {
    const elem = fieldRefs.value[field.name];

    if(field.required && !elem.value) {
      ok = false;
      elem.classList.add("error")
      elem.setCustomValidity(t("admin.required"))
      elem.reportValidity()
    } else {
      elem.classList.remove("error")
    }
  }

  return ok;
}

</script>

<template>

  <div class="modal" v-if="subject">
    <div>
      <h2>{{$t(`admin.sections.${sectionName}.${title}`)}}</h2>

      <div v-for="field in fields">

        <label :for="field.name">{{$t(`admin.sections.${sectionName}.${field.name}`)}}</label>


        <textarea
            :ref="el => fieldRefs[field.name] = el"

            rows="5"
            cols="50"

            v-if="field.type==='big-text'"
            v-model="subject[field.name]"

            :name="field.name"
            :id="field.name"
            :placeholder="field?.placeholder"></textarea>

        <input
          :ref="el => fieldRefs[field.name] = el"

          v-else-if="field.type==='file'"

          type="file"

          :name="field.name"
          :id="field.name"

          :accept="field?.accept"
          @change="handleFile($event, field.name)"
          >

        <input
            :ref="el => fieldRefs[field.name] = el"

            v-else
            v-model="subject[field.name]"

            :name="field.name"
            :id="field.name"
            :type="inputType(field)"
            :placeholder="field?.placeholder">

      </div>

      <slot></slot>

      <div>
        <button @click="validateFields() && $emit('confirm')">Confirmer</button>
      </div>
      <div>
        <button @click="$emit('cancel')">Annuler</button>
      </div>
    </div>
  </div>

</template>

<style scoped>

.error {
  border-color: var(--dangerColor);
}

</style>