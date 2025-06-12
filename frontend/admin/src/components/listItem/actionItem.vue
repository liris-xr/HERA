<script setup>

import {onMounted, ref} from "vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import {actions} from "@/js/threeExt/triggerManagement/actionList.js";
import {TriggerAction} from "@/js/threeExt/triggerManagement/triggerAction.js";

const props = defineProps({
  index: {type: Number, default: 0},
  triggerAction: {type: TriggerAction, required: true},
  listObject: {type: Object, required: true},
  show:{type: Boolean, default: false}
});


let object = ref(null);
let action = ref(null);
let timestampStart = ref(0);

onMounted(() => {
  if (props.triggerAction) {

    action.value = props.triggerAction.getAction();
    object.value = props.triggerAction.getObject();
    timestampStart.value = props.triggerAction.getTimestampStart();
  }
});

function getActionKeyByLabel(label) {
  return label || "none";
}

function updateAction(newAction) {
  props.triggerAction.setAction(newAction);
}

function updateObject(newObject) {
  props.triggerAction.setObject(newObject);
}

function updateTimestampStart(newTimestampStart) {
  console.log("function");
  console.log(newTimestampStart);
  props.triggerAction.setTimestampStart(newTimestampStart);
}

</script>

<template>
    <div class="inlineFlex">
      <span>{{props.index+1}}</span>

      <div>
        <select v-model="action"  @change="updateAction(action)">
          <option v-for="(label, key) in actions" :key="label" :value="key">
            {{ label }}
          </option>
        </select>

        <select v-model="object"  @change="updateObject(object)"
                v-if="getActionKeyByLabel(action) !== 'none'
                && listObject[getActionKeyByLabel(action)].length > 0">
          <option v-for="obj in listObject[getActionKeyByLabel(action)]" :key="obj.id" :value="obj">
            {{ obj.label }}
          </option>
        </select>

        <input type="number" placeholder="Entrée (ms)" min="0" v-model="timestampStart" @change="updateTimestampStart(timestampStart)">

      </div>
      <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="$emit('delete')"/>
    </div>

</template>

<style scoped>

select{
  overflow: hidden;
  text-overflow: ellipsis;
  width: 200px;
  max-width: 200px;
}

span {
  margin-right: 10px;
}

input, select{
  width: auto;
  flex-grow: 1;

  color: var(--textImportantColor);
  border: solid 1px var(--darkerBackgroundColor);
  background: none;
  padding: 4px;
  border-radius: 4px;
  margin-right: 4px;
  font-size: 16px;
}

input:focus{
  background-color: var(--darkerBackgroundColor);
  outline: none;
}

label{
  cursor: pointer;
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