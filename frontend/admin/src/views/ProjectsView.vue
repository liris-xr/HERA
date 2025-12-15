<script setup>
import ProjectCard from "@/components/projectCard.vue";
import {ref} from "vue";
import {ENDPOINT} from "@/js/endpoints.js";
import ButtonView from "@/components/button/buttonView.vue";
import Notification from "@/components/notification/notification.vue";
import {useAuthStore} from "@/store/auth.js";
import {useRouter} from "vue-router/dist/vue-router";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import TextInputModal from "@/components/modal/textInputModal.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import {useI18n} from "vue-i18n";


const { isAuthenticated, token ,userData} = useAuthStore();
const router = useRouter();
const {t} = useI18n()

if (!isAuthenticated.value) {
  router.push({ name: "login" });
}




const projects = ref([]);
const loading = ref(false);
const error = ref(false);
const currentPage = ref(0);
const PAGE_LENGTH = 20;
const hasNextPage = ref(false);

async function fetchProjects() {

  loading.value = true;
  error.value = false;

  try {
    const res = await fetch(`${ENDPOINT}users/${userData.value.id}/projects/${currentPage.value}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
          },

        });
    if(res.ok){
      return await res.json();
    }
    throw new Error("ko");
  } catch (e) {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadNext() {
  fetchProjects().then((r)=>{
    if(!r) return;
    for (let project of r) {
      projects.value.push(project);
    }
    currentPage.value++;
    hasNextPage.value = r.length === PAGE_LENGTH;
  });
}

await loadNext();



const showProjectModal = ref(false);
async function createProject(title) {
  const project = {
    title: title,
    description: "",
    unit: t("defaultProjectSettings.unit"),
    calibrationMessage: t("defaultProjectSettings.calibrationMessage"),
  }

  try {
    const res = await fetch(`${ENDPOINT}project`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
          },
          body:JSON.stringify(project)

        });
    if(res.ok){
      const newProject = await res.json();
      await router.push({name: "project", params: {projectId: newProject.id}});
    }
    throw new Error("ko");
  } catch (e) {
    error.value = true;
  }
}

</script>

<template>
  <main>
    <section class="center">
      <div class="titleContainer">
        <h1>{{$t('projectsView.title')}}</h1>
        <filled-button-view :text="$t('projectsView.newProject.button')" icon="/icons/add.svg" @click="showProjectModal = true" />
      </div>

      <Teleport to="body">
        <text-input-modal
            :show="showProjectModal"
            @close="showProjectModal = false"
            :input-placeholder="$t('projectsView.newProject.modal.inputPlaceholder')"
            :input-title="$t('projectsView.newProject.modal.inputTitle')"
            :title="$t('projectsView.newProject.modal.title')"
            @confirm="(title)=>createProject(title)"
            :input-default-value="$t('projectsView.newProject.modal.inputDefaultValue')">


        </text-input-modal>
      </Teleport>


      <section class="projects" v-if="!(loading || error)">
        <project-card v-for="project in projects" :project-info="project"></project-card>
      </section>
      <button-view v-if="hasNextPage" :text="$t('projectsView.seeMoreProjectsButton')" @click="loadNext"></button-view>

      <section>
        <notification
            theme="default"
            icon="/icons/spinner.svg"
            v-if="loading">
          <template #content><p>{{$t('projectsView.loadingInfo')}}</p></template>
        </notification>
        <notification
            theme="danger"
            icon="/icons/info.svg"
            v-if="error"
        >
          <template #content>
            <redirect-message>
              <template #content><p>{{$t('projectsView.loadingError')}}</p></template>
            </redirect-message>
          </template>
        </notification>
        <notification
            theme="default"
            icon="/icons/info.svg"
            v-if="!hasNextPage && !(loading || error)"
        >
          <template #content><p>{{$t('projectsView.noMoreProjectsToShow')}}</p></template>
        </notification>
      </section>
    </section>


  </main>
</template>


<style scoped>

main{
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.center{
  width: 80%;
}

.projects{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  grid-gap: 16px;
  flex-grow: 1;
  margin-bottom: 16px;
}

.titleContainer{
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  align-items: center;
}

</style>
