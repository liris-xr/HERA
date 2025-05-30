<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
import Tag from "@/components/tag.vue";
import {getFileExtension} from "@/js/utils/fileUtils.js";

const props = defineProps({
  index: {type: Number, default: 0},
  text: {type: String, required: true},
  downloadUrl: {type: String, required: true},
  hideInViewer: {type: Boolean, required: true, default: false},
  active: {type: Boolean, default: false},
  error: {type: Boolean, default: false},
  loading: {type: Boolean, default: false},
})

defineEmits(['select','delete','hideInViewer'])

const onClick = (cb) => {
  if(!(props.error || props.loading)) cb()
}
</script>

<template>
  <div class="item" :class="{active: active}" @click.stop="onClick(()=>{$emit('select')})">
    <div class="inlineFlex">
      <span>{{index+1}}</span>
      <span :class="{textStrike: hideInViewer||error}">{{text}}</span>
      <span v-if="hideInViewer" class="notDisplayedInfo">{{$t("sceneView.leftSection.sceneAssets.assetNotDisplayed")}}</span>
    </div>
    <div class="inlineFlex">
      <icon-svg url="/icons/warning.svg" theme="danger" v-if="error" :title="$t('sceneView.leftSection.sceneAssets.assetLoadFailed')" class="iconAction"/>
      <icon-svg url="/icons/spinner.svg" theme="default" v-if="loading"/>
      <tag :text="'3D/'+getFileExtension(text)" icon="/icons/3d.svg"/>

      <a v-if="downloadUrl" target="_blank" rel="noopener noreferrer" :href="downloadUrl">
        <icon-svg url="/icons/download.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop=""/>
      </a>
      
      <icon-svg v-if="hideInViewer" url="/icons/display_off.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('hideInViewer',true)})"/>
      <icon-svg v-else url="/icons/display_on.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('hideInViewer', false)})"/>
      <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('delete')})"/>
    </div>
  </div>
</template>

<style scoped>

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

.active{
  outline: solid 2px var(--accentColor);
}

.textStrike{
  text-decoration: line-through;
}

.notDisplayedInfo{
  font-size: 10pt;
  font-style: italic;
  color: var(--textImportantColor);
}

</style>
