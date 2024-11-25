<script setup>
import ButtonView from "@/components/utils/buttonView.vue";
import {ref} from "vue";
import {getResource} from "@/js/endpoints.js";
import {useI18n} from "vue-i18n";
const {t} = useI18n()

const props = defineProps({
  projectInfo:{type:Object,required:true},
});

const project = ref(props.projectInfo);

const date = new Date(project.value.updatedAt);

const sceneDescription = t("projectCard.scene", project.value.sceneCount);


</script>

<template>
  <section>
    <div id="picture">
      <img :src="getResource(project.pictureUrl)" :alt="$t('projectCard.pictureAlt')">
    </div>

    <div id="content">
      <RouterLink :to="{ name: 'project', params: { projectId: project.id } }">
        <h2>{{project.title}}</h2>
      </RouterLink>
      <span>{{$t("projectCard.updatedOn") + date.toLocaleDateString($t('locale'))}}</span>
      <br>
      <span>{{project.sceneCount + " " +sceneDescription}}</span>


    </div>
  </section>
</template>

<style scoped>

section{
  width: 100%;
  background-color: var(--backgroundColor);
  border-radius: 16px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 16px;
}

h2{
  margin-bottom: 4px;
}

img{
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  object-fit: cover;
  object-position: center;
}

#picture{
  width: 33%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

#content{
  padding-left: 8px;
  width: 67%;
  position: relative;
  word-break: break-word;
}

button{
  position: absolute;
  right: 0;
  bottom: 0;
  margin: 0;
}

a{
  text-decoration: none;
}

a:hover{
  text-decoration: underline;
}
</style>
