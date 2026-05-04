<script setup>
import { computed } from "vue";
import { getResource } from "@/js/endpoints.js";

const props = defineProps({
  projectData: {
    type: Object,
    required: true,
  },
});

const project = computed(() => props.projectData);

const pictureSrc = computed(() => {
  if (!project.value.pictureUrl) {
    return null;
  }

  return getResource(project.value.pictureUrl);
});
</script>

<template>
  <div class="projectDetail">
    <div class="imageWrapper">
      <img
          v-if="pictureSrc"
          :src="pictureSrc"
          :alt="$t('projectView.projectDetail.pictureAlt')"
      />

      <div v-else class="placeholder">
        <img src="/icons/cube.svg" alt="" />
      </div>
    </div>

    <p class="description">
      {{ project.description || "Aucune description disponible." }}
    </p>
  </div>
</template>

<style scoped>
.projectDetail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.imageWrapper {
  width: 100%;
  height: 170px;
  border-radius: 12px;
  overflow: hidden;
  background: #e8eef5;
}

.imageWrapper > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  background: #e8eef5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder img {
  width: 42px;
  opacity: 0.7;
}

.description {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.35;
}

@media screen and (max-width: 760px) {
  .imageWrapper {
    height: 150px;
  }
}
</style>