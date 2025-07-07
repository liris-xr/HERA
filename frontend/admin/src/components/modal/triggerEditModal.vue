<script setup>
import Modal from "@/components/modal/modal.vue";
import {computed, nextTick, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import {actions} from "@/js/threeExt/triggerManagement/actionList.js";
import {Trigger} from "@/js/threeExt/triggerManagement/trigger.js";
import {ENDPOINT} from "@/js/endpoints.js";
import ActionItem from "@/components/listItem/actionItem.vue";
import {TriggerAction} from "@/js/threeExt/triggerManagement/triggerAction.js";

const props = defineProps({
  show: {type: Boolean, default: false},
  trigger: {type: Trigger, required: false, default: null},
  triggers: {type: Object, required: true},
  assets: {type: Object, required: true},
  sounds: {type: Object, required: true},
  project: {type: Object, required: true},
  token: {type: String, required: true},
  userData: {type: Object, required: true},
});

const actionIn = ref("none");
const actionOut = ref("none");

const objectIn = ref({id: 0, label:"none"});
const objectOut = ref({id: 0, label:"none"});

const radius = ref(1);

let listActions = ref([]);
let listObject = {};

async function fetchProject(projectId, userId, token) {
  try {
    const res = await fetch(`${ENDPOINT}users/${userId}/project/${projectId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },

        });
    if(res.ok){
      return await res.json();
    }
    throw new Error("ko");
  } catch (e) {
    console.error(e);
  }
}


watch(() =>props.show,async (value) => {
  if (value) {
    await nextTick();

    try {
      let arrayScenesName = await initArrayScene();

      let arrayAssetsName = initArrayAssets();

      let arrayAssetsAnimation = initArrayAssetsAnimation();

      let arraySoundsName = initArraySound();

      let arrayTrigger = initArrayTrigger();

      listObject ={
        'none' : [],
        'displayAsset' : arrayAssetsName,
        'playSound' : arraySoundsName,
        'changeScene' : arrayScenesName,
        'animation' : arrayAssetsAnimation,
        'startDialogue' : [],
        'displayTrigger' : arrayTrigger,
      };


      if(props.trigger) {
        actionIn.value = actions[props.trigger.actionIn] || null;
        actionOut.value = actions[props.trigger.actionOut] || null;
        radius.value = props.trigger.radius ?? 1;

        objectIn.value = getObjectFromList(props.trigger.actionIn, props.trigger.objectIn);
        objectOut.value = getObjectFromList(props.trigger.actionOut, props.trigger.objectOut);

        listActions.value = [];
        await nextTick();

        listActions.value = props.trigger.getChainedActions().slice();

      }
    }
    catch (e) {
      console.error(e);
    }
  }
})

const getEditedTrigger = computed(()=>{
  if (radius.value === "") {
    radius.value = 1;
  }

  actionIn.value = getActionKeyByLabel(actionIn.value);
  actionOut.value = getActionKeyByLabel(actionOut.value);

  if (actionIn === "none"){
    objectIn.value = {id:"0", label:"none"};
  }

  if (actionOut === "none"){
    objectOut.value = {id:"0", label:"none"};
  }

  return {actionIn : actionIn.value,
          actionOut : actionOut.value,
          radius : radius.value,
          objectIn : objectIn.value,
          objectOut : objectOut.value,
          chainedActions : listActions.value,
  };
})

function getActionKeyByLabel(label) {
  if (label === undefined || label === null || label === "none") {
    return "none";
  }

  return Object.keys(actions).find(key => actions[key] === label);
}

const getObjectFromList = (actionKey, object) => {
  const list = listObject[actionKey];
  const label = object?.label;

  if (Array.isArray(list)) {
    return list.find(o => o.label === label) || { id: 0, label: "none" };
  }

  return { id: 0, label: "none" };
};

function addAction(){
  listActions.value.push(new TriggerAction({action: "none", object: "none", timestampStart: 0}));
}

function removeAction(action){
  listActions.value.splice(listActions.value.indexOf(action),1);
}

function getListObject() {
  return listObject
}

/*
*
* Initializes arrays containing the various objects
* that can be triggered when the user enters a trigger zone.
*
* Each array element must be an object with a `label` attribute
* (used for displaying to the user) and an `id` attribute
* (used internally to uniquely identify the object).
*
* */

async function initArrayScene() {
  let scenes;

  await fetchProject(props.project.id, props.userData.id, props.token).then(rep => {
    scenes = rep.scenes.map(scene => ({
      id: scene.id,
      label: scene.title
    }));
  });
  return scenes;
}

function initArrayAssets(){
  return props.assets.map(asset => ({
    id: asset.id,
    label: asset.name
  }));
}

function initArrayAssetsAnimation() {
  const array = [];
  props.assets.forEach((asset) => {
    asset.animations.forEach((animation) => {
      array.push({
        id: asset.id,
        label: `${asset.name} : ${animation.name}`,
        animation: animation.name
      });
    });
  });

  return array;
}

function initArraySound(){
  return props.sounds.map(sound => ({
    id: sound.id,
    label: sound.name,
    url: sound.url,
    volumeLevel: sound.volumeLevel,
  }))
}

function  initArrayTrigger(){
  return props.triggers.map(trigger => ({
    id: trigger.id,
    label: "trigger",
  }))
}
</script>

<template>
  <modal :show="show" @close="$emit('close')">
    <template #header>
      <h3>{{$t("triggerEditModal.title")}}</h3>

    </template>

    <template #body>
      <div class="inlineFlex advancedEditBody">
        <section id="advancedEditSettingsArea">

          <div class="inlineFlex">
            <button-view :text="$t('sceneView.leftSection.sceneTriggers.addTriggerButton')" icon="/icons/add.svg" @click="addAction()"></button-view>
          </div>

          <div class="action-items-container">
            <action-item v-for="(action, index) in listActions"
                         :index="index"
                         :triggerAction="action"
                         :listObject="getListObject()"
                         :show="props.show"
                         @delete="removeAction(action)"
            />
          </div>

          <div class="multilineField" id="advancedEditTimestampArea">
            <span class="inlineFlex">
              <h4>{{$t("triggerEditModal.actionOut")}}</h4>
            </span>

            <select v-model="actionOut" @change="objectOut= 'none'">
              <option v-for="(key, name) in actions" :key="name" :value="key">
                {{key}}
              </option>
            </select>

            <div>
              <div>
                <select v-model="objectOut"
                        v-if="getActionKeyByLabel(actionOut) !== 'none'
                      && Array.isArray(listObject[getActionKeyByLabel(actionOut)])
                      && listObject[getActionKeyByLabel(actionOut)].length > 0">
                  <option v-for="obj in listObject[getActionKeyByLabel(actionOut)]" :key="obj" :value="obj">
                    {{ obj.label }}
                  </option>
                </select>
              </div>
            </div>

          </div>



          <div id="advancedEditTimestampArea">
            <span class="inlineFlex">
              <h4>{{$t("triggerEditModal.radius")}}</h4>
              <input type="number" id="AdvancedEditTimestampStart" :placeholder="1" v-model="radius" min="0">
            </span>
          </div>

        </section>
      </div>
    </template>

    <template #footer>
      <div class="inlineFlex flexRight">
        <button-view :text="$t('labelEditModal.buttons.cancel')" @click="$emit('close')"></button-view>
        <filled-button-view :text="$t('labelEditModal.buttons.confirm')" @click="$emit('confirm', getEditedTrigger)"></filled-button-view>
      </div>
    </template>
  </modal>
</template>

<style scoped>
.inlineFlex{
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 8px;
}

.flexRight{
  justify-content: flex-end;
}

.flexRight button{
  margin-left: 8px;
}

label{
  margin-right: 16px;
  font-weight: 500;
  width: fit-content;
}

input, select{
  width: auto;
  flex-grow: 1;

  color: var(--textImportantColor);
  border: solid 1px var(--darkerBackgroundColor);
  background: none;
  padding: 4px;
  border-radius: 4px;
  font-size: 16px;
  user-select: all;
}

input:focus{
  background-color: var(--darkerBackgroundColor);
  outline-color: var(--accentColor);

}

select{
  width: 100%;
}

.multilineField{
  margin-bottom: 16px;
}


h4{
  color: var(--textImportantColor);
  font-weight: 500;
  margin-right: 8px;
}

h4, label{
  display: inline-flex;
}

label{
  margin-right: 16px;
  font-weight: 500;
  width: fit-content;
}

textarea{
  width: 100%;
  resize: both;
  color: var(--textImportantColor);
  text-align: left;
  border: solid 1px var(--darkerBackgroundColor);
  border-radius: 4px;
  overflow-x: hidden;
  display: block;
}

.action-items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
