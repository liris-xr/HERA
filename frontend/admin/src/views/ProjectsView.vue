<script setup>
import ProjectCard from "@/components/projectCard.vue";
import { ref, onMounted } from "vue";
import { ENDPOINT, getResource } from "@/js/endpoints.js";
import ButtonView from "@/components/button/buttonView.vue";
import Notification from "@/components/notification/notification.vue";
import { useAuthStore } from "@/store/auth.js";
import { useRouter } from "vue-router/dist/vue-router";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import TextInputModal from "@/components/modal/textInputModal.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import { useI18n } from "vue-i18n";
import IconSvg from "@/components/icons/IconSvg.vue";

const { isAuthenticated, token, userData } = useAuthStore();
const router = useRouter();
const { t } = useI18n();

if (!isAuthenticated.value) {
  router.push({ name: "login" });
}

const projects = ref([]);
// default loading
const loading = ref(true);
const error = ref(false);
const currentPage = ref(0);
const PAGE_LENGTH = 20;
const hasNextPage = ref(false);

const homeSettings = ref({
  title: "Vos projets",
  text: "Découvrez nos projets interactifs en réalité augmentée.",
  imageUrl: "",
});

const lastSavedSettings = ref({
  title: "Vos projets",
  text: "Découvrez nos projets interactifs en réalité augmentée.",
  imageUrl: "",
});

const homeImageInput = ref(null);
const savingHomeSettings = ref(false);
const showAppliedSuccess = ref(false);

// fetch home settings
async function fetchHomeSettings() {
  try {
    const res = await fetch(`${ENDPOINT}home-settings`);
    if (res.ok) {
      const data = await res.json();
      homeSettings.value = data;
      lastSavedSettings.value = { ...data };
    }
  } catch (e) {
    console.error(e);
  }
}

// restore settings
function restoreHomeSettings() {
  homeSettings.value = { ...lastSavedSettings.value };
}

// save settings
async function saveHomeSettings() {
  savingHomeSettings.value = true;
  try {
    const res = await fetch(`${ENDPOINT}home-settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({
        title: homeSettings.value.title,
        text: homeSettings.value.text,
        imageUrl: homeSettings.value.imageUrl,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      lastSavedSettings.value = { ...data };
      showAppliedSuccess.value = true;
      setTimeout(() => {
        showAppliedSuccess.value = false;
      }, 3000);
    }
  } catch (e) {
    console.error(e);
  } finally {
    savingHomeSettings.value = false;
  }
}

// trigger file input
function triggerImageUpload() {
  if (homeImageInput.value) {
    homeImageInput.value.click();
  }
}

// upload image
async function onImageUploaded(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  savingHomeSettings.value = true;
  try {
    const res = await fetch(`${ENDPOINT}home-settings/image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      homeSettings.value.imageUrl = data.url;
    }
  } catch (err) {
    console.error(err);
  } finally {
    savingHomeSettings.value = false;
  }
}

// remove image
function removeImage() {
  homeSettings.value.imageUrl = "";
}

