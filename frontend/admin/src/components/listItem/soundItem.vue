<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";

const props = defineProps({
  index: {type: Number, default: 0},
  text: {type: String, required: true},
  playOnStartup: {type: Boolean, required: true, default: false},
  isLoopingEnabled: {type: Boolean, required: true, default: false},
  error: {type: Boolean, default: false},
  loading: {type: Boolean, default: false},
  downloadUrl: {type: String, required: true},
});

defineEmits(['delete', 'playOnStartup', 'loopingEnabled', 'duplicate']);

const onClick = (cb) => {
  if(!(props.loading)) cb()
}

</script>

<template>
  <div class="item">
    <div class="inlineFlex">
      <span :class="{textStrike: error}"></span>
      <span>{{index+1}}</span>
      <span>{{text}}</span>
    </div>

    <div class="inlineFlex">
      <icon-svg url="/icons/warning.svg" theme="danger" v-if="error" :title="$t('sceneView.leftSection.sceneSounds.assetLoadFailed')" class="iconAction"/>
      <icon-svg url="/icons/spinner.svg" theme="default" v-if="loading"/>

        <a v-if="downloadUrl && !error && !loading" target="_blank" rel="noopener noreferrer" :href="downloadUrl">
        <icon-svg url="/icons/download.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop=""/>
      </a>

      <icon-svg url="/icons/delete.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('delete'); })"/>

      <icon-svg v-if="isLoopingEnabled" url="/icons/looping.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('loopingEnabled',false)})"/>
      <icon-svg v-else url="/icons/notLooping.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('loopingEnabled', true)})"/>

      <icon-svg v-if="playOnStartup" url="/icons/playOnStartup.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('playOnStartup',false)})"/>
      <icon-svg v-else url="/icons/notPlayOnStartup.svg" theme="text" class="iconAction" :hover-effect="true" @click.stop="onClick(()=>{$emit('playOnStartup', true)})"/>
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
  margin-bottom: 0;
}



.textStrike{
  text-decoration: line-through;
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