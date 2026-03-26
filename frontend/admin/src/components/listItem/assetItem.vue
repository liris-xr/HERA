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
  "simplify",
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

const canSimplify = computed(
    () =>
        props.rightMenu &&
        !props.loading &&
        !props.error &&
        !!props.asset?.id
);

onMounted(() => {
  selectedOption.value = props.activeAnimation ?? "none";
});

watch(simplifyRatio, () => {
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

      <div v-if="canSimplify" class="simplifyBox" @click.stop="">
        <input
            class="simplifyRange"
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            v-model.number="simplifyRatio"
            :disabled="simplifying"
        />

        <span class="simplifyValue">{{ simplifyRatio.toFixed(2) }}</span>

        <button
            class="simplifyBtn"
            type="button"
            :disabled="simplifying"
            @click.stop="() => {
            if (simplifying) return;
            emit('simplify', { ratio: simplifyRatio });
          }"
        >
          {{ simplifying ? "Simplifying..." : "Simplify" }}
        </button>
      </div>

      <icon-svg url="/icons/duplicate.svg" v-if="rightMenu" class="iconAction" @click.stop="onClick(() => $emit('duplicate'))"/>
      <icon-svg url="/icons/delete.svg" v-if="rightMenu" class="iconAction" @click.stop="onClick(() => $emit('delete'))"/>
      <icon-svg url="/icons/restart.svg" v-if="reset" class="iconAction" @click.stop="onClick(() => $emit('reset'))"/>
    </div>
  </div>
</template>

<style scoped>
.simplifyBox {
  display: flex;
  align-items: center;
  gap: 8px;
}

.simplifyRange {
  width: 120px;
}

.simplifyBtn {
  padding: 4px 8px;
  cursor: pointer;
}

.simplifyBtn:disabled,
.simplifyRange:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>