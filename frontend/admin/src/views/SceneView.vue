<script setup>
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from "vue-router";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { ENDPOINT, getResource } from "@/js/endpoints.js";
import { useAuthStore } from "@/store/auth.js";
import InlineTextEdit from "@/components/inlineTextEdit.vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import ButtonView from "@/components/button/buttonView.vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import Notification from "@/components/notification/notification.vue";
import AssetItem from "@/components/listItem/assetItem.vue";
import LabelItem from "@/components/listItem/labelItem.vue";
import { Editor } from "@/js/threeExt/editor.js";
import ExpandableNotification from "@/components/notification/expandableNotification.vue";
import router from "@/router/index.js";
import DeleteConfirmModal from "@/components/modal/deleteConfirmModal.vue";
import TextInputModal from "@/components/modal/textInputModal.vue";
import FileUploadButtonView from "@/components/button/fileUploadButtonView.vue";
import { sleep } from "@/js/utils/sleep.js";
import SaveWarningModal from "@/components/modal/saveWarningModal.vue";
import ButtonTool from "@/components/buttonTool.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import LabelEditModal from "@/components/modal/labelEditModal.vue";
import MaterialView from "@/components/materialView.vue";
import { bytesToMBytes } from "@/js/projectPicture.js";
import EnvmapItem from "@/components/listItem/envmapItem.vue";
import { useI18n } from "vue-i18n";
import { EXRLoader } from "three/addons";
import * as THREE from "three";

const route = useRoute();
const { token } = useAuthStore();
const { t } = useI18n();

const editor = new Editor();

const scene = ref({
  id: "",
  title: "",
  description: "",
  project: { id: "", title: "", unit: "" },
  labels: [],
  assets: [],
  envmapUrl: "",
});

const saved = ref(true);
const saving = ref(false);
const loading = ref(true);
const error = ref(false);
const ready = computed(() => !loading.value && !error.value);

const container = ref(null);

const selectedVariant = ref('original');

// Envmap
const uploadedEnvmap = ref({ rawData: null, tmpUrl: "" });
const MAX_FILE_SIZE = 10; // MB

// UI modals
const showMaterialMenu = ref(false);
const showSceneDeleteModal = ref(false);
const showSceneDuplicateModal = ref(false);
const showLabelEditModal = ref(false);
let lastClickedLabel = null;

// Any edit => unsaved
watch(
    scene,
    () => {
      saved.value = false;
    },
    { deep: true }
);

let variantReloadToken = 0;

watch(selectedVariant, async (val) => {
  const myToken = ++variantReloadToken;

  try {
    const assets = editor.scene?.assetManager?.getAssets?.value ?? [];
    for (const a of assets) {
      if (!a || a.id === "vrCamera") continue;
      if (a.uploadData) continue;

      if (myToken !== variantReloadToken) return;

      await editor.scene.assetManager.reloadAndSwap(editor.scene, a, {
        variantOverride: val,
      });

      a.preferredVariant = val;
    }
  } catch (e) {
    console.error("[toggle selectedVariant] error:", e);
  }
});

async function fetchScene(sceneId) {
  const res = await fetch(`${ENDPOINT}scenes/${sceneId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.value}`,
    },
  });

  if (res.ok) return await res.json();
  const json = await res.json().catch(() => ({}));
  throw new Error(json.error || "Unable to fetch scene");
}

function handleKeydown(event) {
  if (
      (event.keyCode === 46 || event.keyCode === 8) &&
      document.activeElement === document.body &&
      editor.scene?.getSelected?.() != null
  ) {
    editor.scene.removeSelected();
  }

  if (event.keyCode === 68 && event.ctrlKey) {
    event.preventDefault();
    editor.scene.duplicateAsset(editor.scene.getSelected());
  }
}

