<script setup>
import {ref} from "vue";
import {getResource} from "@/js/endpoints.js";
import {getProjectPicture} from "@/js/projectPicture.js";
import IconSvg from "@/components/icons/IconSvg.vue";
import {useI18n} from "vue-i18n";
const {t} = useI18n()
const props = defineProps({
  projectInfo:{type:Object,required:true},
});

const project = ref(props.projectInfo);

const date = new Date(project.value.updatedAt);

const sceneDescription = t("projectsView.projectCard.scene", project.value.sceneCount);


</script>

<template>
  <section>
    <div id="picture">
      <img :src="getProjectPicture(getResource(project.pictureUrl))" :alt="$t('projectsView.projectCard.pictureAlt')">
    </div>

    <div id="content">
      <RouterLink :to="{ name: 'project', params: { projectId: project.id } }">
        <h2>{{project.title}}</h2>
      </RouterLink>
      <span>{{$t('projectsView.projectCard.updatedOn') + date.toLocaleDateString($t('locale'))}}</span>
      <br>
      <span>{{project.sceneCount + " " +sceneDescription}}</span>

      <div class="publishedStatus public" v-if="project.published">
        <IconSvg url="/icons/checkmarkRounded.svg" theme="success"/>
        {{$t('projectsView.projectCard.projectPublished')}}
      </div>

      <div class="publishedStatus private" v-else>
        <IconSvg url="/icons/private.svg" theme="textImportant"/>
        {{$t('projectsView.projectCard.projectPrivate')}}
      </div>


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
  --pictureSize: calc(100% * .33);
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

.publishedStatus{
  display: flex;
  align-items: center;
  margin-top: 4px;
}

.public{
  color: var(--successColor);
}

.private{
  color: var(--textImportantColor);
}

button{
  position: absolute;
  right: 0;
  bottom: 0;
  margin: 0;
}


a:hover{
  text-decoration: underline;
}
</style>
