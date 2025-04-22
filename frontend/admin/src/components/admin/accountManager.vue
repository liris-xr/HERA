<script setup>
import {ENDPOINT} from "@/js/endpoints.js";
import {computed, onMounted, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import * as sea from "node:sea";
import GenericTable from "@/components/admin/generic/genericTable.vue";
import GenericModal from "@/components/admin/generic/genericModal.vue";


const props = defineProps({
  token: {type: String, required: true},
})

const table = ref(null)

const users = ref([])
const editingUser = ref(null)
const deletingUser = ref(null)
const creatingUser = ref(null)

const totalPages = ref(1)

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
      users.value.splice(index, 1)
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

    table.value.currentPage = data.redirectPage
  }

  creatingUser.value = null
}

async function fetchUsers(data=null) {
  const searchQuery = data?.searchQuery
  const currentPage = data?.currentPage ?? 1

  try {
    const searchParams = new URLSearchParams(searchQuery)

    const res = await fetch(`${ENDPOINT}admin/users/${currentPage}?${searchParams.toString()}`,
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
})


</script>

<template>

    <generic-table
        ref="table"
        section-name="accounts"
        :fields="['username', 'email']"
        :data="users"
        :total-pages="totalPages"

        @create="creatingUser = {}"
        @edit="editingUser = $event"
        @delete="deletingUser = $event"
        @fetch="fetchUsers"
    />



  <!-- Interfaces modales -->

  <generic-modal
      title="edit"
      section-name="accounts"

      :subject="editingUser"
      :fields="[
          {
            name: 'username',
            type: 'text',
          },
          {
            name: 'email',
            type: 'text',
          },
          {
            name: 'admin',
            type: 'boolean',
          }
      ]"

      @confirm="confirmUserEdit"
      @cancel="editingUser = null"
  />

  <generic-modal
      title="delete"
      section-name="accounts"

      :subject="deletingUser"

      @confirm="confirmUserDelete"
      @cancel="deletingUser = null">

    <div>
      <p>{{$t("admin.deleteConfirm")}} {{deletingUser.username}} ?</p>
      <p class="danger">⚠{{$t("admin.irreversibleAction")}}⚠</p>
    </div>

  </generic-modal>

  <generic-modal
      title="create"
      section-name="accounts"

      :subject="creatingUser"
      :fields="[
          {
            name: 'username',
            type: 'text',
            placeholder: 'Jean01000',
          },
          {
            name: 'email',
            type: 'text',
            placeholder: 'Jean',
          },
          {
            name: 'password',
            type: 'password',
            placeholder: '********',
          },
          {
            name: 'admin',
            type: 'boolean',
          }
      ]"

      @confirm="confirmUserCreate"
      @cancel="creatingUser = null"
  />

</template>

<style scoped>

</style>