onMounted(async () => {
  try {
    loading.value = true;
    error.value = false;

    const data = await fetchScene(route.params.sceneId);
    scene.value = data;

    loading.value = false;

    if (!container.value) throw new Error("container is null");

    await editor.init(scene.value, container.value);

    editor.scene.labelManager.onChanged = () => {
      saved.value = false;
    };
    editor.scene.assetManager.onChanged = () => {
      saved.value = false;
    };
    editor.scene.onChanged = () => {
      saved.value = false;
    };
    editor.onChanged = () => {
      saved.value = false;
    };

    await sleep(50);
    saved.value = true;

    window.addEventListener("keydown", handleKeydown);
  } catch (e) {
    console.error(e);
    error.value = true;
    loading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

async function saveScene(sceneData, uploads, envmapFile) {
  const formData = new FormData();

  Object.entries(sceneData).forEach(([key, value]) => {
    if (Array.isArray(value) || typeof value === "object") {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value);
    }
  });

  if (uploads && uploads.length > 0) uploads.forEach((file) => formData.append("uploads", file));
  if (envmapFile != null) formData.append("uploadedEnvmap", envmapFile);

  const res = await fetch(`${ENDPOINT}scenes/${sceneData.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token.value}` },
    body: formData,
  });

  if (res.ok) return res.json();

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    const txt = await res.text().catch(() => "");
    console.error("[SAVE] non-JSON error response:", txt);
    throw new Error(`Unable to save scene (HTTP ${res.status})`);
  }

  console.error("[SAVE] backend error payload:", payload);
  throw new Error(
      payload.details ? `${payload.error} — ${payload.details}` : payload.error || "Unable to save scene"
  );
}

async function saveAll() {
  if (saved.value) return;

  saving.value = true;
  try {
    const resultScene = {
      id: scene.value.id,
      title: scene.value.title,
      description: scene.value.description,
      project: scene.value.project,

      labels: editor.scene.labelManager.getResultLabel(),
      assets: editor.scene.assetManager.getResultAssets(),

      meshes: [],

      vrStartPosition: editor.scene.vrStartPosition,
      envmapUrl: scene.value.envmapUrl || "",
    };

    const uploads = editor.scene.assetManager.getResultUploads();
    const r = await saveScene(resultScene, uploads, uploadedEnvmap.value.rawData);

    uploadedEnvmap.value.rawData = null;
    scene.value.envmapUrl = r.scene.envmapUrl;

    editor.scene.assetManager.setUploaded(r.scene.assets, r.assetsIdMatching);

    await sleep(50);
    saved.value = true;
  } catch (e) {
    alert(e.message || e);
  } finally {
    saving.value = false;
  }
}

// Envmap
async function updateEnvmap(file) {
  if (!file) return;

  const size = bytesToMBytes(file.size);
  if (!file.name.endsWith(".exr")) {
    alert(t("projectView.selectedFile.notAnExrError"));
    uploadedEnvmap.value.rawData = null;
    return;
  }
  if (size > MAX_FILE_SIZE) {
    alert(
        t("projectView.selectedFile.sizeError.part1") +
        " (" +
        size +
        "Mo). " +
        t("projectView.selectedFile.sizeError.part2") +
        " < " +
        MAX_FILE_SIZE +
        "Mo"
    );
    uploadedEnvmap.value.rawData = null;
    return;
  }

  try {
    const url = URL.createObjectURL(file);

    editor.scene.environment = await new EXRLoader().load(url, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
    });

    scene.value.envmapUrl = url;
    uploadedEnvmap.value.rawData = file;
    saved.value = false;
  } catch (e) {
    alert(t("projectView.selectedFile.notAnExrError"));
    uploadedEnvmap.value.rawData = null;
  }
}

function removeEnvmap() {
  scene.value.envmapUrl = "";
  editor.scene.environment = null;
  saved.value = false;
}

// Scene actions
async function deleteScene(sceneObj) {
  const s = sceneObj?.value ?? sceneObj;
  if (!s?.id) {
    alert("Scene id missing");
    return;
  }

  try {
    const res = await fetch(`${ENDPOINT}scenes/${s.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
    });

    if (res.ok) {
      await router.push({ name: "project", params: { projectId: s.project.id } });
      return;
    }

    const result = await res.json().catch(() => ({}));
    throw new Error(result.error || "Unable to delete scene");
  } catch (e) {
    alert(e.message || e);
  }
}

async function duplicateScene(newTitle) {
  try {
    const res = await fetch(`${ENDPOINT}scene/${scene.value.id}/copy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ newTitle }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Unable to duplicate scene");

    await router.push({ name: "scene", params: { sceneId: json.id } });
  } catch (e) {
    alert(e.message || e);
  }
}

