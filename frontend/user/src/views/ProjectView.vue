<script setup>
import ArView from "@/components/arView.vue";
import ProjectDetail from "@/components/projectDetail.vue";
import { computed, onMounted, ref } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import { ENDPOINT } from "@/js/endpoints.js";
import ArNotification from "@/components/notification/arNotification.vue";
import ProjectInfo from "@/components/projectInfo.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import { useAuthStore } from "@/store/auth.js";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import { SocketConnection } from "@/js/socket/socketConnection.js";
import { SocketActionManager } from "@/js/socket/socketActionManager.js";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { isAuthenticated, token } = useAuthStore();

const route = useRoute();
const router = useRouter();

const project = ref({});
const loading = ref(true);
const error = ref(false);

const arView = ref(null);
const socket = ref(null);
const connected = ref(false);
const terminated = ref(false);

async function fetchProject(projectId) {
  loading.value = true;
  error.value = false;

  try {
    const headers = {};

    if (isAuthenticated.value) {
      headers["Authorization"] = `Bearer ${token.value}`;
    }

    const res = await fetch(`${ENDPOINT}project/${projectId}`, { headers });

    if (!res.ok) {
      throw new Error("Unable to fetch project");
    }

    project.value = await res.json();
  } catch (e) {
    console.error("[ProjectView] Failed to fetch project:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
}

fetchProject(route.params.projectId);

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

async function beforeRedirect(to, from, next) {
  await next(true);
  await sleep(0);
  window.location.reload();
}

onBeforeRouteLeave((to, from, next) => {
  beforeRedirect(to, from, next);
});

onBeforeRouteUpdate((to, from, next) => {
  beforeRedirect(to, from, next);
});

function initSocket() {
  socket.value = new SocketConnection(
      ENDPOINT.replace("/api/", ""),
      "/api/socket",
      { transports: ["websocket"] }
  );

  socket.value.send("presentation:join", route.query.presentation, (data) => {
    if (data.success) {
      connected.value = true;

      if (arView.value) {
        arView.value.overlayBottom = false;
      }
    }

    console.log(data);
  });

  socket.value.addListener("presentation:terminated", (data) => {
    console.log(data);
    connected.value = false;
    terminated.value = true;
  });
}

function initSocketActionManager() {
  if (!socket.value || !arView.value) {
    return;
  }

  socket.value.socketActionManager = new SocketActionManager(
      arView.value.arSessionManager
  );

  socket.value.send("presentation:load");
}

onMounted(() => {
  if (route.query.presentation) {
    initSocket();
  }
});

const connectedText = computed(() => {
  if (socket.value?.state?.connected && connected.value) {
    return t("presentation.controls.connected.true");
  }

  return t("presentation.controls.connected.false");
});

const sceneCount = computed(() => {
  return (
      project.value?.sceneCount ??
      project.value?.scenes?.length ??
      project.value?.Scenes?.length ??
      project.value?.ArScenes?.length ??
      0
  );
});
</script>

<template>
  <main class="projectView">
    <section class="notifications">
      <ar-notification
          theme="default"
          icon="/icons/spinner.svg"
          v-if="loading"
      >
        <template #content>
          <p>{{ $t("projectView.loadingInfo") }}</p>
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
              <p>{{ $t("projectView.loadingError") }}</p>
            </template>
          </redirect-message>
        </template>
      </ar-notification>
    </section>

    <section class="projectLayout" v-if="!(loading || error)">
      <section class="viewerPanel">
        <div class="viewerCard">
          <ar-view
              ref="arView"
              :json="project"
              @loaded="socket && initSocketActionManager()"
          />
        </div>
      </section>

      <aside class="sidePanel">
        <div class="rightCard">
          <p class="eyebrow">Projet HERA</p>

          <h1>{{ project.title }}</h1>

          <p class="projectSubtitle">
            {{ sceneCount }} scène{{ sceneCount > 1 ? "s" : "" }}
            disponible{{ sceneCount > 1 ? "s" : "" }} pour la visualisation AR.
          </p>

          <project-detail :project-data="project" />

          <hr />

          <project-info :project-info="project" />

          <div v-if="socket" class="presentationState">
            {{ $t("projectView.presentationState") }} :
            <span
                :class="{
                danger: !(socket.state.connected && connected),
                success: socket.state.connected && connected
              }"
            >
              {{ connectedText }}
            </span>
          </div>

          <filled-button-view
              v-if="isAuthenticated"
              icon="/icons/play.svg"
              class="presentationButton"
              :text="$t('projectView.startPresentation')"
              @click="router.push({ name: 'presentation' })"
          />
        </div>
      </aside>
    </section>
  </main>

  <div v-if="terminated" class="terminated">
    <h1>👏</h1>
    <p>{{ $t("projectView.terminated") }}</p>

    <RouterLink :to="{ name: 'project', params: route.params }">
      {{ $t("projectView.seeProject") }}
    </RouterLink>
  </div>
</template>

<style scoped>
.projectView {
  padding: 20px 26px;
  max-width: 1560px;
  margin: 0 auto;
}

.notifications {
  margin-bottom: 16px;
}

.projectLayout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.65fr);
  gap: 22px;
  align-items: start;
}

.viewerPanel,
.sidePanel {
  min-width: 0;
}

.viewerCard {
  background-color: var(--backgroundColor);
  border-radius: 18px;
  overflow: hidden;
  height: min(600px, calc(100vh - 155px));
  min-height: 460px;
}

.rightCard {
  background-color: var(--backgroundColor);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rightCard hr {
  border: none;
  height: 1px;
  background: #e5eaf0;
  margin: 4px 0;
}

.eyebrow {
  margin: 0;
  color: var(--accentColor);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rightCard h1 {
  margin: 0;
  color: var(--textColor, #102a43);
  font-size: 2rem;
  font-weight: 750;
  line-height: 1.1;
  word-break: break-word;
}

.projectSubtitle {
  margin: 0;
  color: #64748b;
  font-size: 1rem;
  line-height: 1.35;
}

.presentationState {
  color: #64748b;
  font-weight: 600;
}

.presentationButton {
  width: fit-content;
}

.danger {
  color: var(--dangerColor);
}

.success {
  color: var(--succesColor);
}

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

.terminated p {
  font-size: 1.3em;
}

.terminated a {
  color: var(--accentColor);
  font-weight: 700;
  text-decoration: none;
}

.terminated a:hover {
  text-decoration: underline;
}

@media screen and (max-width: 1050px) {
  .projectLayout {
    grid-template-columns: 1fr;
  }

  .viewerCard {
    height: 560px;
    min-height: 460px;
  }
}

@media screen and (max-width: 760px) {
  .projectView {
    padding: 14px;
  }

  .projectLayout {
    gap: 16px;
  }

  .viewerCard {
    height: 460px;
    min-height: 380px;
    border-radius: 14px;
  }

  .rightCard {
    border-radius: 14px;
    padding: 16px;
  }

  .rightCard h1 {
    font-size: 1.55rem;
  }

  .projectSubtitle {
    font-size: 0.95rem;
  }
}

@media screen and (max-width: 480px) {
  .projectView {
    padding: 12px;
  }

  .viewerCard {
    height: 340px;
    min-height: 360px;
  }
}
</style>