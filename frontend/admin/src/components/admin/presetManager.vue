<script setup>
import {ENDPOINT} from "@/js/endpoints.js";
import {onMounted, ref} from "vue";
import GenericTable from "@/components/admin/generic/genericTable.vue";
import GenericModal from "@/components/admin/generic/genericModal.vue";
import Notification from "@/components/notification/notification.vue";
import {toast} from "vue3-toastify";

const props = defineProps({
  token: {type: String, required: true},
})

const element = ref(null)

const loading = ref(false)
const error = ref(false)

const table = ref(null)

const presets = ref([])
const deletingPreset = ref(null)

const totalPages = ref(1)

defineExpose({deletingPreset, element})

async function confirmPresetDelete() {
  const res = await fetch(`${ENDPOINT}admin/presets/${deletingPreset.value.projectId}/${deletingPreset.value.presetIndex}`,{
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
  })

  if(res.ok) {
    await fetchPresets({ currentPage: table.value.currentPage, searchQuery: table.value.searchQuery })
    deletingPreset.value = null
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }
}

function editPreset(preset) {
  const host = window.location.protocol + '//' + window.location.hostname;
  // redirect to viewer
  const url = `${host}:8081/viewer/project/${preset.projectId}/presentation`;
  window.open(url, '_blank');
}

async function fetchPresets(data=null) {
  loading.value = true

  const searchQuery = data?.searchQuery
  const currentPage = data?.currentPage ?? 1

  try {
    const searchParams = new URLSearchParams(searchQuery)

    const res = await fetch(`${ENDPOINT}admin/presets/${currentPage}?${searchParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${props.token}`,
          }
        })

    if(res.ok) {
      const data = await res.json()
      presets.value = data.presets
      totalPages.value = data.totalPages

      if(table.value && table.value.currentPage > totalPages.value)
        table.value.currentPage = totalPages.value
    } else
      error.value = true

  } catch(error) {
    error.value = true
    console.log(error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchPresets()
})

</script>

<template>

  <section ref="element">

    <generic-table
        ref="table"
        section-name="presets"
        :create="false"
        :edit="false"
        :fields="['bigText', 'text', 'projectTitle']"
        :data="presets"
        :total-pages="totalPages"
        :item-buttons="[]"

        @delete="deletingPreset = $event"
        @fetch="fetchPresets">

      <notification
          theme="default"
          icon="/icons/spinner.svg"
          v-if="loading">
        <template #content><p>{{$t("admin.loading")}}</p></template>
      </notification>

      <notification
          theme="danger"
          icon="/icons/info.svg"
          v-if="error">
        <template #content><p>{{$t("admin.loadingError")}}</p></template>
      </notification>

    </generic-table>

  <!-- modals -->

  <generic-modal
      title="delete"
      section-name="presets"

      :subject="deletingPreset"

      @confirm="confirmPresetDelete"
      @cancel="deletingPreset = null">

    <div v-if="deletingPreset">
      <p>{{$t("admin.deleteConfirm")}} {{deletingPreset.bigText}} - {{deletingPreset.text}} ?</p>
      <p class="danger">⚠{{$t("admin.irreversibleAction")}}⚠</p>
    </div>

  </generic-modal>

  </section>

</template>

<style scoped>

</style>
