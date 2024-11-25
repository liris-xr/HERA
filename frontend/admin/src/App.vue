<script setup>
import {RouterView} from 'vue-router'
import HeaderView from "@/components/headerView.vue";
</script>

<template>
  <header-view v-if="!['login','register'].includes($route.name)"></header-view>

  <Suspense>
    <RouterView :key="$route.path"/>
  </Suspense>
</template>

<style scoped>

</style>
