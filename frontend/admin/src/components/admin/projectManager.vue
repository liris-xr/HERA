<script setup>
import {ENDPOINT} from "@/js/endpoints.js";
import {computed, onMounted, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import * as sea from "node:sea";
import GenericTable from "@/components/admin/generic/genericTable.vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import GenericModal from "@/components/admin/generic/genericModal.vue";


const props = defineProps({
  token: {type: String, required: true},
})

const emit = defineEmits(['editScene'])

const table = ref(null)

const projects = ref([])

const editingProject = ref(null)
const deletingProject = ref(null)
const creatingProject = ref(null)

const deletingScene = ref(null)

const totalPages = ref(1)

async function confirmSceneDelete() {

  const res = await fetch(`${ENDPOINT}scenes/${deletingScene.value.id}`,{
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
  })

  if(res.ok) {
    const index = editingProject.value.scenes.findIndex(user => user.id === deletingScene.value.id)
    if(index !== -1)
      editingProject.value.scenes.splice(index, index+1)
  }

  deletingScene.value = null

}

async function editScene(sceneId) {
  const res = await fetch(`${ENDPOINT}scenes/${sceneId}`,{
    method: "GET",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
  })

  if(res.ok) {
    const data = await res.json()
    emit("editScene", data)
  }

}

async function confirmProjectEdit() {
  editingProject.value.scenes = undefined

  const res = await fetch(`${ENDPOINT}projects/${editingProject.value.id}`,{
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
    body: JSON.stringify(editingProject.value),
  })

  if(res.ok) {
    const data = await res.json()

    const index = projects.value.findIndex(project => project.id === data.id)
    if(index !== -1)
      projects.value[index] = { ...data }
  }

  editingProject.value = null
}

async function confirmProjectDelete() {
  const res = await fetch(`${ENDPOINT}project/${deletingProject.value.id}`,{
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
  })

  if(res.ok) {
    const index = projects.value.findIndex(project => project.id === deletingProject.value.id)
    if(index !== -1)
      projects.value.splice(index, index+1)
  }

  deletingProject.value = null
}


async function fetchProjects(data=null) {
  const searchQuery = data?.searchQuery
  const currentPage = data?.currentPage ?? 1

  try {
    const searchParams = new URLSearchParams(searchQuery)

    const res = await fetch(`${ENDPOINT}admin/projects/${currentPage}?${searchParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${props.token}`,
          }
        })

    if(res.ok) {
      const data = await res.json()

      projects.value = data.projects
      totalPages.value = data.totalPages
    }
  } catch(error) {
    console.log(error)
    //TODO
  }
}

onMounted(async () => {
  await fetchProjects()
})


</script>

<template>

    <generic-table
        ref="table"
        section-name="projects"
        :fields="['title']"
        :data="projects"
        :total-pages="totalPages"

        @create="creatingProject = {}"
        @edit="editingProject = $event"
        @delete="deletingProject = $event"
        @fetch="fetchProjects"
    />

  <!-- Interfaces modales -->

  <div class="modal" v-if="editingProject">
    <div>
      <h2>Modifier le projet</h2>
      <div>
        <label for="title">{{$t("admin.sections.projects.title")}}</label>
        <input v-model="editingProject.title" id="title" name="title">
      </div>

      <div>
        <label for="description">{{$t("admin.sections.projects.description")}}</label>
        <textarea rows="5" cols="50" v-model="editingProject.description" id="description" name="description"></textarea>
      </div>

      <div>
        <label for="calibrationMessage">{{$t("admin.sections.projects.calibrationMessage")}}</label>
        <input v-model="editingProject.calibrationMessage" id="calibrationMessage" name="calibrationMessage">
      </div>

      <div>
        <label for="unit">{{$t("admin.sections.projects.unit")}}</label>
        <input v-model="editingProject.unit" id="unit" name="unit">
      </div>

      <div>
        <label for="published">{{$t("admin.sections.projects.published")}}</label>
        <input v-model="editingProject.published" type="checkbox" id="published" name="published">
      </div>

      <div>
        <p>Scenes</p>
        <div class="scenes">
          <div v-for="scene in editingProject.scenes" class="sceneItem">
            <span>
              {{scene.title}}
            </span>
            <div class="actions">
              <icon-svg url="/icons/edit.svg" theme="text" class="iconAction" :hover-effect="true" @click="editScene(scene.id)"/>
              <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click="deletingScene=scene"/>
            </div>
          </div>
        </div>
      </div>

      <div>
        <button @click="confirmProjectEdit">Confirmer</button>
      </div>
      <div>
        <button @click="editingProject = null">Annuler</button>
      </div>
    </div>
  </div>

  <generic-modal
      title="delete"
      section-name="projects"

      :subject="deletingProject"

      @confirm="confirmProjectDelete"
      @cancel="deletingProject = null">

    <div>
      <p>{{$t("admin.deleteConfirm")}} {{deletingProject.title}} ?</p>
      <p class="danger">⚠{{$t("admin.irreversibleAction")}}⚠</p>
    </div>

  </generic-modal>

  <div class="modal" v-if="deletingScene">
    <div>
      <h2>Supprimer la scène</h2>
      <div>
        <p>Vous-vous vraiment supprimer {{deletingScene.title}} ?</p>
        <p class="danger">⚠Cette action est irréversible⚠</p>
      </div>

      <div>
        <button @click="confirmSceneDelete">Confirmer</button>
      </div>
      <div>
        <button @click="deletingScene = null">Annuler</button>
      </div>
    </div>
  </div>




</template>

<style scoped>

.scenes {
  display: flex;
  flex-direction: column;
  align-content: center;
  gap: 10px;
}

.sceneItem {
  padding: 5px;
  border-radius: 5px;
  background: var(--darkerBackgroundColor);
  display: flex;
  justify-content: space-between;
}

.sceneItem .actions {
  display: flex;
}

</style>