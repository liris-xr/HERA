<script setup>
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute} from "vue-router";
import {computed, ref, watch} from "vue";
import {ENDPOINT, getResource} from "@/js/endpoints.js";
import {useAuthStore} from "@/store/auth.js";
import InlineTextEdit from "@/components/inlineTextEdit.vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import ButtonView from "@/components/button/buttonView.vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import draggable from 'vuedraggable'
import {bytesToMBytes, getProjectPicture} from "@/js/projectPicture.js";
import Notification from "@/components/notification/notification.vue";
import TextInputModal from "@/components/modal/textInputModal.vue";
import router from "@/router/index.js";
import DeleteConfirmModal from "@/components/modal/deleteConfirmModal.vue";
import {sleep} from "@/js/utils/sleep.js";
import SaveWarningModal from "@/components/modal/saveWarningModal.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import {useI18n} from "vue-i18n";
const {t} = useI18n()
const route = useRoute();
const {token, userData} = useAuthStore();

const project = ref({});
const saved = ref(true);

watch(project, () => {
    saved.value = false;
}, { deep: true })

const loading = ref(true);
const saving = ref(false);
const error = ref(false);
const ready = computed(()=>!loading.value && !error.value);

const showSceneAddModal = ref(false);
const showSceneDeleteModal = ref(false);
const lastClickedScene = ref("");

const uploadedPicture = ref({
  rawData:null,
  tmpUrl:"",
})
const MAX_FILE_SIZE = 5; // 5 Mo


async function fetchProject(projectId) {
  loading.value = true;
  error.value = false;
  try {
    const res = await fetch(`${ENDPOINT}users/${userData.value.id}/project/${projectId}`,
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
  }
}

fetchProject(route.params.projectId).then(async (r) => {
  project.value = r
  loading.value = false;
  await sleep(100)
  saved.value = true;
});



function updateImage(event){
  const file = event.target.files[0];
  if (file) {
    const size = bytesToMBytes(file.size)
    if(!file.type.includes("image")){
      alert(t('projectView.selectedFile.notAnImageError'))
      uploadedPicture.value.rawData = null;
      event.target.value = ""
    }else if(size > MAX_FILE_SIZE){
      alert(t('projectView.selectedFile.sizeError.part1')+" ("+size+"Mo). " + t("projectView.selectedFile.sizeError.part2")+" < "+MAX_FILE_SIZE+"Mo");
      uploadedPicture.value.rawData = null;
      event.target.value = ""
    }else{
      uploadedPicture.value.rawData = file
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedPicture.value.tmpUrl = e.target.result;
      };
      reader.readAsDataURL(file);
      saved.value = false;
    }

  }
}

const getImage = computed(()=>
  uploadedPicture.value.rawData != null ? uploadedPicture.value.tmpUrl : getProjectPicture(getResource(project.value.pictureUrl))
)

