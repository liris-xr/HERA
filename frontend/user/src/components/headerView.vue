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
      <RouterLink :to="{name: 'home'}">{{$t("header.home")}}</RouterLink>
      <RouterLink :to="{name:'projects'}">{{$t("header.allProjects")}}</RouterLink>

      <div>
        <locale-changer></locale-changer>


        <RouterLink :to="{name:'account'}" v-if="isAuthenticated">
          <span>{{userData.username}}</span>
        </RouterLink>

        <button-view v-if="isAuthenticated" :text="$t('header.logout')" @click="logoutAndRedirect()"/>

        <button-view v-else :text="$t('header.login')" @click="router.push({ name: 'login' })"/>
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

nav>a{
  margin-right: 24px;
  text-decoration: none;

}


nav>a.router-link-exact-active {
  color: var(--accentColor);
}

nav > div {
  display: flex;
  flex-grow: 1;
  justify-content: flex-end;
  gap: 10px
}

</style>
