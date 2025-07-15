<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
import Tag from "@/components/tag.vue";
import {getFileExtension} from "@/js/utils/fileUtils.js";
import {computed, onMounted, ref, watch} from "vue";


const props = defineProps({
  index: {type: Number, required: false},
  text: {type: String, required: true},
  downloadUrl: {type: String, required: false},
  hideInViewer: {type: Number, default: 0},
  active: {type: Boolean, default: false},
  error: {type: Boolean, default: false},
  loading: {type: Boolean, default: false},
  activeAnimation: {type: String, default: null},
  asset: {type: Object, default: null},
  rightMenu: {type: Boolean, default: true},
  reset: {type: Boolean, default: false},
})

defineEmits(['select','delete','duplicate','hideInViewer', 'animationChanged', 'reset'])

const onClick = (cb) => {
  if(!(props.loading)) cb()
}


let animations = ref([])
let hasAnimations = computed(() => animations.value.length > 0)

watch(
    ()=>props.asset,
    (asset)=> {
      animations.value = asset.animations.map((el) => el.name)
    },
    {immediate: true, deep: true}
)

const selectedOption = ref(null)

onMounted(async () => {
  selectedOption.value = props.activeAnimation ?? "none"
})



</script>

<template>
  <div class="item" :class="{active: active}" @click.stop="onClick(()=>{$emit('select')})">
    <div class="inlineFlex">
      <span v-if="index != undefined">{{index+1}}</span>
      <span :class="{textStrike: hideInViewer||error}">{{text}}</span>
      <span v-if="hideInViewer == 1" class="notDisplayedInfo">{{$t("sceneView.leftSection.sceneAssets.assetNotDisplayed")}}</span>
      <span v-else-if="hideInViewer == 2" class="notDisplayedInfo">{{$t("sceneView.leftSection.sceneAssets.assetNotDisplayedInAr")}}</span>
      <span v-else class="notDisplayedInfo"></span>
    </div>

    <div class="inlineFlex">
      <icon-svg url="/icons/warning.svg" theme="danger" v-if="rightMenu && error" :title="$t('sceneView.leftSection.sceneAssets.assetLoadFailed')" class="iconAction"/>
      <icon-svg url="/icons/spinner.svg" theme="default" v-if="rightMenu && loading"/>

      <div v-if="rightMenu && hasAnimations">
        <select v-model="selectedOption" @change="$emit('animationChanged', selectedOption === 'none' ? null : selectedOption)">
          <option value="none">{{ $t("none") }}</option>
          <option v-for="option in animations" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>

      <tag v-if="rightMenu" :text="'3D/'+getFileExtension(text)" icon="/icons/3d.svg"/>

      <a v-if="rightMenu && downloadUrl && !error && !loading" target="_blank" rel="noopener noreferrer" :href="downloadUrl">
        <icon-svg url="/icons/download.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop=""/>
      </a>

      <icon-svg v-if="rightMenu && hideInViewer == 1" url="/icons/display_off.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('hideInViewer')})"/>
      <icon-svg v-else-if="rightMenu && hideInViewer == 2" url="/icons/totally_hide.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('hideInViewer')})"/>
      <icon-svg v-else url="/icons/display_on.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('hideInViewer')})"/>

      <icon-svg v-if="rightMenu" url="/icons/duplicate.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('duplicate')})"/>
      <icon-svg v-if="rightMenu" url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('delete')})"/>
      <icon-svg v-if="reset" url="/icons/restart.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('reset')})"/>
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

select {
  width: 100px;
}

</style>
