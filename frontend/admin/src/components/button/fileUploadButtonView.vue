<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
import {computed, getCurrentInstance, ref} from "vue";

const props = defineProps({
  text: {type: String, required: true},
  theme: {type: String, default: "default"},
  icon:{type: String, default: ""},
  disabled: {type: Boolean, default: false},
  accept: {type: Array, required: true},
})

const hasIcon = props.icon.trim().length > 0;

const themeKeyword = "Label";
let textTheme = props.theme

const inputFile = ref(null);
const emit = defineEmits(["file-selected"]);

const acceptedFileTypes = computed(()=>{
  let types = "";
  for (let fileType of props.accept) {
    types += fileType;
    types += ", ";
  }
  return types;
})

const id = getCurrentInstance().uid;

const baseName = "assetUpload";
const getInputId = computed(()=>{
  let inputId = baseName + id;
  if(props.disabled) inputId += "disabled";
  return inputId;
})

const getLabelTargetId = computed(()=>{return baseName + id;})


function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file && !props.disabled) {
    emit('file-selected', file);
    inputFile.value.value = "";
  }
}


</script>

<template>
  <label :class="{[`${textTheme}${themeKeyword}`]: true, 'disabled':disabled}" :for="getLabelTargetId">
    <span :class="textTheme+themeKeyword">{{text}}</span>
    <IconSvg v-if="hasIcon" :url="icon" :theme="textTheme"></IconSvg>
  </label>
  <input ref="inputFile" name="assetUpload" :id="getInputId" type="file" :accept="acceptedFileTypes" @change="handleFileUpload" class="hidden">

</template>

<style scoped>
.hidden{
  display: none;
}

.disabled{
  opacity: 0.64;
  outline: none !important;
  cursor: default;
}

.backgroundLabel{
  color: var(--backgroundColor);
  border-color: var(--backgroundColor);
}
.textLabel{
  color: var(--textColor);
  border-color: var(--textColor);
}

.textImportantLabel{
  color: var(--textImportantColor);
  border-color: var(--textImportantColor);
}

.defaultLabel{
  color: var(--accentColor);
  border-color: var(--accentColor);
}
.dangerLabel{
  color: var(--dangerColor);
  border-color: var(--dangerColor);
}
.warningLabel{
  color: var(--warningColor);
  border-color: var(--warningColor);
}

label{
  display: flex;
  flex-direction: row;
  align-items: center;
  border-radius: 4px;
  border-width: 2px;
  border-style: solid;
  cursor: pointer;
  background-color: var(--backgroundColor);
  transition: ease-out .1s;
  font-size: 10pt;
  font-weight: 450;
  padding: 1px 4px;
}

label>span{
  margin-right: 4px;
}

label:hover{
  outline: solid 2px var(--textImportantColor);
  outline-offset: 2px;
}

</style>
