<script setup>

const props = defineProps({
  preset: {type: Object, required: true},
})

const emit = defineEmits(['triggered'])

</script>

<template>

  <div class="presetItem" @click="$emit('triggered')">
    <p> {{ preset.bigText }} </p>
    <p> {{ preset.text }} </p>
  </div>

</template>

<style scoped>

.presetItem:hover {
  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
}

.presetItem {
  background-color: var(--backgroundColor);
  width: 7em;
  height: 7em;
  border-radius: 16px;
  padding: 5px;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;

  justify-content: center;
  align-items: center;

  cursor: pointer;
}

.presetItem p:first-child {
  font-size: 2.25em;
}

.presetItem p:last-child {
  word-break: break-word;
  max-height: 40%;
}

.presetItem p {
  text-align: center;
  text-overflow: ellipsis;
  overflow: hidden;
  width: 100%;
}

</style>