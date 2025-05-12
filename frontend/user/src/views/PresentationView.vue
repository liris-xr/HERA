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
import PresentationAsset from "@/components/items/PresentationAsset.vue";
import PresentationLabel from "@/components/items/PresentationLabel.vue";
import PresentationPreset from "@/components/items/PresentationPreset.vue";
import PresentationPresetItem from "@/components/items/PresentationPresetItem.vue";
import ButtonView from "@/components/button/buttonView.vue";

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

const showPresetManager = ref(false)


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
  socket.send("presentation:action:highlight", { assetId: asset.id, value: !asset.highlight.value ?? true })
}

function toggleAssetVisibility(asset) {
  socket.send("presentation:action:toggleAsset", { assetId: asset.id, value: asset.hidden.value ?? false })
}

function toggleLabelVisibility(label) {
  socket.send("presentation:action:toggleLabel", { labelId: label.id, value: label.hidden.value })
}

function setScene(event) {
  socket.send("presentation:action:scene", { sceneId: event.target.value })
}

function setActiveAnimation(asset, animation) {
  socket.send("presentation:action:setActiveAnimation", { assetId: asset.id, value: animation })
}

function resetScene() {
  socket.send("presentation:action:reset", {})
}

function applyPreset(preset) {
  for(const action of preset.actions) {
    socket.send(action.event, ...action.args)
  }
}

function showAll() {
  socket.send("presentation:action:showAll", {})
}

function hideAll() {
  socket.send("presentation:action:hideAll", {})
}

function removePreset(preset) {
  console.log('TODO: remove', preset)
}

function editPreset(preset) {
  console.log('TODO: edit', preset)
}

