<script setup>
import ProjectCard from "@/components/projectCard.vue";
import { ref, computed, onMounted } from "vue";
import { ENDPOINT, getResource } from "@/js/endpoints.js";
import ArNotification from "@/components/notification/arNotification.vue";
import ButtonView from "@/components/utils/buttonView.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import { useAuthStore } from "@/store/auth.js";
import IconSvg from "@/components/icons/IconSvg.vue";

const { isAuthenticated, token } = useAuthStore();

const projects = ref([]);
const loading = ref(false);
const error = ref(false);
const currentPage = ref(0);
const PAGE_LENGTH = 20;
const hasNextPage = ref(false);

const homeSettings = ref({
  title: "Vos projets",
  text: "Découvrez nos projets interactifs en réalité augmentée.",
  imageUrl: "",
});

// fetch home settings
async function fetchHomeSettings() {
  try {
    const res = await fetch(`${ENDPOINT}home-settings`);
    if (res.ok) {
      homeSettings.value = await res.json();
    }
  } catch (e) {
    console.error("failed to load home settings", e);
  }
}

// fetch all projects
async function fetchProjects() {
  loading.value = true;
  error.value = false;

  try {
    const headers = {};
    if (isAuthenticated.value)
      headers["Authorization"] = `Bearer ${token.value}`;

    const res = await fetch(`${ENDPOINT}projects/${currentPage.value}`, {
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
    throw new Error("failed to fetch projects");
  } catch (e) {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadNext() {
  const r = await fetchProjects();
  if (!r) return;
  for (let project of r) {
    // avoid duplicates if any
    if (!projects.value.some((p) => p.id === project.id)) {
      projects.value.push(project);
    }
  }
  currentPage.value++;
  hasNextPage.value = r.length === PAGE_LENGTH;
}

// computed favorites
const favorites = computed(() => {
  return projects.value.filter((p) => p.fav === 1);
});

onMounted(() => {
  fetchHomeSettings();
  loadNext();
});

// scroll to all projects
function scrollToProjects() {
  const el = document.getElementById("all-projects");
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}
</script>

<template>
  <main>
    <div class="center">
    <div class="acc-section-wrapper">
      <div class="home-acc">
        <div class="acc-image">
          <img
            v-if="homeSettings.imageUrl"
            :src="getResource(homeSettings.imageUrl)"
            alt="Banner Image"
          />
          <div v-else class="no-image-placeholder">
            <span>Image</span>
          </div>
        </div>

        <div class="acc-content">
          <h1>{{ homeSettings.title }}</h1>
          <p>{{ homeSettings.text }}</p>
        </div>
      </div>

      <div class="scroll-down-container">
        <a
          href="#all-projects"
          class="scroll-down-btn"
          @click.prevent="scrollToProjects"
        >
          <span>{{ $t("homeView.seeAllOurProjects") }}</span>
          <IconSvg
            url="/icons/arrow_downward.svg"
            class="scroll-down-icon"
          />
        </a>
      </div>
    </div>

    <section class="notification-container">
      <ar-notification
        theme="default"
        icon="/icons/spinner.svg"
        v-if="loading && projects.length === 0"
      >
        <template #content>
          <p>{{ $t("homeView.loadingInfo") }}</p>
        </template>
      </ar-notification>
      <ar-notification theme="danger" icon="/icons/info.svg" v-if="error">
        <template #content>
          <redirect-message>
            <template #content>
              <p>{{ $t("homeView.loadingError") }}</p>
            </template>
          </redirect-message>
        </template>
      </ar-notification>
    </section>

    <section class="projects-section">
      <div class="section-title-row">
        <h2>{{ $t("homeView.ourFavorites") }}</h2>
        <span
          v-if="favorites.length === 0 && !(loading || error)"
          class="empty-text"
        >
          {{ $t("homeView.noFavorites") }}
        </span>
      </div>
      <div class="projects-grid" v-if="favorites.length > 0">
        <project-card
          v-for="project in favorites"
          :key="'fav-' + project.id"
          :project-info="project"
        />
      </div>
    </section>

    <section class="projects-section" id="all-projects">
      <div class="section-title-row">
        <h2>{{ $t("homeView.allOurProjects") }}</h2>
        <span
          v-if="projects.length === 0 && !(loading || error)"
          class="empty-text"
        >
          {{ $t("homeView.noProjects") }}
        </span>
      </div>
      <div class="projects-grid" v-if="projects.length > 0">
        <project-card
          v-for="project in projects"
          :key="'all-' + project.id"
          :project-info="project"
        />
      </div>

      <div class="load-more-container" v-if="hasNextPage">
        <button-view
          :text="$t('projectsView.seeMoreProjectsButton')"
          @click="loadNext"
        ></button-view>
      </div>
    </section>
    </div>
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
}

.center {
  width: 80%;
}

.acc-section-wrapper {
  background-color: var(--backgroundColor);
  border-radius: 24px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.home-acc {
  display: flex;
  flex-direction: row;
  gap: 32px;
  width: 100%;
  align-items: center;
}

@media (max-width: 768px) {
  .home-acc {
    flex-direction: column;
    gap: 20px;
  }
}

.acc-image {
  flex: 1;
  max-width: 40%;
  display: flex;
  justify-content: center;
  align-items: center;
}

@media (max-width: 768px) {
  .acc-image {
    max-width: 100%;
    width: 100%;
  }
}

.acc-image img {
  width: 100%;
  aspect-ratio: 16/10;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.acc-image .no-image-placeholder {
  width: 100%;
  aspect-ratio: 16/10;
  background-color: var(--accentColor);
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
}

.acc-content {
  flex: 1.5;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.acc-content h1 {
  font-size: 2.2rem;
  color: var(--textImportantColor);
  margin: 0;
  font-weight: 700;
}

.acc-content p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--textColor);
  margin: 0;
  white-space: pre-wrap;
}

.scroll-down-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  width: 100%;
}

.scroll-down-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--accentColor);
  font-weight: 600;
  text-decoration: none;
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.scroll-down-btn:hover {
  transform: translateY(5px);
}

.scroll-down-icon {
  width: 32px;
  height: 32px;
  fill: var(--accentColor);
}

.notification-container {
  margin-bottom: 16px;
}

.projects-section {
  background-color: var(--backgroundColor);
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}

.section-title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title-row h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--textImportantColor);
  margin: 0;
}

.empty-text {
  font-size: 0.95rem;
  color: var(--textColor);
  font-style: italic;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  grid-gap: 16px;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>