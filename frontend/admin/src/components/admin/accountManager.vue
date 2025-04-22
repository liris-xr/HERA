<script setup>
import {ENDPOINT} from "@/js/endpoints.js";
import {computed, onMounted, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";


const props = defineProps({
  token: {type: String, required: true},
})


const users = ref([])
const editingUser = ref(null)
const deletingUser = ref(null)
const creatingUser = ref(null)

const totalPages = ref(1)
const currentPage = ref(1)


async function confirmUserEdit() {
  const res = await fetch(`${ENDPOINT}admin/users/${editingUser.value.id}`,{
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.token}`,
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
      'Authorization': `Bearer ${props.token}`,
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
      'Authorization': `Bearer ${props.token}`,
    },
    body: JSON.stringify(creatingUser.value),
  })

  if(res.ok) {
    const data = await res.json()
    const newUser = data.user
    users.value.push(newUser)

    currentPage.value = data.redirectPage
  }

  creatingUser.value = null
}

async function fetchUsers() {
  try {
    const res = await fetch(`${ENDPOINT}admin/users/${currentPage.value}`,
        {
          headers: {
            'Authorization': `Bearer ${props.token}`,
          }
        })

    if(res.ok) {
      const data = await res.json()

      users.value = data.users
      totalPages.value = data.totalPages
    }
  } catch(error) {
    console.log(error)
    //TODO
  }
}

onMounted(async () => {
  await fetchUsers()
  watch(currentPage, fetchUsers)
})

const pageNumbers = computed(() => {
  const numbers = []

  numbers.push(1)

  const start = Math.max(currentPage.value - 2, 2)
  const end = Math.min(currentPage.value + 2, totalPages.value - 1)

  if(start > 2)
    numbers.push("...")

  for(let i = start; i <= end; i++)
    numbers.push(i)

  if(end < totalPages.value - 1)
    numbers.push("...")

  if(totalPages.value > 1)
    numbers.push(totalPages.value)

  return numbers
})

</script>

<template>
  <section>
    <div class="title">
      <h2>{{$t("admin.sections.accounts.title")}}</h2>
      <button-view icon="/icons/add.svg" @click="creatingUser = {}"></button-view>
    </div>

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
            <div class="pagination">
              <button
                  v-for="page in pageNumbers"
                  :disabled="page === '...'"
                  :class="{active: currentPage === page, pagination_button: page !== '...'}"
                  @click="currentPage = page">
                {{page}}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- Interfaces modales -->

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

.title {
  display: flex;
  gap:10px
}

.pagination button:not(.pagination_button) {
  border: none;
  background: transparent;
  color: black
}

.pagination_button {
  margin: 0 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background-color: var(--accentColor);
  color: var(--backgroundColor);
  cursor: pointer;
}

.active {
  background-color: var(--textImportantColor) !important;
}

</style>