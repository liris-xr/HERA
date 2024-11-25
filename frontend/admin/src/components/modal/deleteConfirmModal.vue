<script setup>
import Modal from "@/components/modal/modal.vue";
import ButtonView from "@/components/button/buttonView.vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
const props = defineProps({
  show: {type: Boolean, default: false},
  title: {type: String, required: true},
})
</script>

<template>
  <modal :show="show" @close="$emit('close')" @keydown.enter="$emit('confirm')">
    <template #header>
      <h3>{{title}}</h3>

    </template>
    <template #body>
      <slot name="body"></slot>
    </template>

    <template #footer>
      <div class="inlineFlex flexRight">
        <button-view :text="$t('deleteConfirmModal.cancelButton')" @click="$emit('close')"></button-view>
        <filled-button-view :text="$t('deleteConfirmModal.confirmButton')" @click="$emit('confirm')" theme="danger"></filled-button-view>
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

p{
  text-align: justify;
}

</style>
