<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
import {getCurrentInstance} from "vue";

const props = defineProps({
  placeholder: {type: String, required: false, default: ""},
  maxLength: {type: Number, required: false, default: -1},
})
const text = defineModel()

const id = getCurrentInstance().uid


</script>

<template>
  <div class="parent">
    <input :id="id" type="text" v-model="text" :placeholder="props.placeholder" :maxLength="props.maxLength">
    <label :for="id">
      <icon-svg url="/icons/edit.svg" theme="default" :hover-effect="true"></icon-svg>
    </label>
  </div>
</template>

<style scoped>



div{
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  flex-grow: 1;
}

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
  outline-color: var(--accentColor);

}

label{
  cursor: pointer;
}
</style>
