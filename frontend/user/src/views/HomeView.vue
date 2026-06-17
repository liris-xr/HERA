<script setup>
import ProjectCard from "@/components/projectCard.vue";
import { ref, computed, onMounted, onUnmounted } from "vue";
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

function handleGlobalFavToggled(e) {
  const proj = projects.value.find((p) => p.id === e.detail.projectId);
  if (proj) {
    proj.fav = e.detail.fav;
  }
}

const showScrollBtn = ref(true);
function handleScroll() {
  showScrollBtn.value = window.scrollY < 200;
}

onMounted(() => {
  fetchHomeSettings();
  loadNext();
  window.addEventListener("project-fav-toggled", handleGlobalFavToggled);
  window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  window.removeEventListener("project-fav-toggled", handleGlobalFavToggled);
  window.removeEventListener("scroll", handleScroll);
});

// scroll to favorites
function scrollToFavorites() {
  const el = document.getElementById("favorites-section");
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

        <h1>{{ homeSettings.title }}</h1>
        <p>{{ homeSettings.text }}</p>
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

    <section class="projects-section" id="favorites-section">
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

    <Transition name="fade">
      <div v-if="showScrollBtn" class="scroll-down-container">
        <a
          href="#favorites-section"
          class="scroll-down-btn"
          @click.prevent="scrollToFavorites"
        >
          <span>{{ $t("homeView.seeOurProjects") }}</span>
          <IconSvg
            url="/icons/arrow_downward.svg"
            theme="background"
            :size="20"
          />
        </a>
      </div>
    </Transition>
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
  display: block;
  width: 100%;
}

.acc-image {
  float: left;
  width: 40%;
  margin-right: 32px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .acc-image {
    float: none;
    width: 100%;
    margin-right: 0;
    margin-bottom: 20px;
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

.home-acc h1 {
  font-size: 2.2rem;
  color: var(--textImportantColor);
  margin-top: 0;
  margin-bottom: 16px;
  font-weight: 700;
}

.home-acc p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--textColor);
  margin: 0;
  white-space: pre-wrap;
}

.scroll-down-container {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 1000;
}

.scroll-down-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  background-color: var(--accentColor);
  color: white;
  padding: 12px 24px;
  border-radius: 50px;
  font-weight: 600;
  text-decoration: none;
  font-size: 0.95rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.scroll-down-btn span {
  color: white !important;
}

.scroll-down-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  filter: brightness(110%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
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