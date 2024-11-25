<script setup>
import ProjectCard from "@/components/projectCard.vue";
import {ref} from "vue";
import {ENDPOINT, getCertUrl} from "@/js/endpoints.js";
import ArNotification from "@/components/notification/arNotification.vue";
import ButtonView from "@/components/utils/buttonView.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";


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
    const res = await fetch(`${ENDPOINT}projects/${currentPage.value}`);
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

</script>

<template>
  <main>
    <h1>{{$t("projectsView.title")}}</h1>


    <section class="projects" v-if="!(loading || error)">
      <project-card v-for="project in projects"  :project-info="project"></project-card>
    </section>
    <button-view v-if="hasNextPage" :text="$t('projectsView.seeMoreProjectsButton')" @click="loadNext"></button-view>

    <section>
      <ar-notification
          theme="default"
          icon="/icons/spinner.svg"
          v-if="loading"
      >
        <template #content>
          <p>{{$t("projectsView.loadingInfo")}}</p>
        </template>
      </ar-notification>
      <ar-notification
          theme="danger"
          icon="/icons/info.svg"
          v-if="error"
      >
        <template #content>
          <redirect-message>
            <template #content>
              <p>{{$t("projectsView.loadingError")}}</p>
            </template>
          </redirect-message>
        </template>
      </ar-notification>
      <ar-notification
          theme="default"
          icon="/icons/info.svg"
          v-if="!hasNextPage && !(loading || error)"
      >
        <template #content>
          <p>{{$t("projectsView.noMoreProjectsToShow")}}</p>
        </template>
      </ar-notification>
    </section>

  </main>
</template>


<style scoped>

.projects{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  grid-gap: 16px;
  flex-grow: 1;
  margin-bottom: 16px;
}

</style>
