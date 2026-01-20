<script setup>
import FilledButtonView from "@/components/button/filledButtonView.vue";
import ButtonView from "@/components/button/buttonView.vue";
import {useI18n} from "vue-i18n";

const { t } = useI18n()

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(["close", "confirm"])

function confirm(value) {
  emit("confirm", value)
}
</script>

<template>
  <div v-if="show" class="modal" role="dialog" aria-modal="true" @click.self="$emit('close')">
    <div class="modalCard">
      <div class="header">
        <h3>{{ t("recordUserModal.title") }}</h3>
        <button class="close" type="button" :aria-label="t('recordUserModal.close')" @click="$emit('close')">×</button>
      </div>

      <p class="body">{{ t("recordUserModal.body") }}</p>

      <div class="buttons">
        <button-view
            :text="t('recordUserModal.no')"
            @click="confirm(false)" />
        <filled-button-view
            :text="t('recordUserModal.yes')"
            @click="confirm(true)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 2000;

  display: flex;
  align-items: center;
  justify-content: center;

  background: rgba(34, 58, 80, 0.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  padding: 16px;
}

.modalCard {
  position: relative;
  width: min(560px, 100%);

  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(34, 58, 80, 0.10);
  border-radius: 18px;

  box-shadow: 0 24px 64px rgba(34, 58, 80, 0.25);

  padding: 20px 20px 16px;

  animation: popIn 140ms ease-out;
}

@keyframes popIn {
  from {
    transform: translateY(8px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.header h3 {
  color: var(--textImportantColor);
  font-weight: 700;
  margin: 0;
}

.body {
  margin-top: 10px;
  color: var(--textColor);
  line-height: 1.45;
}

.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  padding-top: 14px;
  margin-top: 12px;

  border-top: 1px solid rgba(34, 58, 80, 0.10);
}

.close {
  height: 34px;
  width: 34px;

  display: grid;
  place-items: center;

  border-radius: 10px;
  border: 1px solid rgba(34, 58, 80, 0.12);
  background: rgba(255, 255, 255, 0.75);

  color: var(--textImportantColor);
  font-size: 20px;
  line-height: 20px;
  cursor: pointer;

  transition: transform .12s ease-out, box-shadow .12s ease-out, border-color .12s ease-out;
}

.close:hover {
  transform: translateY(-1px);
  border-color: rgba(34, 58, 80, 0.25);
  box-shadow: 0 8px 16px rgba(34, 58, 80, 0.15);
}

.close:focus-visible {
  outline: solid 2px var(--textImportantColor);
  outline-offset: 2px;
}

@media only screen and (max-width: 600px) {
  .modalCard {
    padding: 16px 16px 14px;
    border-radius: 16px;
  }

  .buttons {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
