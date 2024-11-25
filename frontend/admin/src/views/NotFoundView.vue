<script setup>

import ButtonView from "@/components/button/buttonView.vue";
</script>

<template>
  <main>
    <h1>Error 404 : Page not found</h1>
    <h2>La page que vous avez demandé n'existe pas</h2>
    <router-link :to="{name: 'home'}">
      <button-view text="Retour à l'accueil"></button-view>
    </router-link>
  </main>
</template>

<style scoped>

</style>
