<script setup>
import {ENDPOINT} from "@/js/endpoints.js";
import {computed, onMounted, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import * as sea from "node:sea";
import GenericTable from "@/components/admin/generic/genericTable.vue";
import GenericModal from "@/components/admin/generic/genericModal.vue";
import Notification from "@/components/notification/notification.vue";
import RedirectMessage from "@/components/notification/redirect-message.vue";
import {toast} from "vue3-toastify";
import {useI18n} from "vue-i18n";

const {t} = useI18n()


const props = defineProps({
  token: {type: String, required: true},
})

const element = ref(null)

const loading = ref(false)
const error = ref(false)


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
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
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
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
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
  } else {
    toast.error(res.status + " : " + res.statusText, {
      position: toast.POSITION.BOTTOM_RIGHT
    })
  }

  creatingUser.value = null
}

async function fetchUsers(data=null) {
  loading.value = true

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

      if(table.value.currentPage > totalPages.value)
        table.value.currentPage = totalPages.value

    } else
      error.value = true

  } catch(error) {
    error.value = true
    console.log(error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchUsers()
})

defineExpose({element})
</script>

<template>

  <section ref="element">

    <generic-table
        ref="table"
        section-name="accounts"
        :fields="['username', 'email']"
        :data="users"
        :total-pages="totalPages"

        @create="creatingUser = {}"
        @edit="editingUser = $event"
        @delete="deletingUser = $event"
        @fetch="fetchUsers">

      <notification
          theme="default"
          icon="/icons/spinner.svg"
          v-if="loading">
        <template #content><p>{{$t("admin.loading")}}</p></template>
      </notification>

      <notification
          theme="danger"
          icon="/icons/info.svg"
          v-if="error">
        <template #content><p>{{$t("admin.loadingError")}}</p></template>
      </notification>

    </generic-table>





  <!-- Interfaces modales -->

  <generic-modal
      title="edit"
      section-name="accounts"

      :subject="editingUser"
      :fields="[
          {
            name: 'username',
            type: 'text',
            required: true,
          },
          {
            name: 'email',
            type: 'text',
            required: true,
            validator: (value) => {
              const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
              return EMAIL_REGEX.test(value)
            }
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
            required: true,
          },
          {
            name: 'email',
            type: 'text',
            placeholder: 'Jean@gmail.com',
            required: true,
            validator: (value) => {
              const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
              return EMAIL_REGEX.test(value)
            }
          },
          {
            name: 'password',
            type: 'password',
            placeholder: '********',
            required: true,
          },
          {
            name: 'admin',
            type: 'boolean',
          }
      ]"

      @confirm="confirmUserCreate"
      @cancel="creatingUser = null"
  />

  </section>

</template>

<style scoped>

</style>