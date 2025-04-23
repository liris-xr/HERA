<script setup>


import ButtonView from "@/components/button/buttonView.vue";
import {computed, onMounted, ref, watch} from "vue";

const props = defineProps({
  sectionName: {type: String, required: true},
  fields: {type: Array, required: true},
  data:  {type: Array, required: true},
  totalPages: {type: Number, required: true},
  create: {type: Boolean, default: true},
})

const emit = defineEmits(["edit", "delete", "create", "fetch", "page"])


const searchQuery = ref({})
const currentPage = ref(1)


const pageNumbers = computed(() => {
  const numbers = []
  const totalPages = props.totalPages

  numbers.push(1)

  const start = Math.max(currentPage.value - 2, 2)
  const end = Math.min(currentPage.value + 2, totalPages - 1)

  if(start > 2)
    numbers.push("...")

  for(let i = start; i <= end; i++)
    numbers.push(i)

  if(end < totalPages - 1)
    numbers.push("...")

  if(totalPages > 1)
    numbers.push(totalPages)

  return numbers
})

defineExpose({currentPage})

onMounted(() => {
  watch(searchQuery, () => emit("fetch", {searchQuery: searchQuery.value, currentPage: currentPage.value}), {deep: true})
  watch(currentPage, () => emit("fetch", {searchQuery: searchQuery.value, currentPage: currentPage.value}))

  watch(props.data, () => {
    if(props.data?.length === 0)
      currentPage.value = 1
  })
})

function getProperty(obj, prop) {
  if(!prop.includes("."))
    return obj[prop]

  return prop.split(".").reduce((acc, part) => acc && acc[part], obj)
}

</script>

<template>
  <section>

    <div class="title">
      <h2>{{$t(`admin.sections.${props.sectionName}.h1`)}}</h2>
      <button-view v-if="create" icon="/icons/add.svg" @click="$emit('create')"></button-view>
    </div>

    <table>
      <thead>
        <tr>
          <th v-for="field in props.fields">{{$t(`admin.sections.${props.sectionName}.${field}`)}}</th>
          <th>{{$t("admin.sections.accounts.actions")}}</th>
        </tr>
      </thead>
      <tbody>
        <tr class="search">
          <td v-for="field in props.fields">
            <input
                :placeholder="$t('admin.research')"
                v-model="searchQuery[field]">
          </td>
          <td></td>
        </tr>

        <tr v-if="props.data.length > 0" v-for="element in props.data">
          <td v-for="field in props.fields">{{getProperty(element, field)}}</td>

          <td>
            <div class="inline-flex">
              <button-view icon="/icons/edit.svg" @click="$emit('edit', {...element})"></button-view>
              <button-view icon="/icons/delete.svg" theme="danger" @click="$emit('delete', element)"></button-view>
            </div>
          </td>
        </tr>
        <tr v-else>
          <td :colspan="fields.length+1">
            {{ $t("admin.noResult") }}
          </td>
        </tr>

        <tr>
          <td :colspan="fields.length+1">
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
</template>

<style scoped>

.title {
  display: flex;
  gap:10px;
  margin-bottom: 10px;
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

.search td {
  padding: 5px;
}

.search input {
  width: 90%;
  height: 30px;
}

</style>