function resetVrCamera() {
  if (!editor.scene.vrCamera) return;

  editor.scene.vrStartPosition = {
    position: { x: 0, y: 1.7, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  };

  editor.scene.vrCamera.mesh.position.set(0, 1.7, 0);
  editor.scene.vrCamera.mesh.rotation.set(0, 0, 0);

  saved.value = false;
}

const showSaveWarningModal = ref(false);
let nextRoute = null;

function beforeRedirect(to, from, next) {
  if (!saved.value) {
    showSaveWarningModal.value = true;
    nextRoute = to;
    next(false);
  } else {
    showSaveWarningModal.value = false;
    next();
  }
}

onBeforeRouteLeave((to, from, next) => beforeRedirect(to, from, next));
onBeforeRouteUpdate((to, from, next) => beforeRedirect(to, from, next));

async function confirmLeave() {
  saved.value = true;
  showSaveWarningModal.value = false;
  await router.push(nextRoute);
  window.location.reload();
}

async function confirmLeaveAndSave() {
  await saveAll();
  showSaveWarningModal.value = false;
  await router.push(nextRoute);
  window.location.reload();
}

function cancelLeave() {
  showSaveWarningModal.value = false;
  nextRoute = null;
}

const simplifying = ref(false);

async function simplifyAsset(asset, ratio) {
  if (!asset?.id) return;

  const r = Number.isFinite(Number(ratio))
      ? Math.max(0.01, Math.min(1.0, Number(ratio)))
      : 0.25;

  // must be saved in DB first
  if (String(asset.id).startsWith("new-asset")) {
    await saveAll();
    if (String(asset.id).startsWith("new-asset")) {
      alert("Asset not saved. Please save and try again.");
      return;
    }
  }

  simplifying.value = true;
  try {
    const res = await fetch(`${ENDPOINT}assets/${asset.id}/simplify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ ratio: r }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Simplify failed");

    // backend may return {asset:{...}} or directly {...}
    const a = json.asset ?? json;

    asset.simplifiedUrl = a.simplifiedUrl ?? asset.simplifiedUrl ?? null;
    asset.simplifyRatio = a.simplifyRatio ?? r;

    asset.preferredVariant = selectedVariant.value;
    await editor.scene.assetManager.reloadAndSwap(editor.scene, asset, {
      variantOverride: selectedVariant.value,
    });

    saved.value = false;
  } catch (e) {
    alert(e.message || e);
  } finally {
    simplifying.value = false;
  }
}

function markChang() {
  saved.value = false;
}
</script>

<template>
  <main>
    <form @submit.prevent="saveAll">
      <section ref="box">
        <notification theme="default" icon="/icons/spinner.svg" v-if="loading">
          <template #content><p>{{ $t("sceneView.loadingInfo") }}</p></template>
        </notification>

        <notification theme="danger" icon="/icons/info.svg" v-if="error">
          <template #content>
            <redirect-message>
              <template #content><p>{{ $t("sceneView.loadingError") }}</p></template>
            </redirect-message>
          </template>
        </notification>
      </section>

      <h1 v-if="ready">
        <router-link :to="{ name: 'home' }">{{ $t("sceneView.title.projects") }}</router-link>
        ▸
        <router-link :to="{ name: 'project', params: { projectId: scene.project.id } }">
          {{ scene.project.title }}
        </router-link>
        ▸ {{ $t("sceneView.title.scenes") }} ▸
        {{ scene.title }}
      </h1>

      <section :class="{ invisible: !ready }" class="center">
        <section id="left">
          <h2>{{ $t("sceneView.leftSection.title") }}</h2>

          <div class="inlineFlex">
            <label>{{ scene.project.unit }} :</label>
            <inline-text-edit
                v-model="scene.title"
                :placeholder="$t('sceneView.leftSection.sceneTitle.placeholder')"
                :max-length="255"
            />
          </div>

          <div class="multilineField">
            <div class="inlineFlex">
              <label>{{ $t("sceneView.leftSection.sceneDescription.label") }}</label>
              <label for="desc">
                <icon-svg url="/icons/edit.svg" theme="default" :hover-effect="true" />
              </label>
            </div>
            <textarea
                id="desc"
                v-model="scene.description"
                rows="8"
                :placeholder="$t('sceneView.leftSection.sceneDescription.placeholder')"
            />
          </div>

          <div class="multilineField">
            <div class="inlineFlex">
              <label for="envMap">{{ $t("projectView.leftSection.projectEnvmap.label") }}</label>
              <file-upload-button-view
                  :text="$t('projectView.leftSection.projectEnvmap.uploadButton')"
                  icon="/icons/upload.svg"
                  @fileSelected="(file) => updateEnvmap(file)"
                  :accept="['.exr']"
              />
            </div>

            <envmap-item
                :text="scene.envmapUrl"
                :download-url="scene.envmapUrl"
                :hide-in-viewer="false"
                @delete="removeEnvmap"
            />
          </div>

          <div class="multilineField" v-if="editor.scene?.vrCamera">
            <div class="inlineFlex">
              <label>{{ $t("sceneView.leftSection.sceneCamera.label") }}</label>
            </div>

            <asset-item
                class="sceneItem"
                :text="$t('sceneView.leftSection.sceneCamera.basePosition')"
                :asset="editor.scene.vrCamera"
                :active="editor.scene.vrCamera.isSelected.value"
                :right-menu="false"
                :reset="true"
                @select="editor.scene.setSelected(editor.scene.vrCamera)"
                @reset="resetVrCamera()"
            />
          </div>

          <div class="multilineField">
            <div class="inlineFlex">
              <label>{{ $t("sceneView.leftSection.sceneLabels.label") }}</label>
              <button-view
                  :text="$t('sceneView.leftSection.sceneLabels.addLabelButton')"
                  icon="/icons/add.svg"
                  @click="editor.scene.addNewLabel()"
              />
            </div>

            <div id="labelList">
              <label-item
                  v-for="(labelObj, index) in editor.scene.labelManager.getLabels.value"
                  :key="labelObj.id ?? index"
                  class="sceneItem"
                  :index="index"
                  v-model="labelObj.content.value"
                  :active="labelObj.isSelected.value"
                  @click="editor.scene.setSelected(labelObj)"
                  @delete="editor.scene.removeLabel(labelObj)"
                  @advanced-edit="() => { lastClickedLabel = labelObj; showLabelEditModal = true; }"
              />
              <div v-if="!editor.scene.labelManager.hasLabels.value">
                {{ $t("sceneView.leftSection.sceneLabels.noLabelInfo") }}
              </div>
            </div>
          </div>

          <Teleport to="body">
            <label-edit-modal
                :show="showLabelEditModal && lastClickedLabel != null"
                :label="lastClickedLabel"
                @close="showLabelEditModal = false"
                @confirm="(newLabel) => { editor.scene.labelManager.getSelectedLabel.value.copyContentFrom(newLabel); showLabelEditModal = false; }"
            />
          </Teleport>

          <!-- ASSETS -->
          <div class="multilineField">
            <div class="inlineFlex">
              <span>{{ $t("sceneView.leftSection.sceneAssets.label") }}</span>
              <file-upload-button-view
                  :text="$t('sceneView.leftSection.sceneAssets.addAssetButton')"
                  icon="/icons/upload.svg"
                  @fileSelected="(file) => editor.scene.addNewAsset(file)"
                  :accept="['.glb', '.gltf']"
              />
            </div>

            <div class="inlineFlex" style="gap: 12px">
              <label style="margin-right: 0">Variant</label>
              <select v-model="selectedVariant">
                <option value="original">original</option>
                <option value="n1">n1</option>
                <option value="n2">n2</option>
                <option value="n3">n3</option>
              </select>
            </div>

            <div id="assetList">
              <template v-for="(asset, index) in editor.scene.assetManager.getAssets.value" :key="asset.id ?? index">
                <asset-item
                    v-if="asset.id !== 'vrCamera'"
                    class="sceneItem"
                    :index="index"
                    :text="asset.name"
                    :active-animation="asset.activeAnimation"
                    :download-url="getResource(asset.sourceUrl)"
                    :hide-in-viewer="asset.hideInViewer.value"
                    :active="asset.isSelected.value"
                    :error="asset.hasError.value"
                    :loading="asset.isLoading.value"
                    :asset="asset"
                    @select="editor.scene.setSelected(asset)"
                    @delete="editor.scene.removeAsset(asset)"
                    @duplicate="editor.scene.duplicateAsset(asset)"
                    @animationChanged="(val) => { asset.activeAnimation = val; saved.value = false; }"
                    @hide-in-viewer="() => { asset.switchViewerDisplayStatus(); saved.value = false; }"
                    @changed="markChang"
                    @simplify="({ ratio }) => simplifyAsset(asset, ratio)"
                />
              </template>

              <div v-if="scene.assets.length === 0">
                {{ $t("sceneView.leftSection.sceneAssets.noAssetsInfo") }}
              </div>
            </div>
          </div>

          <div class="inlineFlex">
            <button-view
                :text="$t('sceneView.leftSection.buttons.duplicate')"
                icon="/icons/duplicate.svg"
                @click="showSceneDuplicateModal = true"
            />
            <filled-button-view
                :text="$t('sceneView.leftSection.buttons.delete')"
                theme="danger"
                icon="/icons/delete.svg"
                @click="showSceneDeleteModal = true"
            />
          </div>

          <Teleport to="body">
            <text-input-modal
                :show="showSceneDuplicateModal"
                @close="showSceneDuplicateModal = false"
                :input-placeholder="$t('sceneView.modals.duplicate.inputPlaceholder')"
                :input-title="$t('sceneView.modals.duplicate.inputTitle')"
                :title="$t('sceneView.modals.duplicate.title')"
                @confirm="(value) => duplicateScene(value)"
                :input-default-value="scene.title + ' ' + $t('sceneView.modals.duplicate.inputDefaultValueCopy')"
            />
          </Teleport>

          <Teleport to="body">
            <delete-confirm-modal
                :show="showSceneDeleteModal"
                @close="showSceneDeleteModal = false"
                :title="$t('sceneView.modals.delete.title')"
                @confirm="deleteScene(scene)"
            >
              <template #body>
                <p>{{ $t("sceneView.modals.delete.body.part1") }} <strong>{{ scene.title }}</strong>.</p>
                <p>{{ $t("sceneView.modals.delete.body.part2") }}</p>
              </template>
            </delete-confirm-modal>
          </Teleport>
        </section>

        <span></span>

        <section id="right">
          <h2>{{ $t("sceneView.rightSection.title") }}</h2>

          <div id="previewGroup">
            <div ref="container" id="container"></div>

            <div id="toolGroup">
              <button-tool
                  :current-active="editor.scene.getTransformMode.value"
                  name="translate"
                  @click="editor.scene.setTransformMode('translate')"
              />
              <button-tool
                  :current-active="editor.scene.getTransformMode.value"
                  name="rotate"
                  @click="editor.scene.setTransformMode('rotate')"
              />
              <button-tool
                  :current-active="editor.scene.getTransformMode.value"
                  name="scale"
                  @click="editor.scene.setTransformMode('scale')"
              />
              <button-tool
                  :current-active="showMaterialMenu ? '3d' : 'false'"
                  name="3d"
                  @click="() => { showMaterialMenu = !showMaterialMenu; editor.scene.setMaterialMenu(showMaterialMenu); }"
              />

              <div id="valuesGroup">
                <label for="transformX">x:</label>
                <input
                    type="number"
                    autocomplete="false"
                    id="transformX"
                    name="transformX"
                    v-model="editor.scene.currentSelectedTransformValues.value.x"
                    step="any"
                />
                <label for="transformY">y:</label>
                <input
                    type="number"
                    autocomplete="false"
                    id="transformY"
                    name="transformY"
                    v-model="editor.scene.currentSelectedTransformValues.value.y"
                    step="any"
                />
                <label for="transformZ">z:</label>
                <input
                    type="number"
                    autocomplete="false"
                    id="transformZ"
                    name="transformZ"
                    v-model="editor.scene.currentSelectedTransformValues.value.z"
                    step="any"
                />
              </div>
            </div>
          </div>

          <expandable-notification
              v-for="(err, idx) in editor.scene.getErrors.value"
              :key="idx"
              :title="err.title"
              :text="err.message"
          />
        </section>

        <span></span>

        <section v-if="showMaterialMenu" id="materials">
          <h2>{{ $t("sceneView.materialSection.title") }}</h2>
          <material-view :material-data="editor.scene.currentSelectedMaterialValues.value" />
        </section>
      </section>

      <section v-if="ready" class="bottomActionBar">
        <router-link :to="{ name: 'project', params: { projectId: scene.project.id } }">
          <button-view :text="$t('sceneView.bottomActionBar.backButton')" icon="/icons/back.svg" />
        </router-link>

        <filled-button-view
            :text="saving ? $t('sceneView.bottomActionBar.saveButton.saving') : saved ? $t('sceneView.bottomActionBar.saveButton.saved') : $t('sceneView.bottomActionBar.saveButton.save')"
            :icon="saving ? '/icons/spinner.svg' : saved ? '/icons/checkmarkRounded.svg' : '/icons/save.svg'"
            type="submit"
            :disabled="saving"
        />
      </section>

      <Teleport to="body">
        <save-warning-modal
            :show="showSaveWarningModal"
            :saving="saving"
            @close="cancelLeave"
            @save="confirmLeaveAndSave"
            @dontSave="confirmLeave"
        />
      </Teleport>
    </form>
  </main>
</template>

<style scoped>
#valuesGroup{
  width: 100%;
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: right;
}
#valuesGroup>label{ margin-right: 4px; }
#valuesGroup>input{ width: 64px; margin-right: 16px; }
#toolGroup{ display: flex; }
#previewGroup{
  position: sticky;
  top: 64px;
  margin-bottom: 16px;
  z-index: 2;
  background-color: var(--backgroundColor);
}
#container{
  position: relative;
  border: solid 1px var(--darkerBackgroundColor);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}
h1{
  width: 100%;
  color: var(--textColor);
  font-size: 16px;
  font-weight: normal;
}
form{
  width: 90%;
  margin: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}
.center{
  width: 100%;
  display: flex;
  justify-content: space-between;
  margin-bottom: 64px;
}
@media screen and (min-width: 1200px) { .center>section{ width: 50%; } }
@media screen and (max-width: 1200px) { form{ width: 100%; } .center>section{ width: 50%; } }
@media screen and (max-width: 900px) { .center{ flex-direction: column; } .center>section{ width: 100%; } }

.center>section{
  background-color: var(--backgroundColor);
  border-radius: 16px;
  flex-grow: 1;
  padding: 16px;
}
.center>span{ width: 16px; height: 16px; }

h2{
  color: var(--textImportantColor);
  font-weight: 600;
  margin-bottom: 32px;
}
.inlineFlex{
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 8px;
}
.inlineFlex button{ margin-right: 8px; }
.multilineField{ margin-bottom: 8px; }
label{ margin-right: 16px; font-weight: 500; width: fit-content; }
#labelList{ margin-bottom: 24px; }

textarea{
  width: 100%;
  resize: vertical;
  color: var(--textImportantColor);
  text-align: justify;
  border: solid 1px var(--darkerBackgroundColor);
  border-radius: 4px;
  overflow-x: hidden;
  field-sizing: content;
}
.sceneItem{
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  background-color: var(--darkerBackgroundColor);
  border-radius: 8px;
  margin-bottom: 8px;
  padding: 8px;
}
.sceneItem>div{
  align-items: center;
  height: 100%;
  width: fit-content;
  margin-bottom: 0;
}
.sceneItem>div:last-child{ justify-content: flex-end; }
.sceneItem>div>*{ margin-right: 16px; }

.bottomActionBar{
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  background-color: var(--backgroundColor);
  padding: 16px;
  box-shadow: var(--defaultUniformShadow);
  z-index: 4;
}
.bottomActionBar>*{ margin-left: 8px; }

.invisible{ display: none !important; }
strong{ color: var(--accentColor); }
</style>