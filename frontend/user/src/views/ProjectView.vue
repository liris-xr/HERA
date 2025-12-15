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
import {SocketConnection} from "@/js/socket/socketConnection.js";
import {SocketActionManager} from "@/js/socket/socketActionManager.js";
import {useI18n} from "vue-i18n";

const {t} = useI18n()
const { isAuthenticated, token } = useAuthStore()

const route = useRoute();
const project = ref({});
const loading = ref(true);
const error = ref(false);

const arView = ref(null)

const socket = ref(null)
const connected = ref(false)

const terminated = ref(false)

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


const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

async function beforeRedirect(to, from, next) {
  await next(true)
  await sleep(0)
  window.location.reload();
}

onBeforeRouteLeave( (to, from, next)=>{
  beforeRedirect(to, from, next)
})

onBeforeRouteUpdate((to, from, next)=>{
  beforeRedirect(to, from, next)
})

function initSocket() {
  socket.value = new SocketConnection(
      ENDPOINT.replace("/api/", ""),
      "/api/socket",
      {
        transports: ['websocket']
      }
  )

  socket.value.send("presentation:join", route.query.presentation, (data) => {
    if(data.success) {
      connected.value = true
      console.log(arView)
      arView.value.overlayBottom = false
    }
    console.log(data)
  })

  socket.value.addListener("presentation:terminated", (data) => {
    console.log(data)
    connected.value = false
    terminated.value = true
  })
}

function initSocketActionManager() {
  socket.value.socketActionManager = new SocketActionManager(arView.value.arSessionManager)
  socket.value.send("presentation:load")
}


onMounted(() => {

  if(route.query.presentation)
    initSocket()

})


const connectedText = computed(() => {
  if(socket.value?.state?.connected && connected.value)
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
        <div v-if="socket" class="presentationState">
          {{$t("projectView.presentationState")}} : <span v-bind:class="{ danger: !(socket.state.connected && connected), success: socket.state.connected && connected }">{{connectedText}}</span>
        </div>
        <project-detail v-if="!(loading || error)" :project-data="project"></project-detail>
      </section>
      <span></span>
      <section>
        <filled-button-view
            v-if="isAuthenticated"

            icon="/icons/play.svg"
            class="center"
            :text="$t('projectView.startPresentation')"
            @click="router.push({ name: 'presentation' });"/>
        <ar-view
            v-if="!(loading || error)"
            ref="arView"

            :json="project"

            @loaded="socket && initSocketActionManager()"/>
        <project-info v-if="!(loading || error)" :project-info="project"></project-info>
      </section>
    </section>
  </main>

  <div v-if="terminated" class="terminated">
    <h1>👏</h1>
    <p>{{$t('projectView.terminated')}}</p>
    <RouterLink :to="{ name: router.notify, params: route.params}">
      {{$t('projectView.seeProject')}}
    </RouterLink>
  </div>

</template>


<style scoped>

.terminated {
  position: fixed;
  inset: 0;
  background-color: var(--backgroundColor);
  z-index: 1023;

  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10%;
  flex-direction: column;
}

.terminated * {
  text-align: center;
  margin: 5px;
}

.terminated h1 {
  font-size: 3em;
}

.terminated p {
  font-size: 1.3em;
}

.danger {
  color: var(--dangerColor);
}

.success {
  color: var(--succesColor)
}

.center {
  margin: auto;
}

.presentationState{
  margin-bottom: 16px;
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
