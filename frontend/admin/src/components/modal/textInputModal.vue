<script setup>

import Modal from "@/components/modal/modal.vue";
import {getCurrentInstance, nextTick, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
const props = defineProps({
  show: {type: Boolean, default: false},
  title: {type: String, required: true},
  inputTitle: {type: String, required: true},
  inputPlaceholder: {type: String, required: true},
  inputDefaultValue: {type: String, required: true},
})

const currentText = ref("");
const id = getCurrentInstance().uid;

const modalInput = ref(null)

watch(() =>props.show,async (value) => {
  if (value) {
    await nextTick();
    currentText.value = props.inputDefaultValue;
    await nextTick();
    modalInput.value.focus()
    modalInput.value.select()

  }
})

</script>

<template>
  <modal :show="show" @close="$emit('close')" @keydown.enter="$emit('confirm', currentText)">
    <template #header>
      <h3>{{title}}</h3>

    </template>
    <template #body>
      <div class="inlineFlex">
        <label :for="id">{{inputTitle}}</label>
        <input ref="modalInput" type="text" :id="id" :placeholder="inputPlaceholder" v-model="currentText" maxLength="255">
      </div>
    </template>

    <template #footer>
      <div class="inlineFlex flexRight">
        <button-view :text="$t('textInputModal.cancelButton')" @click="$emit('close')"></button-view>
        <filled-button-view :text="$t('textInputModal.confirmButton')" @click="$emit('confirm', currentText)"></filled-button-view>
      </div>
    </template>
  </modal>
</template>

<style scoped>
.inlineFlex{
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 8px;
}

.flexRight{
  justify-content: flex-end;
}

.flexRight button{
  margin-left: 8px;
}

label{
  margin-right: 16px;
  font-weight: 500;
  width: fit-content;
}

input{
  width: auto;
  flex-grow: 1;

  color: var(--textImportantColor);
  border: solid 1px var(--darkerBackgroundColor);
  background: none;
  padding: 4px;
  border-radius: 4px;
  margin-right: 4px;
  font-size: 16px;
  field-sizing: content;
  user-select: all;
}

input:focus{
  background-color: var(--darkerBackgroundColor);
  outline-color: var(--accentColor);

}

</style>
