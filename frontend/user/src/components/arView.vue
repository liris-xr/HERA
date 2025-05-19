<script setup>
import {XrSessionManager} from "@/js/threeExt/project/xrSessionManager.js";
import {onMounted, reactive, ref, computed} from "vue";
import ButtonView from "@/components/utils/buttonView.vue";
import ExpandableArNotification from "@/components/notification/expandableArNotification.vue";
import ArNotification from "@/components/notification/arNotification.vue";
import HotDogMenu from "@/components/utils/hotDogMenu.vue";
import ToggleableContextMenuItem from "@/components/utils/ToggleableContextMenuItem.vue";
import IconContextMenuItem from "@/components/utils/IconContextMenuItem.vue";
import ActionBubble from "@/components/utils/actionBubble.vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import {useI18n} from "vue-i18n";

const {t} = useI18n()

const props = defineProps({
  json: {type: Object, required: true}
})

const emit = defineEmits(["loaded"])

const xrSessionManager = new XrSessionManager(props.json);
const overlayBottom = ref(true)

defineExpose({
  arSessionManager: reactive(xrSessionManager), // on expose une version reactive pour uniformiser l'acces aux champs
                                                // dans les pages presentation et project, car sur la 1ere, on utilise
                                                // une ref pour le socket (car il peut ne pas etre utilisé), alors que
                                                // sur l'autre, c'est un reactive car toujours utilisé, donc pas besoin
                                                // de le reaffecter
  overlayBottom
})

const container = ref(null);
const arOverlay = ref(null);
const labelContainer = ref(null);

const contextMenu = ref(null);

const xrCompatible = ref(false);
xrCompatible.value = await xrSessionManager.isXrCompatible(props.json.displayMode);
const loaded = ref(false);


onMounted(async () => {
  await xrSessionManager.init(container.value, arOverlay.value);
  loaded.value = true;
  emit("loaded")
})


function toggleContextMenuStatus(){
  contextMenu.value.toggleStatus()
}

const buttonText = computed(() => {
  if(props.json.displayMode === "ar")
    return t('projectView.arView.startAr.button')
  return t('projectView.arView.startVr.button')
})

</script>

