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
import ProjectManager from "@/components/admin/projectManager.vue";
import SceneManager from "@/components/admin/sceneManager.vue";
import AssetManager from "@/components/admin/assetManager.vue";
import LabelManager from "@/components/admin/labelManager.vue";


const { isAuthenticated, token ,userData} = useAuthStore()
const router = useRouter()
const {t} = useI18n()

const accountManager = ref(null)
const projectManager = ref(null)
const sceneManager = ref(null)
const assetManager = ref(null)
const labelManager = ref(null)



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

    <account-manager
        ref="accountManager"

        :token="token"
    />

    <project-manager
        ref="projectManager"

        :token="token"
        @edit-scene="sceneManager.editingScene = $event"
        @delete-scene="sceneManager.deletingScene = $event"
    />

    <scene-manager
        ref="sceneManager"

        :token="token"

        @edit-asset="assetManager.editingAsset = $event"
        @delete-asset="assetManager.deletingAsset = $event"
        @create-asset="assetManager.creatingAsset = { sceneId: $event.id }"

        @edit-label="labelManager.editingLabel = $event"
        @delete-label="labelManager.deletingLabel = $event"
        @create-label="labelManager.creatingLabel = { sceneId: $event.id }"
    />

    <asset-manager
        ref="assetManager"

        :token="token"
    />

    <label-manager
        ref="labelManager"

        :token="token"

        @new-label="sceneManager.newLabel($event)"
        @suppr-label="sceneManager.supprLabel($event)"
    />

  </main>



</template>


<style>

main > section + section {
  margin-top: 15px;
}

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

table tr:hover {
  background-color: var(--darkerBackgroundColor);
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

.danger {
  color: #FF4040;
  text-align: center;
}


.list {
  display: flex;
  flex-direction: column;
  align-content: center;
  gap: 10px;

  max-height: 200px;
  overflow-y: scroll;
}

.item {
  padding: 5px;
  border-radius: 5px;
  background: var(--darkerBackgroundColor);
  display: flex;
  justify-content: space-between;
}

.item span {
  max-width: 80%;
  word-break: keep-all;
  overflow: hidden;
}

.item .actions {
  display: flex;
}

</style>
