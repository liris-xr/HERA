<script setup>
import {computed} from "vue";
import {BASE_URL} from "@/js/endpoints.js";

const props = defineProps({
  url: {type: String, required: true},
  theme: {type: String, default: "default"},
  size: {type: Number, default: 24},
  hoverEffect: {type: Boolean, default: false},
})
const svgMask = computed(() => `url(${BASE_URL + props.url}) no-repeat center`)
const size = computed(() => props.size + "px")

const getClass = computed(() => {
  let string = props.theme + 'Icon'
  string += props.hoverEffect ? ' hoverEffect' : ''
  return string
})
</script>

<template>
  <div class="logo" :class="getClass"></div>
</template>

<style scoped>
.logo {
  width: v-bind(size);
  height: v-bind(size);
  -webkit-mask: v-bind(svgMask);
  mask: v-bind(svgMask);
  mask-size: v-bind(size);
  margin: 0;
}


.hoverEffect {
  cursor: pointer;
}

.hoverEffect:hover {
  filter: brightness(124%);
}


.backgroundIcon {
  background-color: var(--backgroundColor);
}

.textIcon {
  background-color: var(--textColor);
}

.textImportantIcon {
  background-color: var(--textImportantColor);
}

.defaultIcon {
  background-color: var(--accentColor);
}

.dangerIcon {
  background-color: var(--dangerColor);
  width: v-bind(size);
}

.warningIcon {
  background-color: var(--warningColor);
}

.successIcon {
  background-color: var(--successColor);
}


</style>
