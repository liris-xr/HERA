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


const { isAuthenticated, token ,userData} = useAuthStore()
const router = useRouter()
const {t} = useI18n()


const users = ref([])
const editingUser = ref(null)
const deletingUser = ref(null)
const creatingUser = ref(null)

if (!isAuthenticated.value) {
  router.push({ name: "login" })
}

if(!userData.value.admin) {
  router.push({ name: "home" })
}

async function confirmUserEdit() {
  const res = await fetch(`${ENDPOINT}admin/users/${editingUser.value.id}`,{
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`,
    },
    body: JSON.stringify(editingUser.value),
  })

  if(res.ok) {
    const data = await res.json()

    const index = users.value.findIndex(user => user.id === data.id)
    if(index !== -1)
      users.value[index] = { ...data }
  }

  editingUser.value = null
}

async function confirmUserDelete() {
  const res = await fetch(`${ENDPOINT}admin/users/${deletingUser.value.id}`,{
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`,
    },
  })

  if(res.ok) {
    const index = users.value.findIndex(user => user.id === deletingUser.value.id)
    if(index !== -1)
      users.value.splice(index, index+1)
  }
  deletingUser.value = null
}

async function confirmUserCreate() {
  const res = await fetch(`${ENDPOINT}admin/users`,{
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`,
    },
    body: JSON.stringify(creatingUser.value),
  })

  if(res.ok) {
    const newUser = await res.json()
    users.value.push(newUser)
  }

  creatingUser.value = null
}

async function fetchUsers() {
  try {
    const res = await fetch(`${ENDPOINT}admin/users/`,
        {
          headers: {
            'Authorization': `Bearer ${token.value}`,
          }
        })

    if(res.ok) {
      return await res.json()
    }
    throw new Error("ko")
  } catch(error) {
    //TODO
  }
}

onMounted(async () => {
  users.value = await fetchUsers()
})


</script>

<template>
  <main>

    <h1>{{$t("admin.title")}}</h1>

    <section>
      <h2>{{$t("admin.sections.accounts.title")}}</h2>

      <table>
        <thead>
          <tr>
            <th>{{$t("admin.sections.accounts.username")}}</th>
            <th>{{$t("admin.sections.accounts.email")}}</th>
            <th>{{$t("admin.sections.accounts.actions")}}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users">
            <td>{{user.username}}</td>
            <td>{{user.email}}</td>
            <td>
              <div class="inline-flex">
                <button-view icon="/icons/edit.svg" @click="editingUser = {...user}"></button-view>
                <button-view icon="/icons/delete.svg" theme="danger" @click="deletingUser = user"></button-view>
              </div>
            </td>
          </tr>

          <tr>
            <td colspan="3">
              <div class="inline-flex">
                <button-view icon="/icons/add.svg" @click="creatingUser = {}"></button-view>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

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

  <!-- Interfaces modales -->

  <!-- user -->

  <div class="modal" v-if="editingUser">
    <div>
      <h2>Modifier l'utilisateur</h2>
      <div>
        <label for="username">{{$t("admin.sections.accounts.username")}}</label>
        <input v-model="editingUser.username" id="username" name="username">
      </div>
      <div>
        <label for="email">{{$t("admin.sections.accounts.email")}}</label>
        <input v-model="editingUser.email" id="email" name="email">
      </div>
      <div>
        <label for="admin">{{$t("admin.sections.accounts.admin")}}</label>
        <input v-model="editingUser.admin" type="checkbox" id="admin" name="admin">
      </div>
      <div>
        <button @click="confirmUserEdit">Confirmer</button>
      </div>
      <div>
        <button @click="editingUser = null">Annuler</button>
      </div>
    </div>
  </div>

  <div class="modal" v-if="deletingUser">
    <div>
      <h2>Supprimer l'utilisateur</h2>
      <div>
        <p>Vous-vous vraiment supprimer {{deletingUser.username}} ?</p>
        <p class="danger">⚠Cette action est irréversible⚠</p>
      </div>
      <div>
        <button @click="confirmUserDelete">Confirmer</button>
      </div>
      <div>
        <button @click="deletingUser = null">Annuler</button>
      </div>
    </div>
  </div>

  <div class="modal" v-if="creatingUser">
    <div>
      <h2>Créer un utilisateur</h2>
      <div>
        <label for="username">{{$t("admin.sections.accounts.username")}}</label>
        <input v-model="creatingUser.username" id="username" name="username" placeholder="Jean01000">
      </div>
      <div>
        <label for="email">{{$t("admin.sections.accounts.email")}}</label>
        <input v-model="creatingUser.email" id="email" name="email" placeholder="Jean">
      </div>
      <div>
        <label for="password">{{$t("admin.sections.accounts.password")}}</label>
        <input v-model="creatingUser.password" type="password" id="password" name="password" placeholder="********">
      </div>
      <div>
        <label for="admin">{{$t("admin.sections.accounts.admin")}}</label>
        <input v-model="creatingUser.admin" type="checkbox" id="admin" name="admin">
      </div>
      <div>
        <button @click="confirmUserCreate">Confirmer</button>
      </div>
      <div>
        <button @click="creatingUser = null">Annuler</button>
      </div>
    </div>
  </div>

</template>


<style scoped>

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
