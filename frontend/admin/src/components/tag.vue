<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";

const props = defineProps({
  text: {type: String, required: true},
  icon:{type: String, default: ""},
})

const hasIcon = props.icon.trim().length > 0;



</script>

<template>
  <div>
    <IconSvg v-if="hasIcon" :url="icon" theme="text" :size="20" class="icon"></IconSvg>
    <span>{{text}}</span>
  </div>
</template>

<style scoped>

div{
  display: flex;
  flex-direction: row;
  align-items: center;
  border-radius: 4px;
  padding: 4px;
  background-color: var(--backgroundColor);
}

.icon{
  margin-right: 4px;
}

span{
  font-size: 14px;
}

</style>
