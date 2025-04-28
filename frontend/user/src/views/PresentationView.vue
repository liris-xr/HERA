<script setup>
import ArView from "@/components/arView.vue";
import ProjectDetail from "@/components/projectDetail.vue";
import {ref} from "vue";
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from "vue-router";
import {ENDPOINT} from "@/js/endpoints.js";
import ArNotification from "@/components/notification/arNotification.vue";
import ProjectInfo from "@/components/projectInfo.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import router from "@/router/index.js";
import {useAuthStore} from "@/store/auth.js";
import FilledButtonView from "@/components/button/filledButtonView.vue";

const { isAuthenticated, token } = useAuthStore()

const route = useRoute();
const project = ref({});
const loading = ref(true);
const error = ref(false);

async function fetchProject(projectId) {
  loading.value = true;
  error.value = false;
  try {
    const headers = {}
    if(isAuthenticated.value)
      headers["Authorization"] = `Bearer ${token.value}`

    const res = await fetch(`${ENDPOINT}project/${projectId}`, {headers});
    if(res.ok){
      return await res.json();
    }
    throw new Error("ko");
  } catch (e) {
    error.value = true;
  }
}


fetchProject(route.params.projectId).then((r)=>{
  project.value=r
  loading.value = false;
});

</script>
<template>
  <main>
    <section>
      <ar-notification
          theme="default"
          icon="/icons/spinner.svg"
          v-if="loading"
      >
        <template #content><p>{{$t("projectView.loadingInfo")}}</p></template>
      </ar-notification>
      <ar-notification
          theme="danger"
          icon="/icons/info.svg"
          v-if="error"
      >
        <template #content>
          <redirect-message>
            <template #content>
              <p>{{$t("projectView.loadingError")}}</p>
            </template>
          </redirect-message>
        </template>
      </ar-notification>
    </section>

    <section class="flex">
      <span></span>
      <section>
        <ar-view v-if="!(loading || error)" :json="project"></ar-view>
        <project-info v-if="!(loading || error)" :project-info="project"></project-info>
      </section>
    </section>
  </main>
</template>


<style scoped>

.center {
  margin: auto;
}


@media  screen and (min-width: 900px) {
  .flex{
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .flex>section{
    flex-grow: 1;
    width: 50%;
  }

  .flex>span{
    width: 16px;
  }

}
</style>
