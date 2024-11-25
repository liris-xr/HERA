<script setup>

import {RouterLink} from "vue-router";
import LocaleChanger from "@/components/localeChanger.vue";
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{name: 'home'}">{{$t("header.home")}}</RouterLink>
      <RouterLink :to="{name:'projects'}">{{$t("header.allProjects")}}</RouterLink>
      <locale-changer></locale-changer>
    </nav>
  </header>
</template>

<style scoped>

header{
  width: 100%;
  position: sticky;
  top:0;
  z-index: 128;
}

nav{
  padding: 16px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;

  background-color: var(--backgroundColor);
  box-shadow: var(--defaultUniformShadow);
}

nav>a{
  margin-right: 24px;
  text-decoration: none;

}


nav>a.router-link-exact-active {
  color: var(--accentColor);
}

.locale-changer{
  flex-grow: 1;
  justify-content: flex-end;
}
</style>
