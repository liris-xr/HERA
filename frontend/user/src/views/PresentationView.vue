<script setup>
import ArView from "@/components/arView.vue";
import {computed, onMounted, reactive, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {ENDPOINT} from "@/js/endpoints.js";
import ArNotification from "@/components/notification/arNotification.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import router from "@/router/index.js";
import {useAuthStore} from "@/store/auth.js";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import {SocketConnection} from "@/js/socket/socketConnection.js";
import {useI18n} from "vue-i18n";
import {QrcodeSvg} from "qrcode.vue";
import * as THREE from 'three';
import {SocketActionManager} from "@/js/socket/socketActionManager.js";
import IconSvg from "@/components/icons/IconSvg.vue";

const { isAuthenticated, token } = useAuthStore()
const {t} = useI18n()

if (!isAuthenticated.value) {
  router.push({ name: "login" })
}

const route = useRoute();
const project = ref({});
const loading = ref(true);
const error = ref(false);

const showQrcode = ref(false);
const presentationId = ref(null)

const viewerCount = ref(0)

const socket = reactive(
    new SocketConnection(
        ENDPOINT.replace("/api/", ""),
        "/api/socket",
        {
          auth: {
            token: `Bearer ${token.value}`,
          },
          transports: ['websocket']
        },
    ))

let wakeLock;

const messageInp = ref(null)
const submitMessage = ref(null)

const arView = ref(null)



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

function initSocket() {
  socket.socketActionManager = new SocketActionManager(arView.value.arSessionManager)

  socket.send("presentation:create", {projectId: route.params.projectId}, (data) => {
    console.log(data)
    presentationId.value = data.id;
  })

  socket.addListener("presentation:userCount", (count) => {
    viewerCount.value = count
  })

}

onMounted(() => {

  submitMessage.value.addEventListener("click",() => {

    socket.send("presentation:emit", { message: messageInp.value.value }, (res) => {
      console.log(res)
    })
    messageInp.value.value = "";
  })
})

async function showQr() {
  showQrcode.value = true

  // faire en sorte que l'écran ne s'éteigne pas
  wakeLock = await navigator.wakeLock.request("screen")
}

function hideQr() {
  showQrcode.value = false

  wakeLock.release()
}

function highlight(asset) {
  socket.send("presentation:action:highlight", { assetId: asset.id, value: !asset.highlight ?? true })
}

function toggleVisibility(asset) {
  socket.send("presentation:action:toggle", { assetId: asset.id, value: !asset.hidden ?? false })
}

function setScene(event) {
  socket.send("presentation:action:scene", { sceneId: event.target.value })
}

const connectedText = computed(() => {
  if(socket.state.connected)
    return t("presentation.controls.connected.true");
  return t("presentation.controls.connected.false");
})

const projectUrl = computed(() => {
  const { href } = router.resolve({
    name: "project",
    params: { projectId: route.params.projectId },
  })
  return `${window.location.origin}${href}?presentation=${presentationId.value}`
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

    <h1>{{project.title}}</h1>

    <section class="flex">
      <section class="controls">
        <h1>{{$t("presentation.controls.title")}}</h1>

        <div class="qrButtonWrapper">
          <filled-button-view
              v-if="isAuthenticated"
              :disabled="!project.published"

              icon="/icons/qrcode.svg"
              :text="$t('presentation.controls.showQrcode')"
              @click="showQr" />
          <span v-if="!project.published" class="danger">{{ $t("presentation.unpublishedWarning") }}</span>
        </div>

        <p v-bind:class="{ danger: !socket.state.connected, success: socket.state.connected }">
          {{connectedText}}
        </p>
        <p>
          {{viewerCount}} {{$t("presentation.viewers")}}
        </p>


        <div>
          <input ref="messageInp" placeholder="message">
          <button ref="submitMessage">Envoyer</button>
        </div>

        <section class="sceneSelection">
          <label for="sceneSelection">{{$t("presentation.currentScene")}}</label>
          <select @change="setScene" id="sceneSelection" name="sceneSelection">
            <option
                v-for="scene in arView?.arSessionManager.sceneManager.scenes"
                :value="scene.sceneId"
            >
              {{scene.title}}
            </option>
          </select>
        </section>

        <section>
          <div
              v-if="arView?.arSessionManager?.sceneManager?.active"
              v-for="asset in arView?.arSessionManager?.sceneManager?.active?.getAssets()"
              class="asset">
            <p>{{asset.name}}</p>

            <div class="tools">
              <icon-svg url="/icons/lightbulb.svg" theme="text" class="iconAction" :hover-effect="true" @click="highlight(asset)"/>
              <icon-svg :url="asset.hidden ? '/icons/display_off.svg' : '/icons/display_on.svg' " theme="text" class="iconAction" :hover-effect="true" @click="toggleVisibility(asset)"/>
            </div>
          </div>
        </section>


      </section>
      <span></span>
      <section>
        <h1>{{$t("presentation.sceneTitle")}}</h1>
        <ar-view
            v-if="!(loading || error)"
            ref="arView"
            :json="project"
            @loaded="initSocket"
        />

      </section>
    </section>
  </main>

  <div class="qrCode" v-if="showQrcode" @click="hideQr">
    <span>{{$t("presentation.brightnessTip")}}</span>
    <qrcode-svg :value="projectUrl" />
    <p>{{$t("presentation.quitQr")}}</p>
  </div>
</template>


<style scoped>

.qrCode {
  position: absolute;
  background-color: white;
  inset: 0 0 0 0;

  z-index: 256;

  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
}

.qrCode svg {
  height: 80%;
  width: 80%;
}

.qrCode p {
  font-size: 2em;
}

.qrButtonWrapper {
  display: flex;
  align-items: center;
  gap: 5px;
}

.tools {
  display: flex;
  flex-direction: row;
  gap: 5px;
}

.danger {
  color: var(--dangerColor);
}

.success {
  color: var(--succesColor)
}

section:has(>.asset) {
  margin: 15px
}

.asset {
  background-color: var(--backgroundColor);
  padding: 10px;
  border-radius: 10px;

  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.asset + .asset {
  margin-top: 10px;
}

label + select {
  margin-left: 5px;
}

.sceneSelection {
  margin-top: 10px;
  display: flex;
  justify-content: center;
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
