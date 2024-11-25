<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";

const props = defineProps({
  icon:{type:String, required:true, default:""},
  size:{type:Number,default:32},
})

</script>

<template>
  <div class="bubble">
    <icon-svg :url="icon" theme="text" :size="size"></icon-svg>
  </div>
</template>

<style scoped>
.bubble{
  width: fit-content;
  height: fit-content;
  padding: 8px;
  border-radius: 50%;
  background-color: var(--backgroundColor);
}
</style>
