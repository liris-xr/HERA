<script setup>
import {ENDPOINT} from "@/js/endpoints.js";
import {computed, onMounted, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import * as sea from "node:sea";
import GenericTable from "@/components/admin/generic/genericTable.vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import GenericModal from "@/components/admin/generic/genericModal.vue";
import Notification from "@/components/notification/notification.vue";
import {toast} from "vue3-toastify";


const props = defineProps({
  token: {type: String, required: true},
})

const element = ref(null)

const loading = ref(false)
const error = ref(false)


const emit = defineEmits(['createScene', 'editScene', 'deleteScene'])

const table = ref(null)

const projects = ref([])

const editingProject = ref(null)
const deletingProject = ref(null)
const creatingProject = ref(null)

const totalPages = ref(1)

const uploadingProject = ref(null)

const showSpinner = ref(false)


function newScene(scene) {
  const index = projects.value.findIndex(project => project.id === scene.projectId)

  if(index !== -1)
    projects.value[index].scenes.push(scene)
}

function supprScene(scene) {
  const index = projects.value.findIndex(project => project.id === scene.projectId)

  if(index !== -1) {
    const project = projects.value[index]
    const index2 = project.scenes.findIndex(s => s.id === scene.id)

    projects.value[index].scenes.splice(index2, 1)
  }

}

function editScene(scene) {
  const index = projects.value.findIndex(project => project.id === scene.projectId)

  if(index !== -1) {
    const project = projects.value[index]
    const index2 = project.scenes.findIndex(s => s.id === scene.id)

    projects.value[index].scenes[index2] = { ...scene }
  }
}

function createScene() {
  emit("createScene", editingProject.value)
}

function deleteScene(scene) {
  emit("deleteScene", scene)
}

async function askSceneEdit(sceneId) {
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
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
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
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  creatingProject.value = null
}

async function confirmProjectEdit() {
  const temp = { ...editingProject.value }
  temp.scenes = undefined

  const res = await fetch(`${ENDPOINT}projects/${editingProject.value.id}`,{
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
    },
    body: JSON.stringify(temp),
  })

  if(res.ok) {
    const data = await res.json()

    const index = projects.value.findIndex(project => project.id === data.id)
    if(index !== -1)
      projects.value[index] = { ...editingProject.value }
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
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
      projects.value.splice(index, 1)
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  deletingProject.value = null
}


async function fetchProjects(data=null) {
  loading.value = true

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

async function exportProject(project) {

  showSpinner.value = true

  try {
    const resp = await fetch(`${ENDPOINT}project/${project.id}/export`,
        {
          headers: {
            'Authorization': `Bearer ${props.token}`,
          },
          signal: AbortSignal.timeout(5*60*1000),
        })

    if (!resp.ok) throw new Error('Export failed');

    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);

    // 🆕 Crée un lien temporaire pour déclencher le téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${project.id}.zip`;
    document.body.appendChild(a);
    a.click();

    // 🧼 Nettoyage
    a.remove();
    window.URL.revokeObjectURL(url);

    clearTimeout(timeoutId)
  } catch(e) {} finally {
    showSpinner.value = false
  }


}

function importProject() {
  uploadingProject.value = {}
}

async function confirmProjectImport() {
  const formData = new FormData()

  for(const key in uploadingProject.value)
    if(uploadingProject.value.hasOwnProperty(key))
      formData.append(key, uploadingProject.value[key]);

  showSpinner.value = true

  try {
    const res = await fetch(`${ENDPOINT}project/import`,{
      method: "POST",
      headers: {
        'Authorization': `Bearer ${props.token}`,
      },
      body: formData
    })

    if(res.ok) {
      const data = await res.json()

      projects.value.push(data)
    } else {
      toast.error(res.status + " : " + res.statusText, {
        position: toast.POSITION.BOTTOM_RIGHT
      })
    }
  } catch(e) {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  } finally {
    showSpinner.value = false
  }

  uploadingProject.value = null
}

onMounted(async () => {
  await fetchProjects()
})


defineExpose({projects, newScene, supprScene, editScene, element})

</script>

<template>

  <div class="spinner-wrapper" v-if="showSpinner">
    <icon-svg url="/icons/spinner.svg" theme="default" />
  </div>

  <section ref="element">

    <generic-table
        ref="table"
        section-name="projects"
        :fields="['title']"
        :data="projects"
        :total-pages="totalPages"

        :title-buttons="[
            {
              icon: '/icons/upload.svg',
              func: importProject
            }
        ]"

        :item-buttons="[
          {
            icon: '/icons/download.svg',
            func: exportProject,
          }
        ]"

        @create="creatingProject = {}"
        @edit="editingProject = $event"
        @delete="deletingProject = $event"
        @fetch="fetchProjects">

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
      section-name="projects"

      :subject="editingProject"
      :fields="[
          {
            name: 'title',
            type: 'text',
            placeholder: 'Musée des confluences',
            required: true,
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
            required: true,
          },
          {
            name: 'unit',
            type: 'text',
            placeholder: 'Année',
            required: true,
          },
          {
            name: 'published',
            type: 'boolean',
          }
      ]"

      @confirm="confirmProjectEdit"
      @cancel="editingProject = null">

    <div>
      <div class="inline-flex">
        <p>{{ $t("admin.sections.projects.scenes") }}</p>
        <button-view icon="/icons/add.svg" @click="createScene"></button-view>
      </div>
      <div v-if="editingProject.scenes?.length > 0" class="list">
        <div v-for="scene in editingProject.scenes" class="item">
            <span>
              {{scene.title}}
            </span>
          <div class="actions">
            <icon-svg url="/icons/edit.svg" theme="text" class="iconAction" :hover-effect="true" @click="askSceneEdit(scene.id)"/>
            <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click="deleteScene(scene)"/>
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
            required: true,
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
            required: true,
          },
          {
            name: 'unit',
            type: 'text',
            placeholder: 'Année',
            required: true,
          },
          {
            name: 'published',
            type: 'boolean',
          }
      ]"

      @confirm="confirmProjectCreate"
      @cancel="creatingProject = null"
  />

    <generic-modal
        title="import"
        section-name="projects"

        :subject="uploadingProject"
        :fields="[
            {
              name: 'zip',
              type: 'file',
              accept: '.zip',
              required: true,
            }
        ]"

        @confirm="confirmProjectImport"
        @cancel="uploadingProject = null"
    />

  </section>

</template>

<style scoped>

.spinner-wrapper {
  position: fixed;
  inset: 0 0 0 0;

  z-index: 1023;

  display: flex;
  justify-content: center;
  align-items: center;
}

</style>