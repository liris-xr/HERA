<script setup>
import {ENDPOINT} from "@/js/endpoints.js";
import {computed, onMounted, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import * as sea from "node:sea";
import GenericTable from "@/components/admin/generic/genericTable.vue";
import GenericModal from "@/components/admin/generic/genericModal.vue";
import IconSvg from "@/components/icons/IconSvg.vue";


const props = defineProps({
  token: {type: String, required: true},
})

const table = ref(null)

const labels = ref([])
const editingLabel = ref(null)
const deletingLabel = ref(null)
const creatingLabel = ref(null)

const totalPages = ref(1)

defineExpose({editingLabel, deletingLabel})



async function confirmLabelDelete() {
  const res = await fetch(`${ENDPOINT}admin/labels/${deletingLabel.value.id}`,{
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
  })

  if(res.ok) {
    const index = labels.value.findIndex(label => label.id === deletingLabel.value.id)
    if(index !== -1)
      labels.value.splice(index, 1)
  }

  deletingLabel.value = null
}

async function confirmLabelEdit() {
  const res = await fetch(`${ENDPOINT}admin/labels/${editingLabel.value.id}`,{
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
    body: JSON.stringify(editingLabel.value),
  })

  if(res.ok) {
    const data = await res.json()

    const index = labels.value.findIndex(label => label.id === data.id)
    if(index !== -1)
      labels.value[index] = { ...editingLabel.value }
  }

  editingLabel.value = null
}

async function fetchLabels(data=null) {
  const searchQuery = data?.searchQuery
  const currentPage = data?.currentPage ?? 1

  try {
    const searchParams = new URLSearchParams(searchQuery)

    const res = await fetch(`${ENDPOINT}admin/labels/${currentPage}?${searchParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${props.token}`,
          }
        })

    if(res.ok) {
      const data = await res.json()

      labels.value = data.labels

      totalPages.value = data.totalPages
    }
  } catch(error) {
    console.log(error)
    //TODO
  }
}

onMounted(async () => {
  await fetchLabels()
})


</script>

<template>

    <generic-table
        ref="table"
        section-name="labels"
        :create="false"
        :fields="['text', 'scene.project.title']"
        :data="labels"
        :total-pages="totalPages"

        @create="creatingLabel = {}"
        @edit="editingLabel = $event"
        @delete="deletingLabel = $event"
        @fetch="fetchLabels"
    />

  <!-- Interfaces modales -->

  <generic-modal
      title="edit"
      section-name="labels"

      :subject="editingLabel"
      :fields="[
          {
            name: 'text',
            type: 'big-text',
          },
          {
            name: 'timestampStart',
            type: 'number'
          },
          {
            name: 'timestampEnd',
            type: 'number'
          }
      ]"

      @confirm="confirmLabelEdit"
      @cancel="editingLabel = null">

  </generic-modal>

  <generic-modal
      title="delete"
      section-name="labels"

      :subject="deletingLabel"

      @confirm="confirmLabelDelete"
      @cancel="deletingLabel = null">

    <div>
      <p>{{$t("admin.deleteConfirm")}} {{deletingLabel.text}} ?</p>
      <p class="danger">⚠{{$t("admin.irreversibleAction")}}⚠</p>
    </div>

  </generic-modal>

</template>

<style scoped>

</style>