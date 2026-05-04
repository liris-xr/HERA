<script setup>
import { computed } from "vue";
import { getResource } from "@/js/endpoints.js";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  projectInfo: {
    type: Object,
    required: true,
  },
});

const project = computed(() => props.projectInfo);

const formattedDate = computed(() => {
  if (!project.value.updatedAt) {
    return "";
  }

  const date = new Date(project.value.updatedAt);
  return date.toLocaleDateString(t("locale"));
});

const sceneDescription = computed(() => {
  return t("projectCard.scene", project.value.sceneCount);
});

const pictureSrc = computed(() => {
  if (!project.value.pictureUrl) {
    return null;
  }

  return getResource(project.value.pictureUrl);
});
</script>

<template>
  <section class="projectCard">
    <div class="picture">
      <img
          v-if="pictureSrc"
          :src="pictureSrc"
          :alt="$t('projectCard.pictureAlt')"
      />

      <div v-else class="placeholder">
        <img src="/icons/cube.svg" alt="" />
      </div>
    </div>

    <div class="content">
      <RouterLink :to="{ name: 'project', params: { projectId: project.id } }">
        <h2>{{ project.title }}</h2>
      </RouterLink>

      <span class="date">
        {{ $t("projectCard.updatedOn") }} {{ formattedDate }}
      </span>

      <span class="sceneCount">
        {{ project.sceneCount }} {{ sceneDescription }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.projectCard {
  width: 100%;
  min-height: 140px;
  background-color: var(--backgroundColor);
  border-radius: 16px;
  display: flex;
  flex-direction: row;
  gap: 14px;
  padding: 16px;
  box-shadow: none;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.projectCard:hover {
  background-color: #ffffff;
  transform: translateY(-1px);
}

.picture {
  width: 118px;
  height: 118px;
  flex-shrink: 0;
}

.picture > img,
.placeholder {
  width: 100%;
  height: 100%;
  border-radius: 9px;
}

.picture > img {
  object-fit: cover;
  object-position: center;
  background-color: #e8eef5;
}

.placeholder {
  background-color: #e8eef5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder img {
  width: 32px;
  height: 32px;
  opacity: 0.75;
}

.content {
  min-width: 0;
  flex: 1;
  padding-top: 2px;
  text-align: left;
}

.content a {
  text-decoration: none;
  color: inherit;
}

.content a:hover h2 {
  color: var(--accentColor);
}

.content h2 {
  margin: 0 0 6px;
  color: var(--textColor, #102a43);
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.15;
  word-break: break-word;
}

.date,
.sceneCount {
  display: block;
  margin: 0;
  color: #64748b;
  font-size: 0.98rem;
  line-height: 1.25;
  text-align: left;
}

.date {
  white-space: normal;
}

@media screen and (max-width: 700px) {
  .projectCard {
    min-height: 126px;
    padding: 14px;
    gap: 12px;
  }

  .picture {
    width: 98px;
    height: 98px;
  }

  .content h2 {
    font-size: 1.2rem;
  }

  .date,
  .sceneCount {
    font-size: 0.92rem;
  }
}
</style>