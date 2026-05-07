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

const animations = ref([]);
const hasAnimations = computed(() => animations.value.length > 0);

watch(
    () => props.asset,
    (asset) => {
      animations.value = asset?.animations?.map((el) => el.name) ?? [];
    },
    { immediate: true, deep: true }
);

const selectedOption = ref(null);
const compressFormat = ref("webp");
const showAdvancedOptimization = ref(false);

const canProcess = computed(() => {
  return (
      props.rightMenu &&
      !props.loading &&
      !props.error &&
      !!props.asset?.id
  );
});

const isBusy = computed(() => props.loading || props.simplifying);

onMounted(() => {
  selectedOption.value = props.activeAnimation ?? "none";
});

watch(compressFormat, () => {
  emit("changed");
});

function runOptimize() {
  if (isBusy.value) return;
  emit("optimize");
}

function runSimplify() {
  if (isBusy.value) return;

  emit("simplify", {
    ratio: 0.25,
  });
}

function runCompress() {
  if (isBusy.value) return;

  emit("compress", {
    format: compressFormat.value,
  });
}

function toggleAdvancedOptimization() {
  showAdvancedOptimization.value = !showAdvancedOptimization.value;
}
</script>

<template>
  <div class="item" :class="{ active: active }" @click.stop="onClick(() => emit('select'))">
    <div class="inlineFlex assetMainInfo">
      <span v-if="index !== undefined">{{ index + 1 }}</span>

      <span class="assetName" :class="{ textStrike: hideInViewer || error }">
        {{ text }}
      </span>

      <span v-if="hideInViewer" class="notDisplayedInfo">
        {{ $t("sceneView.leftSection.sceneAssets.assetNotDisplayed") }}
      </span>
    </div>

    <div class="inlineFlex assetActions">
      <icon-svg
          v-if="rightMenu && error"
          url="/icons/warning.svg"
          theme="danger"
          class="iconAction"
      />

      <icon-svg
          v-if="rightMenu && (loading || simplifying)"
          url="/icons/spinner.svg"
          theme="default"
      />

      <div v-if="rightMenu && hasAnimations">
        <select
            v-model="selectedOption"
            :disabled="isBusy"
            @change="emit('animationChanged', selectedOption === 'none' ? null : selectedOption)"
        >
          <option value="none">{{ $t("none") }}</option>
          <option v-for="option in animations" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>

      <tag
          v-if="rightMenu"
          :text="'3D/' + getFileExtension(text)"
          icon="/icons/3d.svg"
      />

      <a
          v-if="rightMenu && downloadUrl && !error && !loading"
          target="_blank"
          :href="downloadUrl"
          @click.stop
      >
        <icon-svg url="/icons/download.svg" theme="text" class="iconAction" />
      </a>

      <icon-svg
          v-if="rightMenu && hideInViewer"
          url="/icons/display_off.svg"
          class="iconAction"
          @click.stop="onClick(() => emit('hideInViewer', true))"
      />

      <icon-svg
          v-else-if="rightMenu"
          url="/icons/display_on.svg"
          class="iconAction"
          @click.stop="onClick(() => emit('hideInViewer', false))"
      />

      <div v-if="canProcess" class="optimizationBox" @click.stop>
        <button
            class="primaryOptimizeButton"
            type="button"
            :disabled="isBusy"
            @click.stop="runOptimize"
        >
          {{ simplifying ? "Optimizing..." : "Optimize automatically" }}
        </button>

        <p class="optimizationHint">
          Compresses large textures and generates lighter geometry variants when useful.
        </p>

        <button
            class="advancedToggle"
            type="button"
            :disabled="isBusy"
            @click.stop="toggleAdvancedOptimization"
        >
          {{ showAdvancedOptimization ? "Hide advanced options" : "Advanced options" }}
        </button>

        <div v-if="showAdvancedOptimization" class="advancedOptimizationPanel">
          <div class="manualAction">
            <div class="manualActionText">
              <strong>Geometry only</strong>
              <p>Generate simplified geometry variants without changing textures.</p>
            </div>

            <button
                class="secondaryOptimizeButton"
                type="button"
                :disabled="isBusy"
                @click.stop="runSimplify"
            >
              {{ simplifying ? "Processing..." : "Simplify geometry" }}
            </button>
          </div>

          <div class="manualAction">
            <div class="manualActionText">
              <strong>Textures only</strong>
              <p>Compress textures without simplifying the model geometry.</p>
            </div>

            <div class="textureControls">
              <select
                  v-model="compressFormat"
                  :disabled="isBusy"
                  class="formatSelect"
                  @click.stop
              >
                <option value="webp">WebP</option>
              </select>

              <button
                  class="secondaryOptimizeButton"
                  type="button"
                  :disabled="isBusy"
                  @click.stop="runCompress"
              >
                {{ simplifying ? "Processing..." : "Compress textures" }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <icon-svg
          v-if="rightMenu"
          url="/icons/duplicate.svg"
          class="iconAction"
          @click.stop="onClick(() => emit('duplicate'))"
      />

      <icon-svg
          v-if="rightMenu"
          url="/icons/delete.svg"
          class="iconAction"
          @click.stop="onClick(() => emit('delete'))"
      />

      <icon-svg
          v-if="reset"
          url="/icons/restart.svg"
          class="iconAction"
          @click.stop="onClick(() => emit('reset'))"
      />
    </div>
  </div>
</template>

<style scoped>
.item {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.inlineFlex {
  display: flex;
  align-items: center;
}

.assetMainInfo {
  min-width: 0;
  flex: 1;
  gap: 8px;
}

.assetActions {
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.assetName {
  overflow-wrap: anywhere;
}

.textStrike {
  text-decoration: line-through;
  opacity: 0.65;
}

.notDisplayedInfo {
  font-size: 12px;
  opacity: 0.7;
}

.iconAction {
  cursor: pointer;
}

.optimizationBox {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 210px;
  max-width: 260px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
}

.primaryOptimizeButton {
  width: fit-content;
  padding: 6px 10px;
  border: 1px solid var(--accentColor);
  border-radius: 6px;
  background-color: var(--accentColor);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.primaryOptimizeButton:hover:not(:disabled) {
  opacity: 0.9;
}

.primaryOptimizeButton:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.optimizationHint {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--textColor);
  opacity: 0.75;
}

.advancedToggle {
  width: fit-content;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--accentColor);
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
}

.advancedToggle:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.advancedOptimizationPanel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--darkerBackgroundColor);
  border-radius: 8px;
  background-color: var(--backgroundColor);
}

.manualAction {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.manualActionText {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.manualAction strong {
  font-size: 12px;
  color: var(--textImportantColor);
}

.manualAction p {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--textColor);
  opacity: 0.75;
}

.textureControls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.formatSelect {
  max-width: 85px;
  padding: 3px 4px;
  font-size: 11px;
}

.secondaryOptimizeButton {
  width: fit-content;
  padding: 4px 8px;
  border: 1px solid var(--darkerBackgroundColor);
  border-radius: 6px;
  background-color: var(--backgroundColor);
  color: var(--textImportantColor);
  font-size: 11px;
  cursor: pointer;
}

.secondaryOptimizeButton:hover:not(:disabled) {
  border-color: var(--accentColor);
  color: var(--accentColor);
}

.secondaryOptimizeButton:disabled,
.formatSelect:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>