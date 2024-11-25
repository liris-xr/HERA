<script setup>
import {RouterView} from 'vue-router'
import HeaderView from "@/components/headerView.vue";
import FooterView from "@/components/footerView.vue";
</script>

<template>
  <header-view></header-view>

  <Suspense>
    <RouterView />
  </Suspense>

<!--  <footer-view></footer-view>-->
</template>

<style scoped>

</style>