async function saveProject(projectData,imageFile) {
  try {
    const formData = new FormData();

    Object.entries(projectData).forEach(([key, value]) => {
      if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    if (imageFile != null) {
      formData.append('uploadedCover', imageFile);
    }

    const res = await fetch(`${ENDPOINT}projects/${projectData.id}`,
    {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${token.value}`,
          },
          body: formData,
        });
    const json = await res.json()
    if(res.ok){
      return json;
    }
    throw new Error(json.error);
  } catch (e) {
    alert(e)
    return null
  }
}

async function saveAll(){
  if(saved.value) return
  saving.value = true
  const r = await saveProject(project.value,uploadedPicture.value.rawData);

  if (r) {
    uploadedPicture.value.rawData = null;
    project.value.pictureUrl = r.pictureUrl;
    await sleep(1000);
    saved.value = true;
  }
  saving.value = false

}

async function createScene(sceneTitle) {
  const newScene = {
    title: sceneTitle,
    projectId: project.value.id,
  }

  try {
    const res = await fetch(`${ENDPOINT}scenes`,
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
          },
          body: JSON.stringify(newScene),
        });
    const scene = await res.json();


    if (res.ok) {
      await router.push({name: "scene", params:{sceneId: scene.id}});
    }else
      throw new Error(scene.error);
  } catch (e) {
    alert(e)
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
      saveAll().then(() => {
        window.location.reload();
      })

    } else{
      const result = await res.json();
      throw new Error(result.error);
    }
  } catch (e) {
    alert(e)
  }
}



const showDeleteProjectModal = ref(false);

async function deleteProject(project) {
  try {
    const res = await fetch(`${ENDPOINT}project/${project.id}`,
        {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
          },
        });

    if (res.ok) {
      await router.push({name: "projects"});
      window.location.reload();
    } else{
      const result = await res.json();
      throw new Error(result.error);
    }
  } catch (e) {
    alert(e)
  }
}



const showDuplicateProjectModal = ref(false);

async function duplicateProject(newTitle){
  try {
    const res = await fetch(`${ENDPOINT}project/${project.value.id}/copy`,
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

    const newProject = await res.json();
    if (res.ok) {
      await router.push({name: "project", params: {projectId: newProject.id}});
    } else{
      throw new Error(newProject.error);
    }
  } catch (e) {
    alert(e)
  }
}



const showSaveWarningModal = ref(false);
let nextRoute = null;


async function confirmLeave() {
  saved.value = true;
  showSaveWarningModal.value = false;
  await router.push(nextRoute);
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
            v-if="loading"
        >
          <template #content><p>{{$t("projectView.loadingInfo")}}</p></template>
        </notification>
        <notification
            theme="danger"
            icon="/icons/info.svg"
            v-if="error"
        >
          <template #content>
            <redirect-message>
              <template #content><p>{{$t("projectView.loadingError")}}</p></template>
            </redirect-message>
          </template>
        </notification>
      </section>

      <h1 v-if="ready">
        <router-link :to="{name:'home'}">{{$t("projectView.title.projects")}}</router-link>
        ▸
        {{project.title}}
      </h1>
      <section v-if="ready" class="center">
        <section id="left">
          <h2>{{$t("projectView.leftSection.title")}}</h2>

          <div class="inlineFlex">
            <label for="published">{{$t("projectView.leftSection.publishedStatus.label")}}</label>
            <select v-model="project.published" name="published" id="published">
              <option :value="true">{{$t("projectView.leftSection.publishedStatus.true")}}</option>
              <option :value="false">{{$t("projectView.leftSection.publishedStatus.false")}}</option>
            </select>
          </div>

          <div class="inlineFlex">
            <label for="displayMode">{{$t("projectView.leftSection.mode.label")}}</label>
            <select v-model="project.displayMode" name="displayMode" id="displayMode">
              <option value="ar">AR</option>
              <option value="vr">VR</option>
            </select>
          </div>

          <div class="inlineFlex">
            <label>{{$t("projectView.leftSection.projectTitle.label")}}</label>
            <inline-text-edit v-model="project.title" :placeholder="$t('projectView.leftSection.projectTitle.placeholder')" :max-length="255"></inline-text-edit>
          </div>

          <div class="multilineField">
            <div class="inlineFlex">
              <label>{{$t("projectView.leftSection.projectDescription.label")}}</label>
              <label for="desc">
                <icon-svg url="/icons/edit.svg" theme="default" :hover-effect="true"></icon-svg>
              </label>
            </div>
            <textarea id="desc" v-model="project.description" rows="8" :placeholder="$t('projectView.leftSection.projectDescription.placeholder')"></textarea>
          </div>

          <div class="multilineField">
            <div class="inlineFlex">
              <label for="image">{{$t("projectView.leftSection.projectImage.label")}}</label>
              <input type="file" accept="image/jpg, image/jpeg, image/gif, image/png" @change="updateImage($event)">
            </div>
            <img ref="projectPictureTag" :src="getImage" :alt="$t('projectView.leftSection.title')">
          </div>


          <div class="inlineFlex">
            <button-view :text="$t('projectView.leftSection.buttons.duplicate')" icon="/icons/duplicate.svg" @click="showDuplicateProjectModal = true"></button-view>
            <filled-button-view :text="$t('projectView.leftSection.buttons.delete')" theme="danger" icon="/icons/delete.svg" @click="showDeleteProjectModal = true"></filled-button-view>
          </div>

          <Teleport to="body">
            <text-input-modal
                :show="showDuplicateProjectModal"
                @close="showDuplicateProjectModal = false"
                :input-placeholder="$t('projectView.modals.duplicate.inputPlaceholder')"
                :input-title="$t('projectView.modals.duplicate.inputTitle')"
                :title="$t('projectView.modals.duplicate.title')"
                @confirm="async (newTitle)=>{await duplicateProject(newTitle); showDuplicateProjectModal = false}"
                :input-default-value="project.title+' '+$t('projectView.modals.duplicate.inputDefaultValueCopy')">


            </text-input-modal>
          </Teleport>

          <Teleport to="body">
            <delete-confirm-modal
                :show="showDeleteProjectModal"
                @close="showDeleteProjectModal = false"
                :title="$t('projectView.modals.delete.title')"
                @confirm="deleteProject(project)">
              <template #body>
                <p>{{$t('projectView.modals.delete.body.part1')}}<strong>{{project.title}}</strong>.</p>
                <p>{{$t('projectView.modals.delete.body.part2')}}</p>
              </template>
            </delete-confirm-modal>
          </Teleport>

        </section>

        <span></span>
        <section id="right">
          <h2>{{$t("projectView.rightSection.title")}}</h2>

          <div class="inlineFlex">
            <label>{{$t("projectView.rightSection.projectParameter.label")}}</label>
            <inline-text-edit v-model="project.unit" :placeholder="$t('projectView.rightSection.projectParameter.placeholder')"></inline-text-edit>
          </div>

          <div class="inlineFlex">
            <label>{{$t("projectView.rightSection.projectCalibrationMessage.label")}}</label>
            <inline-text-edit v-model="project.calibrationMessage" :placeholder="$t('projectView.rightSection.projectCalibrationMessage.placeholder')"></inline-text-edit>
          </div>

          <div class="multilineField">
            <div class="inlineFlex">
              <label>{{$t("projectView.rightSection.projectScenes.label")}}</label>
              <button-view :text="$t('projectView.rightSection.projectScenes.buttonText')" icon="/icons/add.svg" @click="showSceneAddModal = true"></button-view>
            </div>

            <Teleport to="body">
              <text-input-modal
                  :show="showSceneAddModal"
                  @close="showSceneAddModal = false"
                  :input-placeholder="$t('projectView.modals.newScene.inputPlaceholder')"
                  :input-title="project.unit"
                  :title="$t('projectView.modals.newScene.title')"
                  @confirm="async (value)=>{await createScene(value); showSceneAddModal = false}"
                  :input-default-value="$t('projectView.modals.newScene.inputDefaultValue')">


              </text-input-modal>
            </Teleport>

            <div id="sceneList">
              <div v-if="project.scenes.length == 0">{{$t("projectView.rightSection.projectScenes.noSceneInfo")}}</div>
              <draggable v-model="project.scenes" handle=".handle">
                <template #item="{element, index}">
                  <div class="sceneItem">
                    <div class="inlineFlex">
                      <span>{{index+1}}</span>
                      <span class="itemTitle">{{element.title}}</span>
                    </div>

                    <div class="inlineFlex">
                      <span>{{element.assets.length +" "+ $t("projectView.rightSection.projectScenes.assetCount", element.assets.length)}}</span>
                      <router-link :to="{ name: 'scene', params: { sceneId: element.id } }">
                        <icon-svg url="/icons/edit.svg" theme="text" class="iconAction" :hover-effect="true"/>
                      </router-link>
                      <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click="() => {showSceneDeleteModal = true; lastClickedScene = element}"/>
                      <icon-svg url="/icons/handle.svg" theme="text" class="handle"/>
                    </div>
                  </div>
                </template>
              </draggable>
            </div>

            <Teleport to="body">
              <delete-confirm-modal
                  :show="showSceneDeleteModal"
                  @close="showSceneDeleteModal = false"
                  :title="$t('projectView.modals.deleteScene.title')"
                  @confirm="deleteScene(lastClickedScene)">
                <template #body>
                  <p>{{$t("projectView.modals.deleteScene.body.part1")}}<strong>{{lastClickedScene.title}}</strong>.</p>
                  <p>{{$t("projectView.modals.deleteScene.body.part2")}}</p>
                </template>
              </delete-confirm-modal>
            </Teleport>

          </div>
        </section>
      </section>

      <section v-if="ready" class="bottomActionBar">
        <router-link :to="{name: 'home'}">
          <button-view :text="$t('projectView.bottomActionBar.backButton')" icon="/icons/back.svg"/>
        </router-link>
        <filled-button-view
            :text="saving ? $t('projectView.bottomActionBar.saveButton.saving') : saved ? $t('projectView.bottomActionBar.saveButton.saved') : $t('projectView.bottomActionBar.saveButton.save')"
            :icon="saving ? '/icons/spinner.svg' : saved ? '/icons/checkmarkRounded.svg' : '/icons/save.svg'" type="submit"
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

h1{
  width: 100%;
  color: var(--textColor);
  font-size: 16px;
}




form{
  width: 80%;
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
  height:16px;
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

.itemTitle{
  color: var(--textImportantColor);
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

.iconAction{
  cursor: pointer;
}

.sceneItem>div>*{
  margin-right: 8px;
}

.handle{
  cursor: grab;
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
}

.bottomActionBar>*{
  margin-left: 8px;
}

strong{
  color: var(--accentColor);
}

h1{
  font-weight: normal;
}

</style>