function createPreset() {
  console.log('TODO: create preset')
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

const presetsExample = [
  {
    bigText: "1",
    text: "Mise en place",
    actions: [
      {event: "presentation:action:reset", args: [{}]},
    ]
  },
  {
    bigText: "🛋",
    text: "canapé",
    actions: [
      {event: "presentation:action:reset", args: [{}]},
      {event: "presentation:action:hideAll", args: [{}]},
      {event: "presentation:action:toggleAsset", args: [{assetId: "df389ba9-25d4-47c7-b754-6fb291ed722f", value: true}]}
    ]
  },
  {
    bigText: "⬛",
    text: "cube",
    actions: [
      {event: "presentation:action:reset", args: [{}]},
      {event: "presentation:action:hideAll", args: [{}]},
      {event: "presentation:action:toggleAsset", args: [{assetId: "fc73c9cb-4d3b-4072-8502-07e8eb1e17a0", value: true}]},
      {event: "presentation:action:highlight", args: [{assetId: "fc73c9cb-4d3b-4072-8502-07e8eb1e17a0", value: true}]}
    ]
  },
  {
    bigText: "ME",
    text: "Mise en évidence",
    actions: [
      {event: "presentation:action:reset", args: [{}]}
    ]
  },
  {
    bigText: "IDFUSODFBGYUOUI",
    text: "plein de texte pour observer le comportement de l'interface",
    actions: [
      {event: "presentation:action:reset", args: [{}]}
    ]
  }
]

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

        <section class="connectionInfos">
          <p>
            <span v-bind:class="{ danger: !socket.state.connected, success: socket.state.connected }">
              {{connectedText}}
            </span>
             - {{viewerCount}} {{$t("presentation.viewers")}}
          </p>
        </section>


        <div v-show="false">
          <input ref="messageInp" placeholder="message">
          <button ref="submitMessage">Envoyer</button>
        </div>

        <section class="scene">
          <section class="sceneSelection">
            <label for="sceneSelection">{{$t("presentation.currentScene")}}</label>
            <select @change="setScene" id="sceneSelection" name="sceneSelection" v-if="arView" v-model="arView.arSessionManager.sceneManager.activeSceneId">
              <option
                  v-for="scene in arView?.arSessionManager.sceneManager.scenes"
                  :value="scene.sceneId" >
                {{scene.title}}
              </option>
            </select>
          </section>

          <filled-button-view
              :disabled="!project.published"

              icon="/icons/restart.svg"
              :text="$t('presentation.controls.reset')"
              @click="resetScene" />

          <div class="inline-flex">
            <filled-button-view
                theme="success"
                icon="/icons/display_on.svg"
                :text="$t('presentation.controls.showAll')"
                @click="showAll" />


            <filled-button-view
                theme="danger"
                icon="/icons/display_off.svg"
                :text="$t('presentation.controls.hideAll')"
                @click="hideAll" />
          </div>
        </section>

        <section>
          <div class="inline-flex">
            <h3>{{ $t("presentation.sections.presets.title") }}</h3>

            <filled-button-view
                icon="/icons/edit.svg"
                :text="$t('presentation.sections.presets.manageButton')"
                @click="showPresetManager = true" />
          </div>
          <div class="presets">

            <presentation-preset
                v-for="preset in project.presets"
                :preset="preset"

                @triggered="applyPreset(preset)" />

          </div>
        </section>

        <section>
          <h3>{{ $t("presentation.sections.assets.title") }}</h3>
          <presentation-asset
              v-if="arView?.arSessionManager?.sceneManager?.active?.hasAssets?.()"
              v-for="asset in arView.arSessionManager.sceneManager.active?.getAssets()"
              :asset="asset"

              @highlight="highlight(asset)"
              @toggle-display="toggleAssetVisibility(asset)"
              @set-active-animation="setActiveAnimation(asset, $event)"
          />

          <div v-else>{{$t("none")}}</div>
        </section>

        <section>
          <h3>{{ $t("presentation.sections.labels.title") }}</h3>

          <presentation-label
              v-if="arView?.arSessionManager?.sceneManager?.active?.labelPlayer?.hasLabels"
              v-for="label in arView.arSessionManager.sceneManager.active.labelPlayer.getLabels()"

              :label="label"

              @toggle-display="toggleLabelVisibility(label)" />

          <div v-else>{{$t("none")}}</div>
        </section>


      </section>
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

  <div class="modal" v-if="showPresetManager">
    <div>
      <div class="inline-flex">
        <h3>{{ $t("presentation.sections.presets.managementTitle") }}</h3>
        <button-view icon="/icons/add.svg" @click="createPreset()"></button-view>

      </div>
      <div>
        <presentation-preset-item
          v-for="preset in presetsExample"

          :preset="preset"

          @edit="editPreset(preset)"
          @remove="removePreset(preset)" />
      </div>
    </div>
  </div>
</template>


<style scoped>

.inline-flex {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 5px;
}

.modal {
  position: fixed;
  inset: 0 0 0 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal > div {
  background-color: var(--backgroundColor);
  padding: 25px;
  border-radius: 15px;
}

.presets {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.connectionInfos {
  margin: 5px;
}

section > h3 {
  font-size: 1.2em;
  margin-bottom: 5px;
}

.qrCode {
  position: fixed;
  background-color: white;
  inset: 0 0 0 0;
  padding: 15px;

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

.danger {
  color: var(--dangerColor);
}

.success {
  color: var(--succesColor)
}

section:has(>.item) {
  margin: 15px 15px 15px 0;
}

label + select {
  margin-left: 5px;
}

.sceneSelection {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.sceneSelection label {
  text-decoration: underline;
  font-size: 1.2em;
}

.scene {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
}

.scene button {
  font-size: 1.4em;
}

@media only screen and (max-width: 600px) {

  .qrButtonWrapper {
    justify-content: center;
  }

  .qrButtonWrapper * {
    font-size: 1.2em;
    padding: 5px;
  }

  .connectionInfos * {
    text-align: center;
    font-size: 1.2em;
    margin-bottom: 2em;
  }

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
