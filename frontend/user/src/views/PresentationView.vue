<script setup>
import ArView from "@/components/arView.vue";
import ProjectDetail from "@/components/projectDetail.vue";
import {computed, onMounted, reactive, ref} from "vue";
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from "vue-router";
import {ENDPOINT} from "@/js/endpoints.js";
import ArNotification from "@/components/notification/arNotification.vue";
import ProjectInfo from "@/components/projectInfo.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import router from "@/router/index.js";
import {useAuthStore} from "@/store/auth.js";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import {io} from "socket.io-client";
import {SocketConnection} from "@/js/socket/socketConnection.js";
import {useI18n} from "vue-i18n";

const { isAuthenticated, token } = useAuthStore()
const {t} = useI18n()

if (!isAuthenticated.value) {
  router.push({ name: "login" })
}

const route = useRoute();
const project = ref({});
const loading = ref(true);
const error = ref(false);

const socket = reactive(
    new SocketConnection(
        ENDPOINT.replace("/api/", ""),
        "/api/socket",
        {
          auth: {
            token: `Bearer ${token.value}`,
          },
          transports: ['websocket']
        }
    ))


async function fetchProject(projectId) {
  loading.value = true;
  error.value = false;
  try {
    const res = await fetch(`${ENDPOINT}project/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        });
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


onMounted(() => {
  console.log(socket)

})

const connectedText = computed(() => {
  if(socket.state.connected)
    return t("presentation.controls.connected.true");
  return t("presentation.controls.connected.false");
})

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
      <section>
        <h1>{{$t("presentation.controls.title")}}</h1>

        <p v-bind:class="{ danger: !socket.state.connected, success: socket.state.connected }">
          {{connectedText}}
        </p>

      </section>
      <span></span>
      <section>
        <h1>{{$t("presentation.sceneTitle")}}</h1>
        <ar-view v-if="!(loading || error)" :json="project"></ar-view>
      </section>
    </section>
  </main>
</template>


<style scoped>

.center {
  margin: auto;
}

.danger {
  color: var(--dangerColor);
}

.success {
  color: var(--succesColor)
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
