<script setup>
import { RouterLink } from "vue-router";
</script>

<template>
  <main>
    <h1>Error 404 : Page not found</h1>
    <h2>La page que vous avez demandée n'existe pas</h2>
    <router-link :to="{ name: 'home' }">
      <button>Retour à l'accueil</button>
    </router-link>
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  font-weight: 400;
  text-align: center;
}

button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  transition: background-color 0.2s;
}

button:hover {
  background-color: var(--color-primary-dark);
}
</style>
