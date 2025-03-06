<script setup>

import IconSvg from "@/components/icons/IconSvg.vue";
import {computed} from "vue";

const props = defineProps({
  name:{type:String,required:true},
  currentActive:{type:String,required:true},
})


const getIcon = computed(()=>{
  return "/icons/"+props.name+".svg";
})
</script>

<template>
  <div>
    <icon-svg :url="getIcon" :theme="name === currentActive ? 'default' : 'text' "></icon-svg>
  </div>
</template>

<style scoped>

div{
  margin-right: 8px;
  padding: 8px;
  border: solid 1px var(--darkerBackgroundColor);
  border-radius: 8px;
}
</style>
