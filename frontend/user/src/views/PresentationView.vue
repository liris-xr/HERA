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
import {toast} from "vue3-toastify";
import {generateUUID} from "three/src/math/MathUtils.js";


const { isAuthenticated, token } = useAuthStore()
const {t} = useI18n()

if (!isAuthenticated.value) {
  router.push({ name: "login" })
}

const route = useRoute();
const project = reactive({});
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

const arView = ref(null)

const editingPresets = ref(null)

const removingPreset = ref(null)
const editingPreset = ref(null)
const creatingPreset = ref(null)

let recordTarget = null

const showTerminate = ref(false)
const terminated = ref(false)


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
  Object.assign(project, r)
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

async function showQr() {
  showQrcode.value = true

  // faire en sorte que l'écran ne s'éteigne pas
  wakeLock = await navigator.wakeLock.request("screen")
}

function hideQr() {
  showQrcode.value = false

  wakeLock.release()
}

async function endPresentation() {
  socket.send("presentation:terminate", (data) => {
    if (data.success)
      terminated.value = true
    console.log(data)
  })
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

function removePreset() {

  const index = editingPresets.value.findIndex(el => el.id === removingPreset.value.id)

  if(index !== -1)
    editingPresets.value.splice(index, 1)

  removingPreset.value = null
}

function editPreset() {
  const index = editingPresets.value.findIndex(el => el.id === editingPreset.value.id)

  if(index !== -1)
    editingPresets.value[index] = editingPreset.value

  editingPreset.value = null
}

function createPreset() {

  editingPresets.value.push(creatingPreset.value)

  creatingPreset.value = null

}

async function savePresets() {
  const res = await fetch(`${ENDPOINT}project/${project.id}/presets`,{
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`,
    },
    body: JSON.stringify({presets: editingPresets.value}),
  })

  if(res.ok) {
    project.presets = editingPresets.value
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  editingPresets.value = null
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
          v-if="error">
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

        <div class="topButtons">
          <div class="qrButtonWrapper">
            <filled-button-view
                v-if="isAuthenticated"
                :disabled="!project.published"

                icon="/icons/qrcode.svg"
                :text="$t('presentation.controls.showQrcode')"
                @click="showQr" />
            <span v-if="!project.published" class="danger">{{ $t("presentation.unpublishedWarning") }}</span>
          </div>

          <filled-button-view
              v-if="isAuthenticated"

              icon="/icons/close.svg"
              :text="$t('presentation.controls.terminate')"
              theme="danger"
              @click="showTerminate = true" />
        </div>

        <section class="connectionInfos">
          <p>
            <span v-bind:class="{ danger: !socket.state.connected, success: socket.state.connected }">
              {{connectedText}}
            </span>
             - {{viewerCount}} {{$t("presentation.viewers")}}
          </p>
        </section>

        <section class="presets-section">
          <div class="inline-flex">
            <h3>{{ $t("presentation.sections.presets.title") }}</h3>

            <filled-button-view
                icon="/icons/edit.svg"
                :text="$t('presentation.sections.presets.manageButton')"
                @click="editingPresets = JSON.parse(JSON.stringify(project.presets))" />
          </div>
          <div class="presets">

            <presentation-preset
                v-for="preset in project.presets"
                :preset="preset"

                @triggered="applyPreset(preset)" />


          </div>
        </section>

        <section class="scene">
          <section class="sceneSelection">
            <label for="sceneSelection">{{$t("presentation.currentScene")}}</label>
            <select
                v-if="arView?.arSessionManager?.sceneManager"
                v-model="arView.arSessionManager.sceneManager.activeSceneId"

                id="sceneSelection"
                name="sceneSelection"

                @change="setScene">
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

    <section v-if="socket.recording" class="bottomActionBar">
      <p>{{$t("presentation.sections.presets.recording")}}</p>
      <div>
        <button-view
            :text="$t('presentation.sections.presets.cancel')"
            icon="/icons/back.svg"
            @click="socket.stopRecording()" />

        <filled-button-view
            :text="$t('presentation.sections.presets.confirm')"
            icon="/icons/save.svg"
            @click="recordTarget.actions = socket.stopRecording();" />
      </div>
    </section>

  </main>

  <!-- Interfaces modales -->

  <div class="qrCode" v-if="showQrcode" @click="hideQr">
    <span>{{$t("presentation.brightnessTip")}}</span>
    <qrcode-svg :value="projectUrl" />
    <p>{{$t("presentation.quitQr")}}</p>
  </div>

  <div class="modal" v-if="editingPresets && !socket.recording">
    <div>
      <div class="inline-flex">
        <h3>{{ $t("presentation.sections.presets.managementTitle") }}</h3>
        <button-view icon="/icons/add.svg" @click="creatingPreset = { id: generateUUID() }"></button-view>

      </div>
      <div>
        <presentation-preset-item
          v-if="editingPresets?.length > 0"
          v-for="preset in editingPresets"

          :preset="preset"

          @edit="editingPreset = { ...preset }"
          @remove="removingPreset = preset" />


        <div v-else class="center">
          {{ $t("none") }}
        </div>
      </div>
      <div class="buttons">
        <filled-button-view :text="$t('presentation.sections.presets.save')" @click="savePresets()" />
        <button-view :text="$t('presentation.sections.presets.cancel')" @click="editingPresets = null" />
      </div>
    </div>
  </div>

  <div class="modal" v-if="removingPreset && !socket.recording">
    <div>
      <div class="center">
        <h3>{{ $t("presentation.sections.presets.removeTitle") }}</h3>
        <p class="danger">{{ $t("presentation.sections.presets.removeWarning") }}</p>
      </div>
      <div class="buttons">
        <filled-button-view :text="$t('presentation.sections.presets.confirm')" @click="removePreset()" />
        <button-view :text="$t('presentation.sections.presets.cancel')" @click="removingPreset = null" />
      </div>
    </div>
  </div>

  <div class="modal" v-if="editingPreset && !socket.recording">
    <div>
      <div class="center">
        <h3>{{ $t("presentation.sections.presets.editTitle") }}</h3>
      </div>
      <div class="center">
        <label for="bigText">{{ $t("presentation.sections.presets.icon") }}</label>
        <input type="text" v-model="editingPreset.bigText" name="bigText" id="bigText">
      </div>
      <div class="center">
        <label for="text">{{ $t("presentation.sections.presets.text") }}</label>
        <input type="text" v-model="editingPreset.text" name="text" id="text">
      </div>
      <div class="flex-center inline-flex" style="margin-top: 15px">
        <p>{{ $t("presentation.sections.presets.redefineLabel") }}</p>
        <button-view :text="$t('presentation.sections.presets.redefine')" @click="socket.startRecording(); recordTarget = editingPreset" />
      </div>
      <div class="buttons">
        <filled-button-view :text="$t('presentation.sections.presets.confirm')" @click="editPreset()" />
        <button-view :text="$t('presentation.sections.presets.cancel')" @click="editingPreset = null" />
      </div>
    </div>
  </div>

  <div class="modal" v-if="creatingPreset && !socket.recording">
    <div>
      <div class="center">
        <h3>{{ $t("presentation.sections.presets.createTitle") }}</h3>
      </div>
      <div class="center">
        <label for="bigText">{{ $t("presentation.sections.presets.icon") }}</label>
        <input type="text" v-model="creatingPreset.bigText" name="bigText" id="bigText">
      </div>
      <div class="center">
        <label for="text">{{ $t("presentation.sections.presets.text") }}</label>
        <input type="text" v-model="creatingPreset.text" name="text" id="text">
      </div>
      <div class="flex-center inline-flex" style="margin-top: 15px">
        <p>{{ $t("presentation.sections.presets.defineLabel") }}</p>
        <button-view :text="$t('presentation.sections.presets.define')" @click="socket.startRecording(); recordTarget = creatingPreset" />
      </div>
      <div class="buttons">
        <filled-button-view :text="$t('presentation.sections.presets.confirm')" @click="createPreset()" />
        <button-view :text="$t('presentation.sections.presets.cancel')" @click="creatingPreset = null" />
      </div>
    </div>
  </div>


  <div v-if="terminated" class="terminated">
    <h1>{{$t('presentation.terminated')}}</h1>
    <a href="" @click="router.go()">
      {{$t('presentation.restart')}}
    </a>
    <RouterLink :to="{ name: 'project', params: route.params}">
      {{$t('presentation.seeProject')}}
    </RouterLink>
  </div>

  <div class="modal" v-if="showTerminate">
    <div>
      <div class="center">
        <h3>{{ $t("presentation.controls.terminate") }}</h3>
        <p class="danger">{{ $t("presentation.validateTerminate") }}</p>
      </div>
      <div class="buttons">
        <filled-button-view :text="$t('presentation.sections.presets.confirm')" @click="endPresentation()" />
        <button-view :text="$t('presentation.sections.presets.cancel')" @click="showTerminate = false" />
      </div>
    </div>
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

.terminated p, .terminated a {
  font-size: 1.3em;
}

.bottomActionBar{
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--backgroundColor);
  padding: 16px;
  box-shadow: var(--defaultUniformShadow);
}

.bottomActionBar div {
  display: flex;

}

.bottomActionBar>div>*{
  margin-left: 8px;
}

.center + .center {
  margin-top: 10px;
}

.modal label + input {
  margin-left: 5px;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.center, .center * {
  text-align: center;
}

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

  width: min(700px, 80%);
}

.modal .buttons {
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  gap: 5px;

  margin-top: 15px;
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

.topButtons {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.danger {
  color: var(--dangerColor);
}

.success {
  color: var(--succesColor)
}

section:has(>.item) {
  margin: 0 15px 15px 0;
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
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
}

.scene button {
  font-size: 1.4em;
}

@media only screen and (max-width: 600px) { /* téléphone */

  .topButtons {
    align-items: center;
  }

  .topButtons * {
    font-size: 1.2em;
    padding: 5px;
  }

  .connectionInfos * {
    text-align: center;
    font-size: 1.2em;
    margin-bottom: 2em;
  }

  .presets-section > div:first-child {
    justify-content: center;
  }

  .modal button {
    font-size: 1.2em;
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
