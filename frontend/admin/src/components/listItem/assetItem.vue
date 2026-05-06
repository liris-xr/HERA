<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";
import Tag from "@/components/tag.vue";
import { getFileExtension } from "@/js/utils/fileUtils.js";
import { computed, onMounted, ref, watch } from "vue";

const props = defineProps({
  index: { type: Number, required: false },
  text: { type: String, required: true },
  downloadUrl: { type: String, required: false },
  hideInViewer: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  simplifying: { type: Boolean, default: false },
  activeAnimation: { type: String, default: null },
  asset: { type: Object, default: null },
  rightMenu: { type: Boolean, default: true },
  reset: { type: Boolean, default: false },
});

const emit = defineEmits([
  "select",
  "delete",
  "duplicate",
  "hideInViewer",
  "animationChanged",
  "reset",
  "optimize",
  "simplify",
  "compress",
  "changed",
]);

const onClick = (cb) => {
  if (!props.loading && !props.simplifying) cb();
};

let animations = ref([]);
let hasAnimations = computed(() => animations.value.length > 0);

watch(
    () => props.asset,
    (asset) => {
      animations.value = asset?.animations?.map((el) => el.name) ?? [];
    },
    { immediate: true, deep: true }
);

const selectedOption = ref(null);
const simplifyRatio = ref(0.25);
const compressFormat = ref("webp");

const canProcess = computed(
    () =>
        props.rightMenu &&
        !props.loading &&
        !props.error &&
        !!props.asset?.id
);

onMounted(() => {
  selectedOption.value = props.activeAnimation ?? "none";
});

watch([simplifyRatio, compressFormat], () => {
  emit("changed");
});
</script>

<template>
  <div class="item" :class="{ active: active }" @click.stop="onClick(() => $emit('select'))">
    <div class="inlineFlex">
      <span v-if="index != undefined">{{ index + 1 }}</span>
      <span :class="{ textStrike: hideInViewer || error }">{{ text }}</span>
      <span v-if="hideInViewer" class="notDisplayedInfo">
        {{$t("sceneView.leftSection.sceneAssets.assetNotDisplayed")}}
      </span>
    </div>

    <div class="inlineFlex">
      <icon-svg url="/icons/warning.svg" theme="danger" v-if="rightMenu && error" class="iconAction"/>
      <icon-svg url="/icons/spinner.svg" theme="default" v-if="rightMenu && (loading || simplifying)"/>

      <div v-if="rightMenu && hasAnimations">
        <select
            v-model="selectedOption"
            @change="$emit('animationChanged', selectedOption === 'none' ? null : selectedOption)"
        >
          <option value="none">{{ $t("none") }}</option>
          <option v-for="option in animations" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>

      <tag v-if="rightMenu" :text="'3D/' + getFileExtension(text)" icon="/icons/3d.svg"/>

      <a v-if="rightMenu && downloadUrl && !error && !loading" target="_blank" :href="downloadUrl">
        <icon-svg url="/icons/download.svg" theme="text" class="iconAction"/>
      </a>

      <icon-svg
          v-if="rightMenu && hideInViewer"
          url="/icons/display_off.svg"
          class="iconAction"
          @click.stop="onClick(() => $emit('hideInViewer', true))"
      />
      <icon-svg
          v-else-if="rightMenu"
          url="/icons/display_on.svg"
          class="iconAction"
          @click.stop="onClick(() => $emit('hideInViewer', false))"
      />

      <div v-if="canProcess" class="processingBox" @click.stop="">
        <!-- Full optimize: texture policy + LOD variants -->
        <div class="actionGroup">
          <button
              class="actionBtn"
              type="button"
              :disabled="simplifying"
              @click.stop="emit('optimize')"
          >
            {{ simplifying ? "..." : "Optimize" }}
          </button>
        </div>

        <!-- Geometry-only LODs -->
        <div class="actionGroup">
          <button
              class="actionBtn"
              type="button"
              :disabled="simplifying"
              @click.stop="emit('simplify', { ratio: 0.25 })"
          >
            {{ simplifying ? "..." : "Simplify Geometry" }}
          </button>
        </div>

        <!-- Texture-only LODs -->
        <div class="actionGroup">
          <select v-model="compressFormat" :disabled="simplifying" class="formatSelect">
            <option value="webp">WebP</option>
          </select>
          <button
              class="actionBtn"
              type="button"
              :disabled="simplifying"
              @click.stop="emit('compress', { format: compressFormat })"
          >
            {{ simplifying ? "..." : "Compress Textures" }}
          </button>
        </div>
      </div>

      <icon-svg url="/icons/duplicate.svg" v-if="rightMenu" class="iconAction" @click.stop="onClick(() => $emit('duplicate'))"/>
      <icon-svg url="/icons/delete.svg" v-if="rightMenu" class="iconAction" @click.stop="onClick(() => $emit('delete'))"/>
      <icon-svg url="/icons/restart.svg" v-if="reset" class="iconAction" @click.stop="onClick(() => $emit('reset'))"/>
    </div>
  </div>
</template>

<style scoped>
.processingBox {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(0,0,0,0.05);
  padding: 4px;
  border-radius: 4px;
}

.actionGroup {
  display: flex;
  align-items: center;
  gap: 6px;
}

.simplifyRange {
  width: 60px;
}

.valueLabel {
  font-size: 10px;
  min-width: 25px;
}

.formatSelect {
  font-size: 10px;
  padding: 2px;
}

.actionBtn {
  padding: 2px 6px;
  cursor: pointer;
  font-size: 10px;
  background: var(--darkerBackgroundColor);
  border: 1px solid var(--borderColor);
  border-radius: 4px;
}

.actionBtn:disabled,
.simplifyRange:disabled,
.formatSelect:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
