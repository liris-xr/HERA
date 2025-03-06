<script setup>
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute} from "vue-router";
import {computed, onMounted, ref, watch} from "vue";
import {ENDPOINT, getResource} from "@/js/endpoints.js";
import {useAuthStore} from "@/store/auth.js";
import InlineTextEdit from "@/components/inlineTextEdit.vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import ButtonView from "@/components/button/buttonView.vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import Notification from "@/components/notification/notification.vue";
import AssetItem from "@/components/listItem/assetItem.vue";
import LabelItem from "@/components/listItem/labelItem.vue";
import {Editor} from "@/js/threeExt/editor.js";
import ExpandableNotification from "@/components/notification/expandableNotification.vue";
import {label} from "three/nodes";
import router from "@/router/index.js";
import DeleteConfirmModal from "@/components/modal/deleteConfirmModal.vue";
import TextInputModal from "@/components/modal/textInputModal.vue";
import FileUploadButtonView from "@/components/button/fileUploadButtonView.vue";
import {sleep} from "@/js/utils/sleep.js";
import SaveWarningModal from "@/components/modal/saveWarningModal.vue";
import ButtonTool from "@/components/buttonTool.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import LabelEditModal from "@/components/modal/labelEditModal.vue";
import MaterialView from "@/components/materialView.vue";

const route = useRoute();
const {token, userData} = useAuthStore();

const editor = new Editor();

const scene = ref({
  id:"",
  project:{
    unit:""
  },
  labels:[],
  assets:[]
});

const saved = ref(true);
const saving = ref(false);
const container = ref(null);


watch(scene, () => {
    saved.value = false;
}, { deep: true })

const loading = ref(true);
const error = ref(false);
const ready = computed(()=>!loading.value && !error.value);

const showMaterialMenu = ref(false);
const showSceneDeleteModal = ref(false);
const showSceneDuplicateModal = ref(false);
const showLabelEditModal = ref(false);
let lastClickedLabel = null



async function fetchScene(sceneId) {
  loading.value = true;
  error.value = false;
  try {
    const res = await fetch(`${ENDPOINT}scenes/${sceneId}`,
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
    loading.value = false
  }
}


async function deleteScene(scene) {
  try {
    const res = await fetch(`${ENDPOINT}scenes/${scene.id}`,
        {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
          },
        });

    if (res.ok) {
      await router.push({name: "project", params: {projectId: scene.project.id}});
    } else{
      const result = await res.json();
      throw new Error(result.error);
    }
  } catch (e) {
    alert(e)
  }
}

async function duplicateScene(newTitle){
  try {
    const res = await fetch(`${ENDPOINT}scene/${scene.value.id}/copy`,
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
          },
          body: JSON.stringify({
            newTitle:newTitle,
          })
        });

    const newScene = await res.json();
    if (res.ok) {
      await router.push({name: "scene", params: {sceneId: newScene.id}});
    } else{
      throw new Error(newScene.error);
    }
  } catch (e) {
    alert(e)
  }
}


onMounted(async () => {
  scene.value = await fetchScene(route.params.sceneId);

  loading.value = false;

  await editor.init(scene.value,container.value);


  editor.scene.labelManager.onChanged = ()=>{saved.value = false};
  editor.scene.assetManager.onChanged = ()=>{saved.value = false};
  editor.scene.onChanged = ()=>{saved.value = false};
  editor.onChanged = ()=>{saved.value = false};
  await sleep(100);

  saved.value = true;

})



