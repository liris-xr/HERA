<script setup>
import { ref } from "vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import { ENDPOINT } from "@/js/endpoints.js";
import { toast } from "vue3-toastify";

const props = defineProps({
  token: { type: String, required: true },
});

const element = ref(null);

const intervalleTracesBuffer = ref(2);
const intervalleTracesSauvegarde = ref(30);

const saving = ref(false);

async function onConfirm() {
  saving.value = true;
  try {
    const res = await fetch(`${ENDPOINT}config/analytics`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.token}`,
      },
      body: JSON.stringify({
        recordTimerMs: intervalleTracesBuffer.value * 1000,
        sendRecordsTimerMs: intervalleTracesSauvegarde.value * 1000,
      }),
    });

    if (res.ok) {
      toast.success("Configuration sauvegardée.", { position: toast.POSITION.BOTTOM_RIGHT });
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error((data?.error ?? res.statusText), { position: toast.POSITION.BOTTOM_RIGHT });
    }
  } catch (e) {
    toast.error("Erreur réseau, configuration non sauvegardée.", { position: toast.POSITION.BOTTOM_RIGHT });
  } finally {
    saving.value = false;
  }
}

defineExpose({ element, intervalleTracesBuffer, intervalleTracesSauvegarde });
</script>

<template>
  <section ref="element">
    <h2>Configuration des intervalles de traces</h2>

    <p class="description">
      Définissez l'intervalle de mise en mémoire tampon et l'intervalle d'envoi des traces au serveur.
    </p>

    <div class="config-form">

      <div class="field">
        <label for="intervalleBuffer">Intervalle de mise en buffer </label>
        <div class="input-row">
          <input
            id="intervalleBuffer"
            type="number"
            v-model.number="intervalleTracesBuffer"
            min="1"
            step="1"
          />
          <span class="unit">secondes</span>
        </div>
        <p class="hint">Durée en secondes entre chaque mise en tampon des traces.</p>
      </div>

      <div class="field">
        <label for="intervalleSauvegarde">Intervalle d'envoi au serveur </label>
        <div class="input-row">
          <input
            id="intervalleSauvegarde"
            type="number"
            v-model.number="intervalleTracesSauvegarde"
            min="1"
            step="1"
          />
          <span class="unit">secondes</span>
        </div>
        <p class="hint">Durée en secondes entre chaque envoi des traces au serveur .</p>
      </div>

    </div>

    <div class="actions">
      <filled-button-view
        :text="saving ? 'Sauvegarde...' : 'Confirmer'"
        :disabled="saving"
        @click="onConfirm"
      />
    </div>

  </section>
</template>

<style scoped>
section {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
}

h2 {
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.description {
  color: #666;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 480px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

label {
  font-weight: 500;
  font-size: 0.95rem;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

input[type="number"] {
  width: 100px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.unit {
  color: #555;
  font-size: 0.9rem;
}

.hint {
  color: #888;
  font-size: 0.82rem;
  margin-top: 2px;
}

.actions {
  margin-top: 12px;
}
</style>
