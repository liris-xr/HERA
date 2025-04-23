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

const assets = ref([])
const editingAsset = ref(null)
const deletingAsset = ref(null)
const creatingAsset = ref(null)

const totalPages = ref(1)

defineExpose({editingAsset, deletingAsset})



async function confirmAssetDelete() {
  const res = await fetch(`${ENDPOINT}admin/assets/${deletingAsset.value.id}`,{
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
  })

  if(res.ok) {
    const index = assets.value.findIndex(asset => asset.id === deletingAsset.value.id)
    if(index !== -1)
      assets.value.splice(index, 1)
  }

  deletingAsset.value = null
}

async function confirmAssetEdit() {
  const res = await fetch(`${ENDPOINT}admin/assets/${editingAsset.value.id}`,{
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
    body: JSON.stringify(editingAsset.value),
  })

  if(res.ok) {
    const data = await res.json()

    const index = assets.value.findIndex(asset => asset.id === data.id)
    if(index !== -1)
      assets.value[index] = { ...editingAsset.value }
  }

  editingAsset.value = null
}

async function fetchAssets(data=null) {
  const searchQuery = data?.searchQuery
  const currentPage = data?.currentPage ?? 1

  try {
    const searchParams = new URLSearchParams(searchQuery)

    const res = await fetch(`${ENDPOINT}admin/assets/${currentPage}?${searchParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${props.token}`,
          }
        })

    if(res.ok) {
      const data = await res.json()

      assets.value = data.assets

      totalPages.value = data.totalPages
    }
  } catch(error) {
    console.log(error)
    //TODO
  }
}

onMounted(async () => {
  await fetchAssets()
})


</script>

<template>

    <generic-table
        ref="table"
        section-name="assets"
        :create="false"
        :fields="['name', 'scene.project.title']"
        :data="assets"
        :total-pages="totalPages"

        @create="creatingAsset = {}"
        @edit="editingAsset = $event"
        @delete="deletingAsset = $event"
        @fetch="fetchAssets"
    />



  <!-- Interfaces modales -->

  <generic-modal
      title="edit"
      section-name="assets"

      :subject="editingAsset"
      :fields="[
          {
            name: 'name',
            type: 'text',
          },
          {
            name: 'hideInViewer',
            type: 'boolean'
          }
      ]"

      @confirm="confirmAssetEdit"
      @cancel="editingAsset = null">

  </generic-modal>

  <generic-modal
      title="delete"
      section-name="assets"

      :subject="deletingAsset"

      @confirm="confirmAssetDelete"
      @cancel="deletingAsset = null">

    <div>
      <p>{{$t("admin.deleteConfirm")}} {{deletingAsset.name}} ?</p>
      <p class="danger">⚠{{$t("admin.irreversibleAction")}}⚠</p>
    </div>

  </generic-modal>

</template>

<style scoped>

</style>