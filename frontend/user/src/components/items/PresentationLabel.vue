<script setup>

import IconSvg from "@/components/icons/IconSvg.vue";
import {computed, onMounted, watch} from "vue";

const props = defineProps({
  label: {type: Object, required: true}
})

const emit = defineEmits(["toggleDisplay"])

const displayIcon = computed(() => {
  if(props.label.hidden.value) return '/icons/display_off.svg'
  return '/icons/display_on.svg'
})

</script>

<template>
  <div class="item">
    <p>{{label.content}}</p>
    <div class="tools">
      <icon-svg
          :url="displayIcon"
          theme="text"
          class="iconAction"
          :hover-effect="true"
          @click="emit('toggleDisplay')"/>
    </div>
  </div>
</template>

<style scoped>
.item {
  background-color: var(--backgroundColor);
  padding: 10px;
  border-radius: 10px;

  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
}

.item > p {
  max-width: 70%;
  word-break: break-all;
}

.item select {
  width: 100px;
}

.item + .item {
  margin-top: 10px;
}

.tools {
  display: flex;
  flex-direction: row;
  gap: 5px;
}
</style>