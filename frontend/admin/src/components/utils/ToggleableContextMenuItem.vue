<script setup>
import {computed, ref} from "vue";
import IconContextMenuItem from "@/components/utils/IconContextMenuItem.vue";

const props = defineProps({
  text: {type: String, required: true},
  checked: {type: Boolean, default: false},
})


const theme = computed(()=> props.checked?"default":"text");

</script>

<template>
  <IconContextMenuItem icon="/icons/checkmark.svg" :text="props.text" :theme="theme"></IconContextMenuItem>
</template>

