<script setup>

import IconSvg from "@/components/icons/IconSvg.vue";
import {computed} from "vue";

const props = defineProps({
  asset: {type: Object, required: true}
})

const emit = defineEmits(["highlight", "toggleDisplay"])

const highlightIcon = computed(() => {
  if(props.asset.highlight.value) return '/icons/lightbulb_on.svg'
  return '/icons/lightbulb.svg'
})

const displayIcon = computed(() => {
  if(props.asset.hidden.value) return '/icons/display_off.svg'
  return '/icons/display_on.svg'
})

</script>

<template>
  <div class="item">
    <p>{{asset.name}}</p>
    <div class="tools">
      <icon-svg
          :url="highlightIcon"
          theme="text"
          class="iconAction"
          :hover-effect="true"
          @click="emit('highlight')"/>

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
  justify-content: space-between;
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