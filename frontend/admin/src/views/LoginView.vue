<script setup>
import { ref } from "vue";
import { useAuthStore } from "../store/auth";
import { useRouter } from "vue-router/dist/vue-router";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import Notification from "@/components/notification/notification.vue";
import {ENDPOINT} from "@/js/endpoints.js";
import RedirectMessage from "@/components/notification/redirect-message.vue";

const { login, isAuthenticated } = useAuthStore();
const router = useRouter();

if (isAuthenticated.value) {
  router.push({ name: "home" });
}

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);

const loginUser = async () => {
  isSubmitting.value = true;

  try {
    const response = await fetch(`${ENDPOINT}auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    });

    if (!response.ok) {
      const { error } = await response.json();
      errorMessage.value = error;
    } else {
      const { access_token } = await response.json();
      login(access_token);
      await router.push({name: "home"});
    }
  } catch (e) {
    errorMessage.value = e;
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <main>
    <notification
        theme="danger"
        icon="/icons/info.svg"
        v-if="errorMessage"
    >
      <template #content>
        <redirect-message>
          <template #content><p>{{errorMessage}}</p></template>
        </redirect-message>
      </template>
    </notification>
    <section>
      <h1>{{$t("login.login")}}</h1>
      <form @submit.prevent="loginUser">

        <div class="inputContainer">
          <label for="email" class="form-label">{{$t("login.emailLabel")}}</label>
          <input
              v-model="email"
              type="email"
              id="email"
              name="email"
              :placeholder="$t('login.emailPlaceholder')"
              required
          />
        </div>

        <div class="inputContainer">
          <label for="password" class="form-label">{{$t('login.passwordLabel')}}</label>
          <input
              v-model="password"
              type="password"
              id="password"
              name="password"
              :placeholder="$t('login.passwordPlaceholder')"
              required
          />
        </div>

        <filled-button-view
            :text=" isSubmitting ? $t('login.loginIn') : $t('login.login') "
            :icon="isSubmitting ? '/icons/spinner.svg' : '/icons/next.svg'"
            :filled="false"
            :disabled="isSubmitting"
            type="submit"
        />
      </form>


      <span>
        {{$t("login.noAccount")}}
        <router-link :to="{ name: 'register' }">
        {{$t("login.createAccount")}}
        </router-link>
      </span>
    </section>


  </main>
</template>

<style scoped>
main{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

section{
  display: flex;
  flex-direction: column;
  margin: auto;
  width: fit-content;
  background-color: var(--backgroundColor);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--defaultUniformShadow);
}

h1{
  width: 100%;
  text-align: center;
  margin-bottom: 16px;
}

form{
  display: flex;
  flex-direction: column;
  align-items: center;
}

.inputContainer{
  width: 100%;
  min-width: 256px;
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.inputContainer label{
  color: var(--textColor);
  width: 100%;
  text-align: left;
}

.inputContainer input{
  background-color: var(--darkerBackgroundColor);
  border: none;
  box-shadow: 0 0 2px 0 var(--shadowColor) inset;
  border-radius: 4px;
  padding: 4px;
  color: var(--textImportantColor);
  outline-color: var(--accentColor);
}


span{
  text-align: center;
  margin-top: 8px;
  font-size: 10pt;
}

a{
  color: var(--accentColor);
}
</style>