<template>
  <div id="startButton">
    <button-view icon="/icons/ar.svg" :text="buttonText" @click="xrSessionManager.start(props.json.displayMode)" :disabled="!loaded || !xrCompatible" :class="{buttonDisabled:!loaded || !xrCompatible }" v-if="loaded"></button-view>
    <span v-if="!loaded">
      {{$t("projectView.arView.startAr.loading")}}
      <icon-svg url="/icons/spinner.svg"></icon-svg>
    </span>
    <span v-if="loaded && !xrCompatible">{{$t("projectView.arView.startAr.incompatibleDevice")}}</span>

  </div>


  <div>

    <div ref="container" id="container"></div>

    <section ref="arOverlay" id="arOverlay" :class="{overlayInvisible:!xrSessionManager.isArRunning.value, overlayVisible: xrSessionManager.isArRunning.value}">
      <div ref="labelContainer" id="labelContainer"></div>
      <div id="overlayTop" class="overlayBlur">
        <button @click="xrSessionManager.stop()">
          <icon-svg url="/icons/close.svg" theme="text"/>
        </button>
        <h2>{{props.json.title}}</h2>

        <hot-dog-menu ref="contextMenu">
          <IconContextMenuItem icon="/icons/restart.svg"
                               :text="$t('projectView.arView.arOverlay.contextMenu.reset')"
                               @click="()=>{
                                  toggleContextMenuStatus();
                                  xrSessionManager.reset()
                               }"/>
          <toggleable-context-menu-item :text="$t('projectView.arView.arOverlay.contextMenu.showLabels')"
                                        :checked="xrSessionManager.labelRenderer.isEnabled.value"
                                        @click="()=>{
                                          toggleContextMenuStatus();
                                          xrSessionManager.labelRenderer.toggleStatus()
                                        }"/>
        </hot-dog-menu>
      </div>

      
      <div id="overlayMiddle" @click="xrSessionManager.sceneManager.onSceneClick($event)">
        <ar-notification icon="/icons/info.svg" :visible="!xrSessionManager.sceneManager.scenePlacementManager.isStabilized.value">
        <template #content><p>{{$t("projectView.arView.arOverlay.slowMoveMessage")}}</p></template>
        </ar-notification>

        <ar-notification icon="/icons/3d.svg" :visible="xrSessionManager.sceneManager.scenePlacementManager.isStabilized.value && xrSessionManager.sceneManager.scenePlacementManager.isEnabled.value">
          <template #content><p>{{props.json.calibrationMessage}}</p></template>
        </ar-notification>

        <expandable-ar-notification v-if="xrSessionManager.sceneManager.active.value.hasDescription()" :title="$t('projectView.arView.arOverlay.scene.descriptionTitle')" :text="xrSessionManager.sceneManager.active.value.description"></expandable-ar-notification>
        <expandable-ar-notification v-for="error in xrSessionManager.sceneManager.active.value.getErrors.value" :title="error.title" :text="error.message"></expandable-ar-notification>


        <div id="playerActions" v-if="xrSessionManager.sceneManager.active.value.hasAnimation.value">
          <action-bubble
              :icon="xrSessionManager.sceneManager.active.value.labelPlayer.isPlaying.value ? '/icons/pause.svg' : '/icons/play.svg'"
              @click="xrSessionManager.sceneManager.active.value.labelPlayer.togglePlaying()"
          />

          <action-bubble
              icon="/icons/restart.svg"
              @click="xrSessionManager.sceneManager.active.value.labelPlayer.reset()"
          />

        </div>
      </div>

      <div id="overlayBottom" class="overlayBlur" v-if="overlayBottom">
        <button class="arrowButton"
                id="arrowButtonPrevious"
                :class="{buttonDisabled:!xrSessionManager.sceneManager.hasPrevious.value}"
                @click="xrSessionManager.sceneManager.setPreviousActive()"
                :disabled="!xrSessionManager.sceneManager.hasPrevious.value">
          <div>
            <icon-svg url="/icons/previous.svg" theme="text"/>
            <span>{{$t("projectView.arView.arOverlay.scene.previousButton")}}</span>
          </div>
          <span v-if="xrSessionManager.sceneManager.hasPrevious.value"> {{xrSessionManager.sceneManager.previous.value.title}}</span>
        </button>



        <div id="overlayBottomSelector">
          <h3>{{props.json.unit}}</h3>
          <select v-model="xrSessionManager.sceneManager.activeSceneId.value">
            <option v-for="scene in xrSessionManager.sceneManager.scenes" :value="scene.sceneId">
              {{scene.title}}
            </option>
          </select>
        </div>


        <button class="arrowButton"
                id="arrowButtonNext"
                :class="{buttonDisabled:!xrSessionManager.sceneManager.hasNext.value}"
                @click="xrSessionManager.sceneManager.setNextActive()"
                :disabled="!xrSessionManager.sceneManager.hasNext.value">
          <div>
            <span>{{$t("projectView.arView.arOverlay.scene.nextButton")}}</span>
            <icon-svg url="/icons/next.svg" theme="text"/>
          </div>
          <span v-if="xrSessionManager.sceneManager.hasNext.value"> {{xrSessionManager.sceneManager.next.value.title}}</span>
        </button>
      </div>

    </section>

  </div>

</template>

<style scoped>


h2{
  overflow: hidden;
  white-space: nowrap;
}

#container{
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}

#labelContainer{
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.overlayInvisible{
  display:none;
}

.overlayVisible{
  display: flex;
}

#arOverlay{
  flex-direction: column;
  justify-content: space-between;
  z-index: 100;
}

#overlayTop, #overlayBottom{
  z-index: 999;
}

#arOverlay>div:not(#overlayMiddle){
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
}

#overlayMiddle{
  flex: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  overflow: scroll;
  padding: 16px;
}

#overlayMiddle>*{
  z-index: 256;
}

.overlayBlur{
  background-color: var(--backgroundColor);
  backdrop-filter: blur(64px);
  color: var(--textImportantColor);
  box-shadow: var(--defaultUniformShadow);
}

h2{
  color: var(--textImportantColor);
  font-weight: bold;
}


#arOverlay button{
  padding: 4px;
  border : none;
  background: none;
}


.arrowButton{
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.arrowButton>div{
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.arrowButton>span{
  color: var(--accentColor);
  font-weight: 300;
}
.buttonDisabled{
  opacity: 0.48;
}

#arrowButtonPrevious{
  align-items: flex-start;
}

#arrowButtonNext{
  align-items: flex-end;
}


#overlayBottomSelector{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  position: absolute;
  transform: translate(-50%, -50%);
  left: 50%;
  top: 50%;
}

#overlayBottomSelector>select{
  border-color: var(--textColor);
  padding: 4px;
  border-radius: 4px;
  background: var(--darkerBackgroundColor);
}
#overlayBottomSelector>h3{
  color: var(--textImportantColor);
}

#startButton{
  padding: 16px;
  display: flex;
  justify-content: center;
}
#startButton>span{
  padding: 4px;
}


#playerActions{
  width: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  pointer-events: none;
}

#playerActions>*{
  margin-top: 8px;
  pointer-events: auto;
}


#startButton>span{
  display: flex;
}

#startButton>span>*{
  margin-left: 8px;
}
</style>
