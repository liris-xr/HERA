<script setup>
import {ref} from "vue";

const props = defineProps({})


const opened = ref(false);

function toggleStatus (event) {
  opened.value = !opened.value;
  // event.stopPropagation();
}

defineExpose({ toggleStatus });
</script>

<template>
  <div id="root">
    <img @click="toggleStatus" src="/icons/more.svg" alt="more">
    <section v-if="opened" id="closeArea" @click="toggleStatus($event)"></section>

    <section :class="{opened: opened, closed: !opened}">
      <div id="closeButton" @click="toggleStatus($event)">×</div>
      <slot></slot>
    </section>
  </div>

</template>

<style scoped>

#root{
  position: relative;
}


section{
  position: absolute;
  top: 0;
  right: 0;

  padding: 8px;
  background-color: var(--backgroundColor);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;

  transform-origin: 100% 0;
  transition: 0.2s;
  filter: drop-shadow(0px 0px 4px #00000088);
}

.opened{
  transform: none;
  opacity: 1;
}

.closed{
  transform:scale(0);
  opacity: 0;
  pointer-events: none;
}

section:deep(div){
  width: 100%;
  margin-top: 4px;
  padding-top: 4px;
  border-top: solid var(--textColor) 1px;
  font-weight: 350;
}

#closeButton{
  text-align: right;
  font-size: 32px;
  font-weight: 100;
  line-height: 12px;
  margin: 0 0 16px;
  padding: 0;
  border: none;
}

#closeArea{
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  opacity: .24;
  background-color: var(--textImportantColor);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
</style>
