<script setup>
import {onMounted, reactive, ref} from "vue";
import {ArSessionManager} from "@/js/threeExt/project/arSessionManager.js";
import ButtonView from "@/components/utils/buttonView.vue";
import ExpandableArNotification from "@/components/notification/expandableArNotification.vue";
import ArNotification from "@/components/notification/arNotification.vue";
import HotDogMenu from "@/components/utils/hotDogMenu.vue";
import ToggleableContextMenuItem from "@/components/utils/ToggleableContextMenuItem.vue";
import IconContextMenuItem from "@/components/utils/IconContextMenuItem.vue";
import ActionBubble from "@/components/utils/actionBubble.vue";
import IconSvg from "@/components/icons/IconSvg.vue";


const props = defineProps({
  json: {type: Object, required: true}
})

const emit = defineEmits(["loaded"])

const arSessionManager = new ArSessionManager(props.json);
const overlayBottom = ref(true)

defineExpose({
  arSessionManager: reactive(arSessionManager), // on expose une version reactive pour uniformiser l'acces aux champs
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

const arCompatible = ref(false);
arCompatible.value = await arSessionManager.isArCompatible();
const loaded = ref(false);


onMounted(async () => {
  await arSessionManager.init(container.value, arOverlay.value);
  loaded.value = true;
  emit("loaded")
})


function toggleContextMenuStatus(){
  contextMenu.value.toggleStatus()
}

</script>

<template>
  <div id="startButton">
    <button-view icon="/icons/ar.svg" :text="$t('projectView.arView.startAr.button')" @click="arSessionManager.start()" :disabled="!loaded || !arCompatible" :class="{buttonDisabled:!loaded || !arCompatible }" v-if="loaded"></button-view>
    <span v-if="!loaded">
      {{$t("projectView.arView.startAr.loading")}}
      <icon-svg url="/icons/spinner.svg"></icon-svg>
    </span>
    <span v-if="loaded && !arCompatible">{{$t("projectView.arView.startAr.incompatibleDevice")}}</span>

  </div>


  <div>

    <div ref="container" id="container"></div>

    <section ref="arOverlay" id="arOverlay" :class="{overlayInvisible:!arSessionManager.isArRunning.value, overlayVisible: arSessionManager.isArRunning.value}">
      <div ref="labelContainer" id="labelContainer"></div>
      <div id="overlayTop" class="overlayBlur">
        <button @click="arSessionManager.stop()">
          <icon-svg url="/icons/close.svg" theme="text"/>
        </button>
        <h2>{{props.json.title}}</h2>

        <hot-dog-menu ref="contextMenu">
          <IconContextMenuItem icon="/icons/restart.svg"
                               :text="$t('projectView.arView.arOverlay.contextMenu.reset')"
                               @click="()=>{
                                  toggleContextMenuStatus();
                                  arSessionManager.reset()
                               }"/>
          <toggleable-context-menu-item :text="$t('projectView.arView.arOverlay.contextMenu.showLabels')"
                                        :checked="arSessionManager.labelRenderer.isEnabled.value"
                                        @click="()=>{
                                          toggleContextMenuStatus();
                                          arSessionManager.labelRenderer.toggleStatus()
                                        }"/>
        </hot-dog-menu>
      </div>

      
      <div id="overlayMiddle" @click="arSessionManager.sceneManager.onSceneClick($event)">
        <ar-notification icon="/icons/info.svg" :visible="!arSessionManager.sceneManager.scenePlacementManager.isStabilized.value">
        <template #content><p>{{$t("projectView.arView.arOverlay.slowMoveMessage")}}</p></template>
        </ar-notification>

        <ar-notification icon="/icons/3d.svg" :visible="arSessionManager.sceneManager.scenePlacementManager.isStabilized.value && arSessionManager.sceneManager.scenePlacementManager.isEnabled.value">
          <template #content><p>{{props.json.calibrationMessage}}</p></template>
        </ar-notification>

        <expandable-ar-notification v-if="arSessionManager.sceneManager.active.value.hasDescription()" :title="$t('projectView.arView.arOverlay.scene.descriptionTitle')" :text="arSessionManager.sceneManager.active.value.description"></expandable-ar-notification>
        <expandable-ar-notification v-for="error in arSessionManager.sceneManager.active.value.getErrors.value" :title="error.title" :text="error.message"></expandable-ar-notification>


        <div id="playerActions" v-if="arSessionManager.sceneManager.active.value.hasAnimation.value">
          <action-bubble
              :icon="arSessionManager.sceneManager.active.value.labelPlayer.isPlaying.value ? '/icons/pause.svg' : '/icons/play.svg'"
              @click="arSessionManager.sceneManager.active.value.labelPlayer.togglePlaying()"
          />

          <action-bubble
              icon="/icons/restart.svg"
              @click="arSessionManager.sceneManager.resetScene()"
          />

        </div>
      </div>

      <div id="overlayBottom" class="overlayBlur" v-if="overlayBottom">
        <button class="arrowButton"
                id="arrowButtonPrevious"
                :class="{buttonDisabled:!arSessionManager.sceneManager.hasPrevious.value}"
                @click="arSessionManager.sceneManager.setPreviousActive()"
                :disabled="!arSessionManager.sceneManager.hasPrevious.value">
          <div>
            <icon-svg url="/icons/previous.svg" theme="text"/>
            <span>{{$t("projectView.arView.arOverlay.scene.previousButton")}}</span>
          </div>
          <span v-if="arSessionManager.sceneManager.hasPrevious.value"> {{arSessionManager.sceneManager.previous.value.title}}</span>
        </button>



        <div id="overlayBottomSelector">
          <h3>{{props.json.unit}}</h3>
          <select v-model="arSessionManager.sceneManager.activeSceneId.value">
            <option v-for="scene in arSessionManager.sceneManager.scenes" :value="scene.sceneId">
              {{scene.title}}
            </option>
          </select>
        </div>


        <button class="arrowButton"
                id="arrowButtonNext"
                :class="{buttonDisabled:!arSessionManager.sceneManager.hasNext.value}"
                @click="arSessionManager.sceneManager.setNextActive()"
                :disabled="!arSessionManager.sceneManager.hasNext.value">
          <div>
            <span>{{$t("projectView.arView.arOverlay.scene.nextButton")}}</span>
            <icon-svg url="/icons/next.svg" theme="text"/>
          </div>
          <span v-if="arSessionManager.sceneManager.hasNext.value"> {{arSessionManager.sceneManager.next.value.title}}</span>
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
