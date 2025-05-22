<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
import Tag from "@/components/tag.vue";

const props = defineProps({
  index: {type: Number, default: 0},
  active: {type: Boolean, default: false},
  hideInViewer: {type: Boolean, default: false},
  loading: {type: Boolean, default: false},
  error: {type: Boolean, default: false},
  actionIn: {type: String, default: "none"},
  actionOut: {type: String, default: "none"}
})

const onClick = (emit) =>{
  if(!(props.loading)) emit()
}

defineEmits(['select','delete', 'hideInViewer', 'advanced-edit']);

</script>

<template>
  <div class="item" :class="{active: active}">
    <div class="inlineFlex">
      <span>{{index+1}}</span>

      <span :class="{textStrike: hideInViewer||error}"></span>
      <span v-if="hideInViewer" class="notDisplayedInfo">{{$t("sceneView.leftSection.sceneTriggers.assetNotDisplayed")}}</span>
      <span>Action: </span>
      <span>{{$t("sceneView.leftSection.sceneTriggers.actionIn")}} : {{ props.actionIn }} {{$t("sceneView.leftSection.sceneTriggers.actionOut")}} : {{ props.actionOut }}</span>


    </div>
    <div class="inlineFlex">
      <tag text="3D/THREEJS" icon="/icons/info.svg"/>
      <icon-svg v-if="hideInViewer" url="/icons/display_off.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('hideInViewer',true)})"/>
      <icon-svg v-else url="/icons/display_on.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('hideInViewer', false)})"/>
      <icon-svg url="/icons/scale.svg" theme="text" class="iconAction" :hover-effect="true" @click="$emit('advanced-edit')"/>
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
