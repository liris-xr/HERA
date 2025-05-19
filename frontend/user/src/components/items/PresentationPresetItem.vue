<script setup>

import IconSvg from "@/components/icons/IconSvg.vue";

const props = defineProps({
  preset: {type: Object, required: true},
})

const emit = defineEmits(['edit', 'remove'])

</script>

<template>
  <div class="preset">
    <p>{{preset.bigText}} - {{preset.text}}</p>

    <div class="tools">
      <icon-svg url="/icons/edit.svg" theme="text" class="iconAction" :hover-effect="true" @click="$emit('edit')"/>
      <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click="$emit('remove')"/>
    </div>
  </div>
</template>

<style scoped>

.preset {
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  background-color: var(--darkerBackgroundColor);

  margin: 5px;
  padding: 10px;
  border-radius: 5px;
}

.preset > p {
  max-width: 70%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.tools {
  display: flex;
}

</style>