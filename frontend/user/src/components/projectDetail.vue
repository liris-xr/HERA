<script setup>
import {ref} from "vue";
import {getResource} from "@/js/endpoints.js";

const projectData = defineProps({
  projectData: {type: Object, required: true}
});
const project =  ref(projectData.projectData);
</script>

<template>
  <h1>{{project.title}}</h1>
  <img :src="getResource(project.pictureUrl)" :alt="$t('projectView.projectDetail.pictureAlt')">
  <p>{{project.description}}</p>
</template>

<style scoped>

h1{
  width: 100%;
}

img{
  width: 100%;
  border-radius: 8px;
  margin-bottom: 8px;
}

p{
  font-weight: 350;
  width: 100%;
}



</style>
