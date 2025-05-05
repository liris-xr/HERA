<script setup>
import {ENDPOINT} from "@/js/endpoints.js";
import {computed, onMounted, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import * as sea from "node:sea";
import GenericTable from "@/components/admin/generic/genericTable.vue";
import GenericModal from "@/components/admin/generic/genericModal.vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import Notification from "@/components/notification/notification.vue";
import {toast} from "vue3-toastify";


const props = defineProps({
  token: {type: String, required: true},
})


const loading = ref(false)
const error = ref(false)


const emit = defineEmits(["newAsset", "supprAsset"])

const table = ref(null)

const assets = ref([])
const editingAsset = ref(null)
const deletingAsset = ref(null)
const creatingAsset = ref(null)

const totalPages = ref(1)

defineExpose({editingAsset, deletingAsset, creatingAsset})


async function confirmAssetCreate() {
  const formData = new FormData()

  for(const key in creatingAsset.value)
    if(creatingAsset.value.hasOwnProperty(key))
      formData.append(key, creatingAsset.value[key]);

  const res = await fetch(`${ENDPOINT}admin/assets`,{
    method: "POST",
    headers: {
      'Authorization': `Bearer ${props.token}`,
    },
    body: formData
  })

  if(res.ok) {
    const data = await res.json()
    assets.value.push(data)

    emit("newAsset", data)
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  creatingAsset.value = null
}

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
    emit("supprAsset", deletingAsset.value)
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
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
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  editingAsset.value = null
}

async function fetchAssets(data=null) {
  loading.value = true

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

      if(table.value.currentPage > totalPages.value)
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
        @fetch="fetchAssets">

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



  <!-- Interfaces modales -->

  <generic-modal
      title="edit"
      section-name="assets"

      :subject="editingAsset"
      :fields="[
          {
            name: 'name',
            type: 'text',
            required: true,
          },
          {
            name: 'hideInViewer',
            type: 'boolean'
          }
      ]"

      @confirm="confirmAssetEdit"
      @cancel="editingAsset = null"
  />

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

  <generic-modal
      title="create"
      section-name="assets"

      :subject="creatingAsset"
      :fields="[
          {
            name: 'name',
            type: 'text',
            required: true,
          },
          {
            name: 'hideInViewer',
            type: 'boolean',
          },
          {
            name: 'asset',
            type: 'file',
            accept: '.glb, .gltf',
            required: true,
          }
      ]"

      @confirm="confirmAssetCreate"
      @cancel="creatingAsset = null"
  />

</template>

<style scoped>

</style>