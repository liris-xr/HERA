<script setup>
import ProjectCard from "@/components/projectCard.vue";
import {ref} from "vue";
import {ENDPOINT} from "@/js/endpoints.js";
import ArNotification from "@/components/notification/arNotification.vue";
import ButtonView from "@/components/utils/buttonView.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";


const projects = ref([]);
const loading = ref(false);
const error = ref(false);

async function fetchRecentProjects() {

  loading.value = true;
  error.value = false;

  try {
    const res = await fetch(`${ENDPOINT}projects/0`);
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
fetchRecentProjects().then((r)=>{
  if(!r) return
  projects.value=r.slice(0,5)
});


</script>

<template>
  <main>
    <h1>{{$t("homeView.title")}}</h1>
    <section>
      <ar-notification
          theme="default"
          icon="/icons/spinner.svg"
          v-if="loading"
      >
        <template #content>
          <p>{{$t("homeView.loadingInfo")}}</p>
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
              <p>{{$t("homeView.loadingError")}}</p>
            </template>
          </redirect-message>
        </template>
      </ar-notification>
    </section>

    <section class="projects">
      <project-card v-for="project in projects"  :project-info="project"></project-card>
    </section>

    <router-link :to="{name: 'projects'}">
      {{$t("homeView.seeAllProjects")}}
    </router-link>
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

a{
  text-decoration: none;
  color: var(--accentColor);
  font-weight: 500;
  width: fit-content;
  margin: auto;
  display: block;

}


</style>
