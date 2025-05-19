<script setup>
import {RouterLink} from "vue-router";
import ButtonView from "@/components/button/buttonView.vue";
import {useAuthStore} from "@/store/auth.js";
import router from "@/router/index.js";
import LocaleChanger from "@/components/localeChanger.vue";
const {logout, userData, isAuthenticated} = useAuthStore();

if(!isAuthenticated.value) logoutAndRedirect();

function logoutAndRedirect(){
  logout()
  router.push({ name: "login" });
}
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{name:'projects'}">{{$t("header.home")}}</RouterLink>

      <div>
        <locale-changer></locale-changer>
        <RouterLink :to="{name:'admin'}" v-if="userData?.admin">{{$t("header.administration")}}</RouterLink>

        <RouterLink :to="{name:'account'}" v-if="isAuthenticated">
          <span>{{userData.username}}</span>
        </RouterLink>

        <button-view :text="$t('header.logout')" @click="logoutAndRedirect()"/>
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
  justify-content: space-between;
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

nav>div{
  display: flex;
}

nav>div>*{
  margin-right: 16px;
}
</style>
