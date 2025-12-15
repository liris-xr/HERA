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

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;

  display: flex;
  justify-content: center;
  align-items: center;
}
.modal > div {
  background-color: white;
  text-align: center;
  padding: 50px;
  border-radius: 15px;

  overflow-y: scroll;

  max-width: 50%;
}

.modal > div > *, .modal > div p {
  text-align: center;
}

.modal div h2 {
  margin-bottom: 25px;
}

.modal div label {
  margin-right: 10px;
}

.modal div input, .modal div textarea {
  color: black;
}

.modal > div > div + div {
  margin-top: 15px;
}

.modal button {
  color: black;
}
</style>