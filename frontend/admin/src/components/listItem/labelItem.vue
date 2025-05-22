<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
import Tag from "@/components/tag.vue";
import {getCurrentInstance} from "vue";
import {Label} from "@/js/threeExt/postprocessing/label.js";

const props = defineProps({
  index: {type: Number, default: 0},
  active: {type: Boolean, default: false},
})

const text = defineModel();
const id = getCurrentInstance().uid;

defineEmits(['advanced-edit','delete'])
</script>

<template>
  <div class="item" :class="{active: active}">
    <div class="inlineFlex">
      <span>{{index+1}}</span>
      <input :id="id" type="text" v-model="text" :placeholder="props.placeholder" :maxLength="props.maxLength" @keydown.enter.prevent>
      

    </div>
    <div class="inlineFlex">
      <tag text="2D/txt" icon="/icons/info.svg"/>
      <icon-svg url="/icons/edit.svg" theme="text" class="iconAction" :hover-effect="true" @click="$emit('advanced-edit')"/>
      <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="$emit('delete')"/>
    </div>
  </div>
</template>

<style scoped>

input{
  width: auto;
  flex-grow: 1;

  color: var(--textImportantColor);
  border: solid 1px var(--darkerBackgroundColor);
  background: none;
  padding: 4px;
  border-radius: 4px;
  margin-right: 4px;
  font-size: 16px;
  field-sizing: content;
}

input:focus{
  background-color: var(--darkerBackgroundColor);
  outline: none;

}

label{
  cursor: pointer;
}



.active{
  outline: solid 2px var(--accentColor);
}


.inlineFlex {
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 8px;
}


.item > div {
  align-items: center;
  height: 100%;
  width: fit-content;
  margin-bottom: 0;
}

.item > div:first-child {
  width: 100%;
  overflow: hidden;
}

.item > div input {
  width: 85%;
}

.item > div:last-child {
  justify-content: flex-end;
}

.iconAction {
  cursor: pointer;
}

.item > div > * {
  margin-right: 8px;
}




</style>
