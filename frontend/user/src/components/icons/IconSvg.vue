<script setup>
import {computed} from "vue";
import {BASE_URL} from "@/js/endpoints.js";


const props = defineProps({
  url: {type: String, required: true},
  theme: {type: String, default:"default"},
  size: {type: Number, default: 24},
})

const svgMask = computed(()=>`url(${BASE_URL+props.url}) no-repeat center`)
const size = computed(()=>props.size+"px")

</script>

<template>
    <div class="logo" :class="props.theme+'Icon'"></div>
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


.backgroundIcon{
  background-color: var(--backgroundColor);
}
.textIcon{
  background-color: var(--textColor);
}

.textImportantIcon{
  background-color: var(--textImportantColor);
}

.defaultIcon{
  background-color: var(--accentColor);
}
.dangerIcon{
  background-color: var(--dangerColor);
  width: v-bind(size);
}
.warningIcon{
  background-color: var(--warningColor);
}






</style>
