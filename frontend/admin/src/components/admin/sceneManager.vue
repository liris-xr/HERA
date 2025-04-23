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

const scenes = ref([])
const editingScene = ref(null)
const deletingScene = ref(null)
const creatingScene = ref(null)

const totalPages = ref(1)

defineExpose({editingScene, deletingScene})


async function deleteLabel(label) {
  //TODO
}

async function editLabel(label) {
  //TODO
}

async function deleteAsset(asset) {
  //TODO
}

async function editAsset(asset) {
  //TODO
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
  }

  editingScene.value = null
}

async function fetchScenes(data=null) {
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
    }
  } catch(error) {
    console.log(error)
    //TODO
  }
}

onMounted(async () => {
  await fetchScenes()
})


</script>

<template>

    <generic-table
        ref="table"
        section-name="scenes"
        :fields="['title', 'project.title']"
        :data="scenes"
        :total-pages="totalPages"

        @create="creatingScene = {}"
        @edit="editingScene = $event"
        @delete="deletingScene = $event"
        @fetch="fetchScenes"
    />



  <!-- Interfaces modales -->

  <generic-modal
      title="edit"
      section-name="scenes"

      :subject="editingScene"
      :fields="[
          {
            name: 'title',
            type: 'text',
          },
          {
            name: 'description',
            type: 'big-text',
          }
      ]"

      @confirm="confirmSceneEdit"
      @cancel="editingScene = null">

    <div>
      <p>Assets</p>
      <div class="list">
        <div v-for="asset in editingScene.assets" class="item">
            <span>
              {{asset.name}}
            </span>
          <div class="actions">
            <icon-svg url="/icons/edit.svg" theme="text" class="iconAction" :hover-effect="true" @click="editAsset(asset)"/>
            <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click="deleteAsset(asset)"/>
          </div>
        </div>
      </div>
    </div>

    <div>
      <p>Labels</p>
      <div class="list">
        <div v-for="label in editingScene.labels" class="item">
            <span>
              {{label.text}}
            </span>
          <div class="actions">
            <icon-svg url="/icons/edit.svg" theme="text" class="iconAction" :hover-effect="true" @click="editLabel(label)"/>
            <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click="deleteLabel(label)"/>
          </div>
        </div>
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
    </div>

  </generic-modal>

</template>

<style scoped>

</style>