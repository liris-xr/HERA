<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
const props = defineProps({
  text: {type: String, required: true},
  icon: {type: String, required: true},
  theme: {type: String, default: "text"},
})

</script>

<template>
  <div id="parent">
    <span>{{props.text}}</span>
    <icon-svg :url="props.icon" :theme="theme"></icon-svg>
  </div>
</template>

<style scoped>

#parent{
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
  user-select: none;
}

#parent>div{
  width: 24px;
}
span{
  margin-right: 8px;
  width: fit-content;
}
</style>
