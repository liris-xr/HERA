<script setup>
import {nextTick, ref, watch} from "vue";

const props = defineProps({
  show: Boolean
})

const modalContainer = ref(null)
watch(() =>props.show,async (value) => {
  if (value) {
    await nextTick();
    modalContainer.value.focus()
  }
})
</script>
<template>
  <Transition name="modal">
    <div v-if="show" class="modal-mask" @mousedown="$emit('close')">
      <div ref="modalContainer" class="modal-container" @mousedown="$event.stopPropagation()" @keydown.esc="$emit('close')" tabindex="0">
        <div class="modal-header">
          <slot name="header">default header</slot>
        </div>

        <div class="modal-body">
          <slot name="body">default content</slot>
        </div>

        <div class="modal-footer">
          <slot name="footer">
            default footer
            <button
                class="modal-default-button"
                @click="$emit('close')"
            >OK</button>
          </slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(110, 125, 139, 0.32);
  backdrop-filter: blur(8px);
  display: flex;
  transition: opacity 0.3s ease;
}

.modal-container {
  min-width: 256px;
  width: fit-content;
  max-width: 80%;
  margin: auto;
  padding: 16px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  transition: all 0.3s ease;
}

.modal-container:focus-visible {
  outline:none;
}

.modal-header h3 {
  margin-top: 0;
  color: var(--textImportantColor);
  font-weight: bold;
  text-align: center;
}

.modal-body {
  margin: 20px 0;
  color: var(--textColor);
}

.modal-default-button {
  float: right;
}

.modal-enter-from {
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
  filter: blur(8px);
}
</style>
