<script setup>
import {RouterLink} from "vue-router";
import LocaleChanger from "@/components/localeChanger.vue";
import {useAuthStore} from "@/store/auth.js";
import ButtonView from "@/components/button/buttonView.vue";
import router from "@/router/index.js";

const {isAuthenticated, userData, logout } = useAuthStore()

function logoutAndRedirect(){
  logout()
  if(router.currentRoute.value.name === "home") {
    router.go(0)
  }else
    router.push({ name: "home" });
}
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{name: 'home'}" class="icon-link">
        <img src="/icons/globe.svg" alt="home" class="icon">
        {{$t("header.home")}}
      </RouterLink>
      
      <RouterLink :to="{name:'projects'}" class="icon-link">
        <img src="/icons/ar.svg" alt="projects" class="icon">
        {{$t("header.allProjects")}}
      </RouterLink>

      <div>
        <locale-changer></locale-changer>

        <RouterLink :to="{name:'editor'}" v-if="isAuthenticated" class="icon-link">
          <img src="/icons/redirection.svg" alt="editor" class="icon">
          {{$t("header.editor")}}
        </RouterLink>

        <RouterLink :to="{name:'account'}" v-if="isAuthenticated" class="icon-link">
          <img src="/icons/person.svg" alt="account" class="icon">
          <span>{{userData.username}}</span>
        </RouterLink>

        <button-view v-if="isAuthenticated" :text="$t('header.logout')" icon="/icons/logout.svg" @click="logoutAndRedirect()"/>

        <button-view v-else :text="$t('header.login')" icon="/icons/login.svg" @click="router.push({ name: 'login' })"/>
      </div>
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

nav>a.router-link-exact-active {
  color: var(--accentColor);
}

nav > div {
  display: flex;
  flex-grow: 1;
  justify-content: flex-end;
  gap: 10px;
  align-items: center;
}

.icon-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}

nav > .icon-link {
  margin-right: 24px;
}

.icon {
  width: 20px;
  height: 20px;
  display: inline-block;
  filter: invert(1);
}

.icon-link:hover .icon {
  filter: invert(0.7);
}
</style>