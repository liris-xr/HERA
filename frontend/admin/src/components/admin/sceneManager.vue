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

const scenes = ref([])
const editingScene = ref(null)
const deletingScene = ref(null)
const creatingScene = ref(null)

const totalPages = ref(1)


async function fetchScenes(data=null) {
  const searchQuery = data?.searchQuery
  const currentPage = data?.currentPage ?? 1

  try {
    const searchParams = new URLSearchParams(searchQuery)

    const res = await fetch(`${ENDPOINT}admin/scenes/${currentPage}?${searchParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${props.token}`,
          }
        })

    if(res.ok) {
      const data = await res.json()

      scenes.value = data.scenes
      totalPages.value = data.totalPages
    }
  } catch(error) {
    console.log(error)
    //TODO
  }
}

onMounted(async () => {
  await fetchScenes()
})


</script>

<template>

    <generic-table
        ref="table"
        section-name="scenes"
        :fields="['title', 'project.title']"
        :data="scenes"
        :total-pages="totalPages"

        @create="creatingScene = {}"
        @edit="editingScene = $event"
        @delete="deletingScene = $event"
        @fetch="fetchScenes"
    />



  <!-- Interfaces modales -->


</template>

<style scoped>

</style>