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
        
        <RouterLink :to="{name:'viewer'}" v-if="isAuthenticated" class="icon-link">
          <img src="/icons/redirection.svg" alt="viewer" class="icon">
          {{$t("header.viewer")}}
        </RouterLink>
        
        <RouterLink :to="{name:'admin'}" v-if="userData?.admin" class="icon-link">
          <img src="/icons/adminpanel.svg" alt="admin" class="icon">
          {{$t("header.administration")}}
        </RouterLink>

        <RouterLink :to="{name:'account'}" v-if="isAuthenticated" class="icon-link">
          <img src="/icons/person.svg" alt="account" class="icon">
          <span>{{userData.username}}</span>
        </RouterLink>

        <button-view :text="$t('header.logout')" icon="/icons/logout.svg" @click="logoutAndRedirect()"/>
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

/* Rétablissement du style classique pour les liens sans icône (Accueil) */
nav>a {
  margin-right: 24px;
  text-decoration: none;
  color: inherit;
}

nav>a.router-link-exact-active {
  color: var(--accentColor);
}

nav>div{
  display: flex;
  align-items: center;
}

nav>div>*{
  margin-right: 16px;
}

.icon-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
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