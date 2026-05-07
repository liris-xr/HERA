<script setup>
import ProjectCard from "@/components/projectCard.vue";
import { computed, ref } from "vue";
import { ENDPOINT } from "@/js/endpoints.js";
import ArNotification from "@/components/notification/arNotification.vue";
import ButtonView from "@/components/utils/buttonView.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import { useAuthStore } from "@/store/auth.js";
import { includesSearchText, normalizeSearchText } from "@/js/utils/search.js";

const { isAuthenticated, token } = useAuthStore();

const projects = ref([]);
const search = ref("");
const loading = ref(false);
const error = ref(false);
const currentPage = ref(0);

const PAGE_LENGTH = 20;
const hasNextPage = ref(false);

const filteredProjects = computed(() => {
  const query = normalizeSearchText(search.value).trim();

  if (!query) {
    return projects.value;
  }

  return projects.value.filter((project) => {
    const projectName = project.title || project.name || "";
    return includesSearchText(projectName, query);
  });
});

async function fetchProjects() {
  loading.value = true;
  error.value = false;

  try {
    const headers = {};

    if (isAuthenticated.value) {
      headers["Authorization"] = `Bearer ${token.value}`;
    }

    const res = await fetch(`${ENDPOINT}projects/${currentPage.value}`, {
      headers,
    });

    if (!res.ok) {
      throw new Error("Unable to fetch projects");
    }

    return await res.json();
  } catch (e) {
    console.error("[ProjectsView] Failed to fetch projects:", e);
    error.value = true;
    return null;
  } finally {
    loading.value = false;
  }
}

async function loadNext() {
  const data = await fetchProjects();

  if (!data) {
    return;
  }

  projects.value.push(...data);
  currentPage.value++;
  hasNextPage.value = data.length === PAGE_LENGTH;
}

await loadNext();
</script>

<template>
  <main class="projectsView">
    <section class="pageHeader">
      <div class="pageTitle">
        <h1>{{ $t("projectsView.title") }}</h1>
        <p class="subtitle">
          Retrouvez tous les projets 3D et AR disponibles dans HERA.
        </p>
      </div>

      <div class="searchWrapper">
        <input
            v-model="search"
            type="search"
            class="searchInput"
            placeholder="Rechercher un projet..."
        />
      </div>
    </section>

    <section class="notifications">
      <ar-notification
          theme="default"
          icon="/icons/spinner.svg"
          v-if="loading"
      >
        <template #content>
          <p>{{ $t("projectsView.loadingInfo") }}</p>
        </template>
      </ar-notification>

      <ar-notification
          theme="danger"
          icon="/icons/info.svg"
          v-if="error"
      >
        <template #content>
          <redirect-message>
            <template #content>
              <p>{{ $t("projectsView.loadingError") }}</p>
            </template>
          </redirect-message>
        </template>
      </ar-notification>

      <ar-notification
          theme="default"
          icon="/icons/info.svg"
          v-if="!loading && !error && projects.length === 0"
      >
        <template #content>
          <p>Aucun projet disponible.</p>
        </template>
      </ar-notification>

      <ar-notification
          theme="default"
          icon="/icons/info.svg"
          v-if="!loading && !error && projects.length > 0 && filteredProjects.length === 0"
      >
        <template #content>
          <p>Aucun projet ne correspond à votre recherche.</p>
        </template>
      </ar-notification>
    </section>

    <section class="projects" v-if="filteredProjects.length > 0">
      <project-card
          v-for="project in filteredProjects"
          :key="project.id || project.title || project.name"
          :project-info="project"
      />
    </section>

    <div class="loadMoreWrapper" v-if="hasNextPage && !search">
      <button-view
          :text="$t('projectsView.seeMoreProjectsButton')"
          @click="loadNext"
      />
    </div>

    <ar-notification
        theme="default"
        icon="/icons/info.svg"
        v-if="projects.length > 0 && !hasNextPage && !loading && !error"
    >
      <template #content>
        <p>{{ $t("projectsView.noMoreProjectsToShow") }}</p>
      </template>
    </ar-notification>
  </main>
</template>

<style scoped>
.projectsView {
  padding: 22px 28px;
  max-width: 1540px;
  margin: 0 auto;
}

.pageHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 20px;
}

.pageTitle {
  min-width: 0;
}

.pageTitle h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--textColor, #1f3448);
}

.subtitle {
  color: var(--textSecondaryColor, #5f7285);
  margin-top: 6px;
  margin-bottom: 0;
  font-size: 1rem;
}

.searchWrapper {
  width: min(420px, 100%);
  flex-shrink: 0;
}

.searchInput {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid #d8e0e8;
  border-radius: 10px;
  background: white;
  font-size: 0.95rem;
}

.searchInput:focus {
  outline: none;
  border-color: var(--accentColor);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accentColor) 14%, transparent);
}

.notifications {
  margin-bottom: 16px;
}

.projects {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 18px;
  margin-bottom: 22px;
}

.loadMoreWrapper {
  display: flex;
  justify-content: center;
  margin-top: 4px;
  margin-bottom: 18px;
}

@media screen and (max-width: 850px) {
  .pageHeader {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .searchWrapper {
    width: 100%;
  }
}

@media screen and (max-width: 700px) {
  .projectsView {
    padding: 16px;
  }

  .pageTitle h1 {
    font-size: 1.7rem;
  }

  .projects {
    grid-template-columns: 1fr;
  }
}
</style>
