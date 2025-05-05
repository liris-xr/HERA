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

const element = ref(null)

const loading = ref(false)
const error = ref(false)


const emit = defineEmits([
  'createAsset', 'editAsset', 'deleteAsset',
  'createLabel', 'editLabel', 'deleteLabel',
  'newScene', 'supprScene'])

const table = ref(null)

const scenes = ref([])
const editingScene = ref(null)
const deletingScene = ref(null)
const creatingScene = ref(null)

const totalPages = ref(1)

function deleteLabel(label) {
  emit("deleteLabel", label)
}

function editLabel(label) {
  emit("editLabel", label)
}

function createLabel() {
  emit("createLabel", editingScene.value)
}

function deleteAsset(asset) {
  emit("deleteAsset", asset)
}

function editAsset(asset) {
  emit("editAsset", asset)
}

function createAsset() {
  emit("createAsset", editingScene.value)
}

async function newLabel(label) {
  const index = scenes.value.findIndex(scene => scene.id === label.sceneId)

  if(index !== -1)
    scenes.value[index].labels.push(label)
}

async function supprLabel(label) {
  const index = scenes.value.findIndex(scene => scene.id === label.sceneId)

  if(index !== -1) {
    const scene = scenes.value[index]
    const index2 = scene.labels.findIndex(l => l.id === label.id)

    if(index2 !== -1)
      scene.labels.splice(index2, 1)
  }
}

async function newAsset(asset) {
  const index = scenes.value.findIndex(scene => scene.id === asset.sceneId)

  if(index !== -1)
    scenes.value[index].assets.push(asset)
}

async function supprAsset(asset) {
  const index = scenes.value.findIndex(scene => scene.id === asset.sceneId)
  const scene = scenes.value[index]

  if(index !== -1) {
    const index2 = scene.assets.findIndex(a => a.id === asset.id)

    if(index2 !== -1)
      scene.assets.splice(index2, 1)
  }
}

async function confirmSceneCreate() {
  const res = await fetch(`${ENDPOINT}scenes`,{
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
    body: JSON.stringify(creatingScene.value),
  })

  if(res.ok) {
    const data = await res.json()
    scenes.value.push(data)

    emit("newScene", data)
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  creatingScene.value = null
}

async function confirmSceneDelete() {

  const res = await fetch(`${ENDPOINT}scenes/${deletingScene.value.id}`,{
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
  })

  if(res.ok) {
    const index = scenes.value.findIndex(scene => scene.id === deletingScene.value.id)
    if(index !== -1)
      scenes.value.splice(index, 1)
    emit("supprScene", deletingScene.value)
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  deletingScene.value = null

}

async function confirmSceneEdit() {
  const res = await fetch(`${ENDPOINT}scenes/${editingScene.value.id}`,{
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
    body: JSON.stringify(editingScene.value),
  })

  if(res.ok) {
    const data = (await res.json()).scene

    const index = scenes.value.findIndex(scene => scene.id === data.id)
    if(index !== -1)
      scenes.value[index] = { ...data }
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  editingScene.value = null
}

async function fetchScenes(data=null) {
  loading.value = true

  const searchQuery = data?.searchQuery
  const currentPage = data?.currentPage ?? 1

  try {
    const searchParams = new URLSearchParams(searchQuery)

    const res = await fetch(`${ENDPOINT}admin/scenes/${currentPage}?${searchParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${props.token}`,
          }
        })

    if(res.ok) {
      const data = await res.json()

      scenes.value = data.scenes
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
  await fetchScenes()
})

defineExpose({editingScene, deletingScene, creatingScene, newLabel, supprLabel, newAsset, supprAsset, element})

</script>

<template>

  <section ref="element">

    <generic-table
        ref="table"
        section-name="scenes"
        :fields="['title', 'project.title']"
        :create="false"
        :data="scenes"
        :total-pages="totalPages"

        @create="creatingScene = {}"
        @edit="editingScene = $event"
        @delete="deletingScene = $event"
        @fetch="fetchScenes">

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
      title="create"
      section-name="scenes"

      :subject="creatingScene"
      :fields="[
          {
            name: 'title',
            type: 'text',
            required: true,
          },
          {
            name: 'description',
            type: 'big-text',
          }
      ]"

      @confirm="confirmSceneCreate"
      @cancel="creatingScene = null"
  />

  <generic-modal
      title="edit"
      section-name="scenes"

      :subject="editingScene"
      :fields="[
          {
            name: 'title',
            type: 'text',
            required: true,
          },
          {
            name: 'description',
            type: 'big-text',
          }
      ]"

      @confirm="confirmSceneEdit"
      @cancel="editingScene = null">

    <div>
      <div class="inline-flex">
        <p>{{ $t("admin.sections.scenes.assets") }}</p>
        <button-view icon="/icons/add.svg" @click="createAsset"></button-view>
      </div>
      <div v-if="editingScene?.assets?.length > 0" class="list">
        <div  v-for="asset in editingScene?.assets" class="item">
            <span>
              {{asset.name}}
            </span>
          <div class="actions">
            <icon-svg url="/icons/edit.svg" theme="text" class="iconAction" :hover-effect="true" @click="editAsset(asset)"/>
            <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click="deleteAsset(asset)"/>
          </div>
        </div>
      </div>
      <div v-else>
        {{$t("none")}}
      </div>
    </div>

    <div>
      <div class="inline-flex">
        <p>{{ $t("admin.sections.scenes.labels") }}</p>
        <button-view icon="/icons/add.svg" @click="createLabel"></button-view>
      </div>
      <div v-if="editingScene?.labels?.length > 0" class="list">
        <div v-for="label in editingScene?.labels" class="item">
            <span>
              {{label.text}}
            </span>
          <div class="actions">
            <icon-svg url="/icons/edit.svg" theme="text" class="iconAction" :hover-effect="true" @click="editLabel(label)"/>
            <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click="deleteLabel(label)"/>
          </div>
        </div>
      </div>
      <div v-else>
        {{$t("none")}}
      </div>
    </div>

  </generic-modal>

  <generic-modal
      title="delete"
      section-name="scenes"

      :subject="deletingScene"

      @confirm="confirmSceneDelete"
      @cancel="deletingScene = null">

    <div>
      <p>{{$t("admin.deleteConfirm")}} {{deletingScene.title}} ?</p>
      <p class="danger">⚠{{$t("admin.irreversibleAction")}}⚠</p>
      <p class="danger">{{$t("admin.sections.scenes.cautionMessage")}}</p>
    </div>

  </generic-modal>

  </section>

</template>

<style scoped>

</style>