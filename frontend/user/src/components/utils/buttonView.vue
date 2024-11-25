<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";

const props = defineProps({
  text: {type: String, required: true},
  color: {type: String, default: "#3F9BF0"},
  filled: {type: Boolean, default: false},
  icon:{type: String, default: ""},
})

const hasIcon = props.icon.trim().length > 0;
let fillColor = "#ffffff";
let textColor = props.color;
if(props.filled) {
  fillColor = props.color
  textColor = "#ffffff"
}

</script>

<template>
  <button>
    <span>{{props.text}}</span>
    <IconSvg v-if="hasIcon" :url="props.icon" :color="textColor"></IconSvg>
  </button>
</template>

<style scoped>
button{
  display: flex;
  flex-direction: row;
  align-items: center;
  border-radius: 4px;
  border-width: 2px;
  border-style: solid;
  background-color: v-bind(fillColor);
  border-color: v-bind(textColor);
  cursor: pointer;
}

button>span{
  color: v-bind(textColor);
  margin-right: 4px;
}

</style>
