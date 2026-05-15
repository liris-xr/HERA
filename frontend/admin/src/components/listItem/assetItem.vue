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

const animations = ref([]);
const selectedOption = ref(null);
const compressFormat = ref("webp");
const showAdvancedOptimization = ref(false);

const hasAnimations = computed(() => animations.value.length > 0);

const isBusy = computed(() => props.loading || props.simplifying);

const canProcess = computed(() => {
  return (
      props.rightMenu &&
      !props.loading &&
      !props.error &&
      !!props.asset?.id
  );
});

function onClick(cb) {
  if (!isBusy.value) cb();
}

watch(
    () => props.asset,
    (asset) => {
      animations.value = asset?.animations?.map((el) => el.name) ?? [];
    },
    { immediate: true, deep: true }
);

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
  <div
      class="item"
      :class="{ active: active }"
      @click.stop="onClick(() => emit('select'))"
  >
    <div class="assetCardHeader">
      <div class="assetIdentity">
        <span v-if="index !== undefined" class="assetIndex">
          {{ index + 1 }}
        </span>

        <div class="assetTextBlock">
          <span class="assetName" :class="{ textStrike: hideInViewer || error }">
            {{ text }}
          </span>

          <span v-if="hideInViewer" class="notDisplayedInfo">
            {{ $t("sceneView.leftSection.sceneAssets.assetNotDisplayed") }}
          </span>
        </div>
      </div>

      <div class="assetHeaderActions">
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

        <tag
            v-if="rightMenu"
            :text="'3D/' + getFileExtension(text)"
            icon="/icons/3d.svg"
        />
      </div>
    </div>

    <div v-if="rightMenu" class="assetToolsRow">
      <div class="assetLeftTools">
        <div v-if="hasAnimations">
          <select
              v-model="selectedOption"
              :disabled="isBusy"
              @click.stop
              @change="emit('animationChanged', selectedOption === 'none' ? null : selectedOption)"
          >
            <option value="none">{{ $t("none") }}</option>
            <option
                v-for="option in animations"
                :key="option"
                :value="option"
            >
              {{ option }}
            </option>
          </select>
        </div>

        <a
            v-if="downloadUrl && !error && !loading"
            target="_blank"
            :href="downloadUrl"
            title="Download asset"
            @click.stop
        >
          <icon-svg
              url="/icons/download.svg"
              theme="text"
              class="iconAction"
          />
        </a>

        <icon-svg
            v-if="hideInViewer"
            url="/icons/display_off.svg"
            class="iconAction"
            title="Hidden in viewer"
            @click.stop="onClick(() => emit('hideInViewer', true))"
        />

        <icon-svg
            v-else
            url="/icons/display_on.svg"
            class="iconAction"
            title="Displayed in viewer"
            @click.stop="onClick(() => emit('hideInViewer', false))"
        />
      </div>

      <div class="assetRightTools">
        <icon-svg
            url="/icons/duplicate.svg"
            class="iconAction"
            title="Duplicate asset"
            @click.stop="onClick(() => emit('duplicate'))"
        />

        <icon-svg
            url="/icons/delete.svg"
            class="iconAction dangerIcon"
            title="Delete asset"
            @click.stop="onClick(() => emit('delete'))"
        />
      </div>
    </div>

    <div v-if="canProcess" class="optimizationBox" @click.stop>
      <div class="optimizationMainRow">
        <button
            class="primaryOptimizeButton"
            type="button"
            :disabled="isBusy"
            @click.stop="runOptimize"
        >
          {{ simplifying ? "Optimizing..." : "Optimize automatically" }}
        </button>

        <button
            class="advancedToggle"
            type="button"
            :disabled="isBusy"
            @click.stop="toggleAdvancedOptimization"
        >
          {{ showAdvancedOptimization ? "Hide advanced" : "Advanced options" }}
        </button>
      </div>

      <p class="optimizationHint">
        Compresses large textures and generates lighter geometry variants when useful.
      </p>

      <div v-if="showAdvancedOptimization" class="advancedOptimizationPanel">
        <div class="manualAction">
          <div class="manualActionText">
            <strong>Geometry only</strong>
            <p>
              Generate simplified variants without changing textures.
            </p>
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
            <p>
              Compress textures without changing geometry.
            </p>
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
        v-if="reset"
        url="/icons/restart.svg"
        class="iconAction"
        @click.stop="onClick(() => emit('reset'))"
    />
  </div>
</template>

<style scoped>
.item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background-color: var(--darkerBackgroundColor);
  border: 1px solid transparent;
  transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      background-color 0.15s ease;
}

.item:hover {
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}

.item.active {
  border-color: var(--accentColor);
  box-shadow: 0 0 0 2px rgba(55, 145, 245, 0.12);
}

.assetCardHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.assetIdentity {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.assetIndex {
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  background-color: var(--backgroundColor);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--textColor);
  flex-shrink: 0;
}

.assetTextBlock {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.assetName {
  color: var(--textImportantColor);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.assetHeaderActions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.assetToolsRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 2px;
}

.assetLeftTools,
.assetRightTools {
  display: flex;
  align-items: center;
  gap: 12px;
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
  opacity: 0.85;
  transition:
      opacity 0.15s ease,
      transform 0.15s ease;
}

.iconAction:hover {
  opacity: 1;
  transform: translateY(-1px);
}

.dangerIcon:hover {
  opacity: 1;
}

.optimizationBox {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background-color: var(--backgroundColor);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.optimizationMainRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.primaryOptimizeButton {
  width: fit-content;
  padding: 7px 12px;
  border: 1px solid var(--accentColor);
  border-radius: 8px;
  background-color: var(--accentColor);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.primaryOptimizeButton:hover:not(:disabled) {
  opacity: 0.92;
}

.primaryOptimizeButton:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.optimizationHint {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--textColor);
  opacity: 0.72;
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
  white-space: nowrap;
}

.advancedToggle:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.advancedOptimizationPanel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
}

.manualAction {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
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
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
}

.formatSelect {
  max-width: 85px;
  padding: 4px 5px;
  font-size: 11px;
}

.secondaryOptimizeButton {
  width: fit-content;
  padding: 5px 8px;
  border: 1px solid var(--darkerBackgroundColor);
  border-radius: 7px;
  background-color: var(--backgroundColor);
  color: var(--textImportantColor);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
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

select {
  max-width: 140px;
}
</style>