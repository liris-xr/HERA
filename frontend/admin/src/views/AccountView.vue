<script setup>
import ButtonView from "@/components/button/buttonView.vue";
import {ref} from "vue";
import {useAuthStore} from "@/store/auth.js";
import {useI18n} from "vue-i18n";
import {ENDPOINT} from "@/js/endpoints.js";
import {toast} from "vue3-toastify";

const {t} = useI18n()
const { isAuthenticated, token ,userData} = useAuthStore()

if (!isAuthenticated.value) {
  router.push({ name: "login" })
}

const showPasswordInterface = ref(false)

const newPassword = ref(null);
const confirmNewPassword = ref(null)

async function confirmPasswordChange() {
  // validation
  if(newPassword.value.value == "") {
    newPassword.value.setCustomValidity(t("account.required"))
    newPassword.value.reportValidity()
    return
  }
  if(newPassword.value.value.length < 8) {
    newPassword.value.setCustomValidity(t("account.password.lengthMessage"))
    newPassword.value.reportValidity()
    return
  }
  if(newPassword.value.value !== confirmNewPassword.value.value) {
    confirmNewPassword.value.setCustomValidity(t("account.password.notMatching"))
    confirmNewPassword.value.reportValidity()
    return
  }

  // envoi des données
  const res = await fetch(`${ENDPOINT}users/${userData.value.id}`,{
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`,
    },
    body: JSON.stringify({password: newPassword.value.value}),
  })

  if(res.ok) {
    toast.success(t("account.password.success"), {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  showPasswordInterface.value = false
}


</script>

<template>

  <main>
    <section>
      <h1>{{$t("account.password.title")}}</h1>
      <p>{{$t("account.password.warning")}}</p>
      <button-view :text="$t('account.password.button')" @click="showPasswordInterface = true"/>
    </section>
  </main>

  <div class="modal" v-if="showPasswordInterface">
    <div>
      <h2>{{$t("account.password.title")}}</h2>
      <div>
        <p>{{$t("account.password.lengthMessage")}}</p>
      </div>

      <div>
        <label for="newPassword">{{$t("account.password.newPassword")}}</label>
        <input type="password" name="newPassword" id="newPassword" ref="newPassword">
      </div>
      <div>
        <label for="confirmNewPassword">{{$t("account.password.confirmPassword")}}</label>
        <input type="password" name="confirmNewPassword" id="confirmNewPassword" ref="confirmNewPassword">
      </div>

      <div>
        <button @click="confirmPasswordChange">{{$t("account.confirm")}}</button>
      </div>
      <div>
        <button @click="showPasswordInterface = false">{{$t("account.cancel")}}</button>
      </div>
    </div>
  </div>

</template>

<style scoped>

</style>