async function saveScene(sceneData, uploads) {
  try {
    const formData = new FormData();

    Object.entries(sceneData).forEach(([key, value]) => {
      if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });


    if (uploads && uploads.length >0) {
      uploads.forEach(file => {
        formData.append('uploads', file);
      });
    }


    const res = await fetch(`${ENDPOINT}scenes/${sceneData.id}`,
    {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${token.value}`,
          },
          body: formData,
        });
    if(res.ok){
      return res.json();
    }
    throw new Error((await res.json()).error);
  } catch (e) {
    alert(e)
    return null
  }
}


async function saveAll(){
  if(saved.value) return
  saving.value = true


  const resultScene = {
    id:scene.value.id,
    title: scene.value.title,
    description: scene.value.description,
    project:scene.value.project,
    labels:editor.scene.labelManager.getResultLabel(),
    assets:editor.scene.assetManager.getResultAssets(),
  };

  const uploads = editor.scene.assetManager.getResultUploads();

  const r = await saveScene(resultScene, uploads);

  if (r != null) {
    await sleep(1000);
    saved.value = true;
    editor.scene.assetManager.setUploaded(r.scene.assets, r.assetsIdMatching)
    // window.location.reload();
  }
  saving.value = false

}








const showSaveWarningModal = ref(false);
let nextRoute = null;


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


function beforeRedirect(to, from, next){
  if (!saved.value) {
    showSaveWarningModal.value = true;
    nextRoute = to;
    next(false);
  } else {
    showSaveWarningModal.value = false;
    next();
  }
}

onBeforeRouteLeave( (to, from, next)=>{
  beforeRedirect(to, from, next)
})

onBeforeRouteUpdate((to, from, next)=>{
  beforeRedirect(to, from, next)
})


</script>

<template>
  <main>
    <form @submit.prevent="saveAll">

      <section>
        <notification
            theme="default"
            icon="/icons/spinner.svg"
            v-if="loading">
          <template #content><p>{{$t("sceneView.loadingInfo")}}</p></template>
        </notification>
        <notification
            theme="danger"
            icon="/icons/info.svg"
            v-if="error">
          <template #content>
            <redirect-message>
              <template #content><p>{{$t("sceneView.loadingError")}}</p></template>
            </redirect-message>
          </template>
        </notification>
      </section>

      <h1 v-if="ready">
        <router-link :to="{name:'home'}">{{$t("sceneView.title.projects")}}</router-link>
        ▸
        <router-link :to="{name:'project', params:{projectId:scene.project.id}}">{{scene.project.title}}</router-link>
        ▸ {{$t("sceneView.title.scenes")}} ▸
        {{scene.title}}
      </h1>
      <section :class="{invisible: !ready}" class="center">
        <section id="left">
          <h2>{{$t("sceneView.leftSection.title")}}</h2>

          <div class="inlineFlex">
            <label>{{scene.project.unit}} :</label>
            <inline-text-edit v-model="scene.title" :placeholder="$t('sceneView.leftSection.sceneTitle.placeholder')" :max-length="255"></inline-text-edit>
          </div>

          <div class="multilineField">
            <div class="inlineFlex">
              <label>{{$t("sceneView.leftSection.sceneDescription.label")}}</label>
              <label for="desc">
                <icon-svg url="/icons/edit.svg" theme="default" :hover-effect="true"></icon-svg>
              </label>
            </div>
            <textarea id="desc" v-model="scene.description" rows="8" :placeholder="$t('sceneView.leftSection.sceneDescription.placeholder')"></textarea>
          </div>



          <div class="multilineField">
            <div class="inlineFlex">
              <label>{{$t("sceneView.leftSection.sceneLabels.label")}}</label>
              <button-view :text="$t('sceneView.leftSection.sceneLabels.addLabelButton')" icon="/icons/add.svg" @click="editor.scene.addNewLabel()"></button-view>
            </div>
            <div id="labelList">
                  <label-item v-for="(label, index) in editor.scene.labelManager.getLabels.value"
                              class="sceneItem"
                              :index="index"
                              v-model="label.content.value"
                              :active="label.isSelected.value"
                              @click="editor.scene.setSelected(label)"
                              @delete="editor.scene.removeLabel(label)"
                              @advanced-edit="()=>{
                                lastClickedLabel = label;
                                showLabelEditModal=true;
                              }"
                  />
                  <div v-if="!editor.scene.labelManager.hasLabels.value">{{$t('sceneView.leftSection.sceneLabels.noLabelInfo')}}</div>
            </div>
          </div>



          <Teleport to="body">
            <label-edit-modal
                :show="showLabelEditModal && lastClickedLabel!=null"
                :label="lastClickedLabel"
                @close="showLabelEditModal = false"
                @confirm="(newLabel)=>{
                  editor.scene.labelManager.getSelectedLabel.value.copyContentFrom(newLabel);
                  showLabelEditModal = false;
                }">
            </label-edit-modal>
          </Teleport>


          <div class="multilineField">
            <div class="inlineFlex">
              <span>{{$t("sceneView.leftSection.sceneAssets.label")}}</span>
             <file-upload-button-view
                 :text="$t('sceneView.leftSection.sceneAssets.addAssetButton')"
                 icon="/icons/upload.svg"
                 @fileSelected="(file)=>{editor.scene.addNewAsset(file)}"
                 :accept="['.glb','.gltf']"
             ></file-upload-button-view>
            </div>
            <div id="assetList">
                <asset-item v-for="(asset, index) in editor.scene.assetManager.getAssets.value"
                            class="sceneItem"
                            :index="index"
                            :text="asset.name"
                            :download-url="getResource(asset.sourceUrl)"
                            :hide-in-viewer="asset.hideInViewer.value"
                            :active="asset.isSelected.value"
                            :error="asset.hasError.value"
                            :loading="asset.isLoading.value"
                            @select="editor.scene.setSelected(asset)"
                            @delete="editor.scene.removeAsset(asset)"
                            @hide-in-viewer="()=>{asset.switchViewerDisplayStatus(); saved = false}"/>
                <div v-if="scene.assets.length==0">{{$t("sceneView.leftSection.sceneAssets.noAssetsInfo")}}</div>
              </div>
            </div>


          <div class="inlineFlex">
            <button-view :text="$t('sceneView.leftSection.buttons.duplicate')" icon="/icons/duplicate.svg" @click="showSceneDuplicateModal = true"></button-view>
            <filled-button-view :text="$t('sceneView.leftSection.buttons.delete')" theme="danger" icon="/icons/delete.svg" @click="showSceneDeleteModal = true"></filled-button-view>
          </div>

          <Teleport to="body">
            <text-input-modal
                :show="showSceneDuplicateModal"
                @close="showSceneDuplicateModal = false"
                :input-placeholder="$t('sceneView.modals.duplicate.inputPlaceholder')"
                :input-title="$t('sceneView.modals.duplicate.inputTitle')"
                :title="$t('sceneView.modals.duplicate.title')"
                @confirm="(value)=>duplicateScene(value)"
                :input-default-value="scene.title+' '+$t('sceneView.modals.duplicate.inputDefaultValueCopy')">


            </text-input-modal>
          </Teleport>


          <Teleport to="body">
            <delete-confirm-modal :show="showSceneDeleteModal" @close="showSceneDeleteModal = false" :title="$t('sceneView.modals.delete.title')" @confirm="deleteScene(scene)">
              <template #body>
                <p>{{$t("sceneView.modals.delete.body.part1")}}<strong>{{scene.title}}</strong>.</p>
                <p>{{$t("sceneView.modals.delete.body.part2")}}</p>
              </template>
            </delete-confirm-modal>
          </Teleport>

        </section>

        <span></span>
        <section id="right">
          <h2>{{$t("sceneView.rightSection.title")}}</h2> 
          <div id="previewGroup">
            <div ref="container" id="container"></div>
            <div id="toolGroup">
              <button-tool :current-active="editor.scene.getTransformMode.value" name="translate" @click="editor.scene.setTransformMode('translate')"></button-tool>
              <button-tool :current-active="editor.scene.getTransformMode.value" name="rotate" @click="editor.scene.setTransformMode('rotate')"></button-tool>
              <button-tool :current-active="editor.scene.getTransformMode.value" name="scale" @click="editor.scene.setTransformMode('scale')"></button-tool>
              <button-tool :current-active="showMaterialMenu ? '3d' : 'false' " name="3d" @click="showMaterialMenu = !showMaterialMenu"></button-tool>

              <div id="valuesGroup">
                <label for="transformX">x:</label>
                <input type="number" autocomplete="false" id="transformX" name="transformX" v-model="editor.scene.currentSelectedValues.value.x" step="any">
                <label for="transformY">y:</label>
                <input type="number" autocomplete="false" id="transformX" name="transformY" v-model="editor.scene.currentSelectedValues.value.y" step="any">
                <label for="transformZ">z:</label>
                <input type="number" autocomplete="false" id="transformZ" name="transformZ" v-model="editor.scene.currentSelectedValues.value.z" step="any">

              </div>
            </div>
          </div>

          <expandable-notification v-for="error in editor.scene.getErrors.value" :title="error.title" :text="error.message"></expandable-notification>
        </section>
        <span> </span>
        
        <section v-if=showMaterialMenu id="materials"> 
          <h2>{{$t("sceneView.materialSection.title")}}</h2> 
          <material-view> </material-view>
        </section>

      </section>

      <section v-if="ready" class="bottomActionBar">
        <router-link :to="{ name: 'project', params: { projectId: scene.project.id } }">
          <button-view :text="$t('sceneView.bottomActionBar.backButton')" icon="/icons/back.svg"/>
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
            @dontSave="confirmLeave">

        </save-warning-modal>
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

#valuesGroup>label{
  margin-right: 4px;
}

#valuesGroup>input{
  width: 64px;
  margin-right: 16px;
}

#toolGroup{
  display: flex;
}


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

@media  screen and (min-width: 1200px) {
  .center>section{
    width: 50%;
  }
}

@media  screen and (max-width: 1200px) {
  form{
    width: 100%;
  }
  .center>section{
    width: 50%;
  }
}

@media  screen and (max-width: 900px) {
  .center{
    flex-direction: column;
  }

  .center>section{
    width: 100%;
  }
}



.center>section{
  background-color: var(--backgroundColor);
  border-radius: 16px;
  flex-grow: 1;
  padding: 16px;
}

.center>span{
  width: 16px;
  height: 16px;
}


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

.inlineFlex button{
  margin-right: 8px;
}

.multilineField{
  margin-bottom: 8px;
}

label{
  margin-right: 16px;
  font-weight: 500;
  width: fit-content;
}

#labelList{
  margin-bottom: 24px;
}

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

img{
  width: 100%;
  border-radius: 4px;
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

.sceneItem>div:last-child{
  justify-content: flex-end;
}

.sceneItem>div>*{
  margin-right: 16px;
}


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

.bottomActionBar>*{
  margin-left: 8px;
}


.invisible{
  display: none !important;
}
strong{
  color: var(--accentColor);
}


h1{
  font-weight: normal;
}

.inlineFlex>span{
  margin-right: 16px;
  font-weight: 500;
}
</style>
