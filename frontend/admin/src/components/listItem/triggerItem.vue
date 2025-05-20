<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
import Tag from "@/components/tag.vue";
import {ActionManager} from "@/js/threeExt/trigger/actionManager.js";


const props = defineProps({
  index: {type: Number, default: 0},
  active: {type: Boolean, default: false},
  hideInViewer: {type: Boolean, default: false},
  action: {type: String, default: "None"},
  loading: {type: Boolean, default: false},
  error: {type: Boolean, default: false},
})

const actionManager = new ActionManager()

const onClick = (emit) =>{
  if(!(props.loading)) emit()
}

defineEmits(['select', 'duplicate','delete', 'hideInViewer', 'action']);

const text = defineModel();

const selectedAction = "None";

</script>

<template>
  <div class="item" :class="{active: active}">
    <div class="inlineFlex">
      <span>{{index+1}}</span>

      <span :class="{textStrike: hideInViewer||error}">{{text}}</span>
      <span v-if="hideInViewer" class="notDisplayedInfo">{{$t("sceneView.leftSection.sceneAssets.assetNotDisplayed")}}</span>
      <span>Action: </span>
      <select v-model="selectedAction" @change="()=>{$emit('action', selectedAction)}" >
        <option v-for="(fn, name) in actionManager.getActions()" :key="name" :value="name" @click="onClick(()=>{$emit('action',true)})">
          {{ name }}
        </option>
      </select>

    </div>
    <div class="inlineFlex">
      <tag text="3D/THREEJS" icon="/icons/info.svg"/>
      <icon-svg v-if="hideInViewer" url="/icons/display_off.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('hideInViewer',true)})"/>
      <icon-svg v-else url="/icons/display_on.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('hideInViewer', false)})"/>
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

.item > div:last-child {
  justify-content: flex-end;
}

.iconAction {
  cursor: pointer;
}

.item > div > * {
  margin-right: 8px;
}

.notDisplayedInfo{
  font-size: 10pt;
  font-style: italic;
  color: var(--textImportantColor);
}

</style>
