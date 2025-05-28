<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
import {computed, onMounted, reactive, ref} from "vue";
import {useI18n} from "vue-i18n";
import {getResource} from "@/js/endpoints.js";

const {t} = useI18n();

const props = defineProps({
  text: {type: String},
  downloadUrl: {type: String},
  hideInViewer: {type: Boolean, required: true, default: false},
  active: {type: Boolean, default: false},
  error: {type: Boolean, default: false},
  loading: {type: Boolean, default: false},
})

const envmapContent = ref(null)

defineEmits(['delete'])
defineExpose({
  envmapContent
})

const onClick = (cb) => {
  if(!(props.error || props.loading)) cb()
}

const fileLabel = computed(() => props.text && props.text.replaceAll("/", "\\").split("\\")[props.text.replaceAll("/", "\\").split("\\").length - 1] || t("none"));

</script>

<template>
  <label>{{$t("projectView.leftSection.projectEnvmap.current")}}</label>
  <div class="item" :class="{active: active}">
    <div class="inlineFlex">
      <span :class="{textStrike: hideInViewer||error}" ref="envmapContent">{{fileLabel}}</span>
      <span class="inlineFlex" v-if="fileLabel != 'Aucune'">
        <icon-svg url="/icons/warning.svg" theme="danger" v-if="error" :title="$t('sceneView.leftSection.sceneAssets.assetLoadFailed')" class="iconAction"/>
        <icon-svg url="/icons/spinner.svg" theme="default" v-if="loading"/>

        <a v-if="downloadUrl" target="_blank" rel="noopener noreferrer" :href="getResource(downloadUrl)">
          <icon-svg url="/icons/download.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop=""/>
        </a>
        <icon-svg v-if="downloadUrl" url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('delete')})"/>
      </span>
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
  margin-bottom: 0;
}

.item span {
  overflow: visible;
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

.item {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  background-color: var(--darkerBackgroundColor);
  border-radius: 8px;
  margin-bottom: 8px;
  padding: 8px;
}

</style>
