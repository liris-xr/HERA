<script setup>
import {ref, computed} from "vue";
import {getResource, ENDPOINT} from "@/js/endpoints.js";
import {useI18n} from "vue-i18n";
import {useAuthStore} from "@/store/auth.js";
import IconSvg from "@/components/icons/IconSvg.vue";

const {t} = useI18n()
const {isAuthenticated, token, userData} = useAuthStore()

const props = defineProps({
  projectInfo:{type:Object,required:true},
});

const project = ref(props.projectInfo);

const date = new Date(project.value.updatedAt);

const sceneDescription = t("projectCard.scene", project.value.sceneCount);

const isOwner = computed(() => {
  return isAuthenticated.value && userData.value && userData.value.id === project.value.userId;
});

// toggle favorite
async function toggleFav() {
  const newFav = project.value.fav === 1 ? 0 : 1
  const temp = { ...project.value, scenes: undefined }
  temp.fav = newFav

  try {
    const res = await fetch(`${ENDPOINT}projects/${project.value.id}`, {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
      },
      body: JSON.stringify(temp),
    })
    if (res.ok) {
      const data = await res.json()
      project.value.fav = data.fav
    }
  } catch (e) {
    console.error(e)
  }
}

// toggle publication
async function togglePublished() {
  const newPublished = !project.value.published
  const temp = { ...project.value, scenes: undefined }
  temp.published = newPublished

  try {
    const res = await fetch(`${ENDPOINT}projects/${project.value.id}`, {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
      },
      body: JSON.stringify(temp),
    })
    if (res.ok) {
      const data = await res.json()
      project.value.published = data.published;
    }
  } catch (e) {
    console.error(e)
  }
}

</script>

<template>
  <section class="project-card-container">
    <div id="picture">
      <img :src="getResource(project.pictureUrl)" :alt="$t('projectCard.pictureAlt')">
    </div>

    <div id="content">
      <div class="card-header-row">
        <RouterLink :to="{ name: 'project', params: { projectId: project.id } }">
          <h2>{{project.title}}</h2>
        </RouterLink>
        
        <button v-if="isOwner" class="fav-btn" @click.stop="toggleFav" :class="{ 'is-fav': project.fav === 1 }">
          <IconSvg 
            url="/icons/fav.svg" 
            :theme="project.fav === 1 ? 'danger' : 'text'" 
            :size="24" 
          />
        </button>
        <!-- For non-owners, if the project is a favorite, show the favorited status icon but read-only (not a button or hover scale) -->
        <span v-else-if="project.fav === 1" class="fav-status-only">
          <IconSvg 
            url="/icons/fav.svg" 
            theme="danger" 
            :size="24" 
          />
        </span>
      </div>

      <span class="card-meta">{{$t("projectCard.updatedOn") + date.toLocaleDateString($t('locale'))}}</span>
      <br>
      <span class="card-meta">{{project.sceneCount + " " +sceneDescription}}</span>

      <!-- toggle for publication (only for owner) -->
      <div v-if="isOwner" class="toggle-container" @click.stop>
        <label class="switch">
          <input type="checkbox" :checked="project.published" @change="togglePublished">
          <span class="slider round"></span>
        </label>
        <IconSvg :url="project.published ? '/icons/public.svg' : '/icons/private.svg'" :theme="project.published ? 'success' : 'text'" :size="18" />
        <span class="toggle-label">{{ project.published ? $t('projectCard.projectPublished') : $t('projectCard.projectPrivate') }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.project-card-container {
  width: 100%;
  background-color: var(--backgroundColor);
  border-radius: 16px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

h2 {
  margin-bottom: 4px;
}

img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  object-fit: cover;
  object-position: center;
}

#picture {
  width: 33%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

#content {
  padding-left: 12px;
  width: 67%;
  position: relative;
  word-break: break-word;
  display: flex;
  flex-direction: column;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.card-meta {
  font-size: 0.9rem;
  color: var(--textColor);
}

.fav-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.fav-btn:hover {
  transform: scale(1.15);
}

.fav-btn.is-fav :deep(svg) {
  fill: #ff4757; 
  stroke: #ff4757;
}

.fav-btn:not(.is-fav) :deep(svg) {
  fill: none;
  stroke: var(--textColor);
}

.fav-status-only {
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 18px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 18px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accentColor);
}

input:checked + .slider:before {
  transform: translateX(18px);
}

.toggle-label {
  font-size: 0.85rem;
  color: var(--textColor);
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
