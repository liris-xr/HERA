<script setup>
import ProjectCard from "@/components/projectCard.vue"
import {onMounted, ref} from "vue"
import {ENDPOINT} from "@/js/endpoints.js"
import ButtonView from "@/components/button/buttonView.vue"
import Notification from "@/components/notification/notification.vue"
import {useAuthStore} from "@/store/auth.js"
import {useRouter} from "vue-router/dist/vue-router"
import FilledButtonView from "@/components/button/filledButtonView.vue"
import TextInputModal from "@/components/modal/textInputModal.vue"
import RedirectMessage from "@/components/notification/redirect-message.vue"
import {useI18n} from "vue-i18n"
import AccountManager from "@/components/admin/accountManager.vue";


const { isAuthenticated, token ,userData} = useAuthStore()
const router = useRouter()
const {t} = useI18n()




if (!isAuthenticated.value) {
  router.push({ name: "login" })
}

if(!userData.value.admin) {
  router.push({ name: "home" })
}



</script>

<template>
  <main>

    <h1>{{$t("admin.title")}}</h1>

    <account-manager :token="token"></account-manager>

    <section>
      <h2>{{$t("admin.sections.projects.title")}}</h2>

    </section>

    <section>
      <h2>{{$t("admin.sections.scenes.title")}}</h2>

    </section>

    <section>
      <h2>{{$t("admin.sections.assets.title")}}</h2>

    </section>

    <section>
      <h2>{{$t("admin.sections.labels.title")}}</h2>

    </section>


  </main>



</template>


<style >

table {
  width: 80%;
  background-color: white;
  border-collapse: collapse;
}

table td, table th {
  border: solid 1px #ddd;
  padding: 10px;
  color: black;
}

table th {
  font-weight: bold;
}

table td {
  text-align: center;
}

.inline-flex {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  gap: 10px
}
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);

  display: flex;
  justify-content: center;
  align-items: center;
}
.modal > div {
  background-color: white;
  text-align: center;
  padding: 50px;
  border-radius: 15px;
}

.modal div h2 {
  margin-bottom: 25px;
}

.modal div label {
  margin-right: 10px;
}

.modal div input {
  color: black;
}

.modal > div > div + div {
  margin-top: 15px;
}

.modal button {
  color: black;
}

.danger {
  color: #FF4040;
  text-align: center;
}

</style>