async function fetchProjects() {
  loading.value = true;
  error.value = false;

  try {
    const res = await fetch(
      `${ENDPOINT}users/${userData.value.id}/projects/${currentPage.value}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
      },
    );
    if (res.ok) {
      return await res.json();
    }
    throw new Error("ko");
  } catch (e) {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadNext() {
  fetchProjects().then((r) => {
    if (!r) return;
    for (let project of r) {
      projects.value.push(project);
    }
    currentPage.value++;
    hasNextPage.value = r.length === PAGE_LENGTH;
  });
}

onMounted(() => {
  fetchHomeSettings();
  loadNext();
});

const showProjectModal = ref(false);
async function createProject(title) {
  const project = {
    title: title,
    description: "",
    unit: t("defaultProjectSettings.unit"),
    calibrationMessage: t("defaultProjectSettings.calibrationMessage"),
  };

  try {
    const res = await fetch(`${ENDPOINT}project`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(project),
    });
    if (res.ok) {
      const newProject = await res.json();
      await router.push({
        name: "project",
        params: { projectId: newProject.id },
      });
    }
    throw new Error("ko");
  } catch (e) {
    error.value = true;
  }
}
</script>

<template>
  <main>
    <section class="center">
      <!-- home settings editor section -->
      <div class="home-acc-editor">
        <div class="acc-image">
          <div v-if="homeSettings.imageUrl" class="image-preview-container">
            <img :src="getResource(homeSettings.imageUrl)" alt="Banner Image" />
            <button
              class="remove-img-btn"
              @click="removeImage"
              title="Supprimer l'image"
            > 
              ×
            </button>
          </div>
          <div
            v-else
            class="image-placeholder-upload"
            @click="triggerImageUpload"
          >
            <input
              type="file"
              ref="homeImageInput"
              style="display: none"
              accept="image/*"
              @change="onImageUploaded"
            />
            <span class="whiteText">Image</span>
          </div>
        </div>

        <div class="acc-content">
          <div class="editor-header-label">
            {{ $t("projectsView.homeEditor.title") }}
          </div>

          <div class="editor-field">
            <label>{{ $t("projectsView.homeEditor.fieldTitle") }}</label>
            <textarea
              class="preview-title-input"
              v-model="homeSettings.title"
              rows="1"
              placeholder="Titre de la page d'accueil"
            ></textarea>
          </div>

          <div class="editor-field">
            <label>{{ $t("projectsView.homeEditor.fieldText") }}</label>
            <textarea
              class="preview-desc-input"
              v-model="homeSettings.text"
              rows="4"
              placeholder="Description ou texte de présentation du site"
            ></textarea>
          </div>

          <div class="editor-actions-row">
            <button
              class="editor-btn secondary-btn"
              :disabled="savingHomeSettings"
              @click="restoreHomeSettings"
            >
              <IconSvg url="/icons/restart.svg" theme="text" :size="16" />
              <span>{{ $t("projectsView.homeEditor.restore") }}</span>
            </button>
            <button
              class="editor-btn primary-btn"
              :disabled="savingHomeSettings"
              @click="saveHomeSettings"
            >
              <IconSvg url="/icons/save.svg" theme="background" :size="16" />
              <span class="whiteText">{{
                $t("projectsView.homeEditor.save")
              }}</span>
            </button>
            <span v-if="showAppliedSuccess" class="applied-success-msg">
              {{ $t("projectsView.homeEditor.appliedSuccess") }}
            </span>
          </div>
        </div>
      </div>

      <!-- <hr class="editor-divider" /> -->

      <section class="projects-container">
      <div class="titleContainer">
        <h1>{{ $t("projectsView.title") }}</h1>
        <filled-button-view
          :text="$t('projectsView.newProject.button')"
          icon="/icons/add.svg"
          @click="showProjectModal = true"
        />
      </div>
      <section class="projects" v-if="!(loading || error)">
        <project-card
          v-for="project in projects"
          :project-info="project"
        ></project-card>
      </section>
      </section>

      <Teleport to="body">
        <text-input-modal
          :show="showProjectModal"
          @close="showProjectModal = false"
          :input-placeholder="
            $t('projectsView.newProject.modal.inputPlaceholder')
          "
          :input-title="$t('projectsView.newProject.modal.inputTitle')"
          :title="$t('projectsView.newProject.modal.title')"
          @confirm="(title) => createProject(title)"
          :input-default-value="
            $t('projectsView.newProject.modal.inputDefaultValue')
          "
        >
        </text-input-modal>
      </Teleport>

      
      <button-view
        v-if="hasNextPage"
        :text="$t('projectsView.seeMoreProjectsButton')"
        @click="loadNext"
      ></button-view>

      <section>
        <notification theme="default" icon="/icons/spinner.svg" v-if="loading">
          <template #content
            ><p>{{ $t("projectsView.loadingInfo") }}</p></template
          >
        </notification>
        <notification theme="danger" icon="/icons/info.svg" v-if="error">
          <template #content>
            <redirect-message>
              <template #content
                ><p>{{ $t("projectsView.loadingError") }}</p></template
              >
            </redirect-message>
          </template>
        </notification>
        <notification
          theme="default"
          icon="/icons/info.svg"
          v-if="!hasNextPage && !(loading || error)"
        >
          <template #content
            ><p>{{ $t("projectsView.noMoreProjectsToShow") }}</p></template
          >
        </notification>
      </section>
    </section>
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.center {
  width: 80%;
}

.projects-container {
  background-color: var(--backgroundColor);
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}

.projects {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  grid-gap: 16px;
  flex-grow: 1;
}

.titleContainer {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  align-items: center;
}

/* editor section styles */
.home-acc-editor {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 32px;
  margin-top: 24px;
  margin-bottom: 24px;
  background: var(--backgroundColor);
  border: 1px solid var(--darkerBackgroundColor);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.acc-image {
  flex: 0 0 300px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.acc-image img {
  width: 100%;
  height: auto;
  border-radius: 20px;
  object-fit: cover;
}

.image-placeholder-upload {
  width: 300px;
  height: 180px;
  border-radius: 12px;
  background-color: var(--accentColor);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1.25rem;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.image-placeholder-upload:hover {
  opacity: 0.9;
}

.image-preview-container {
  position: relative;
  width: 100%;
}

.remove-img-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--dangerColor);
  color: white;
  border: none;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.remove-img-btn:hover {
  transform: scale(1.1);
}

.acc-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-header-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accentColor);
  text-transform: uppercase;
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.editor-field {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.editor-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--textColor);
  margin-bottom: 6px;
  display: block;
}

.preview-title-input,
.preview-desc-input {
  border: 1px solid var(--darkerBackgroundColor);
  border-radius: 8px;
  font-family: inherit;
  font-size: 1rem;
  width: 100%;
  resize: vertical;
  padding: 10px;
  box-sizing: border-box;
  background: #fafafa;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.preview-title-input:focus,
.preview-desc-input:focus {
  border-color: var(--accentColor);
  box-shadow: 0 0 0 3px rgba(63, 155, 240, 0.1);
}

.editor-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.editor-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
}

.whiteText {
  color: white;
}

.applied-success-msg {
  color: var(--successColor);
  font-weight: 600;
  font-size: 0.95rem;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.primary-btn {
  background-color: var(--accentColor);
  color: #fff;
  border: 1px solid var(--accentColor);
}

.primary-btn:hover {
  opacity: 0.9;
}

.secondary-btn {
  background-color: transparent;
  color: var(--textColor);
  border: 1px solid var(--darkerBackgroundColor);
}

.secondary-btn:hover {
  background-color: var(--darkerBackgroundColor);
}

.editor-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.editor-divider {
  border: none;
  border-top: 8px solid var(--textImportantColor);
  margin-top: 16px;
  margin-bottom: 32px;
  width: 100%;
}

@media (max-width: 768px) {
  .home-acc-editor {
    flex-direction: column;
    padding: 24px;
    gap: 24px;
  }
  .acc-image {
    flex: none;
    width: 100%;
    max-width: 300px;
  }
}
</style>
