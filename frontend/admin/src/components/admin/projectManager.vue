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

async function confirmProjectCreate() {
  const res = await fetch(`${ENDPOINT}project`,{
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
    body: JSON.stringify(creatingProject.value),
  })

  if(res.ok) {
    const data = await res.json()
    const newProject = data
    projects.value.push(newProject)
  }

  creatingProject.value = null
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

  <generic-modal
      title="edit"
      section-name="projects"

      :subject="editingProject"
      :fields="[
          {
            name: 'title',
            type: 'text',
            placeholder: 'Musée des confluences',
          },
          {
            name: 'description',
            type: 'big-text',
            placeholder: 'Le musée des Confluences, situé à Lyon, est un musée d\'histoire naturelle, d\'anthropologie et des sociétés. Son architecture audacieuse et futuriste reflète sa vocation : explorer l’origine de l’humanité et la diversité des cultures à travers le temps.',
          },
          {
            name: 'calibrationMessage',
            type: 'text',
            placeholder: 'Appuyer n\'importe où pour afficher le modèle',
          },
          {
            name: 'unit',
            type: 'text',
            placeholder: 'Année',
          },
          {
            name: 'published',
            type: 'boolean',
          }
      ]"

      @confirm="confirmProjectEdit"
      @cancel="editingProject = null">

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

  </generic-modal>

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

  <generic-modal
      title="create"
      section-name="projects"

      :subject="creatingProject"
      :fields="[
          {
            name: 'title',
            type: 'text',
            placeholder: 'Musée des confluences',
          },
          {
            name: 'description',
            type: 'big-text',
            placeholder: 'Le musée des Confluences, situé à Lyon, est un musée d\'histoire naturelle, d\'anthropologie et des sociétés. Son architecture audacieuse et futuriste reflète sa vocation : explorer l’origine de l’humanité et la diversité des cultures à travers le temps.',
          },
          {
            name: 'calibrationMessage',
            type: 'text',
            placeholder: 'Appuyer n\'importe où pour afficher le modèle',
          },
          {
            name: 'unit',
            type: 'text',
            placeholder: 'Année',
          },
          {
            name: 'published',
            type: 'boolean',
          }
      ]"

      @confirm="confirmProjectCreate"
      @cancel="creatingProject = null"
  />




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