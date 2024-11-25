<script setup>
import {ref} from "vue";

const props = defineProps({
  projectInfo:{type:Object,required:true},
});

const project = ref(props.projectInfo);
const createdAt = new Date(project.value.createdAt);
const updatedDate = new Date(project.value.updatedAt);
</script>

<template>
  <section>
    <h2>{{$t("projectView.projectInfo.title")}}</h2>
    <p>{{$t("projectView.projectInfo.createdBy") + project.owner.username}}</p>
    <p>{{$t("projectView.projectInfo.createdOn") + createdAt.toLocaleDateString() + " " + $t("projectView.projectInfo.at") + " " + createdAt.toLocaleTimeString()}}</p>
    <p>{{$t("projectView.projectInfo.updatedOn") + updatedDate.toLocaleDateString() + " " + $t("projectView.projectInfo.at") + " " + updatedDate.toLocaleTimeString()}}</p>
    <p>{{$t("projectView.projectInfo.sceneCount") + project.scenes.length}}</p>
  </section>
</template>

<style scoped>
section{
  width: 100%;
  background-color: var(--backgroundColor);
  border-radius: 16px;
  padding: 16px;
  margin-top: 16px;
}

h2{
  margin-bottom: 4px;
  font-size: 18px;
}
</style>
