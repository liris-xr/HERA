<script setup>

import Modal from "@/components/modal/modal.vue";
import {computed, getCurrentInstance, nextTick, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import IconSvg from "@/components/icons/IconSvg.vue";
import {actions} from "@/js/threeExt/triggerManagement/actionList.js";
import {Trigger} from "@/js/threeExt/triggerManagement/trigger.js";
import i18n from "@/i18n.js";

const props = defineProps({
  show: {type: Boolean, default: false},
  trigger: {type: Trigger, required: true},
  assets: {type: Object, required: true},

})

const actionIn = ref(null);
const actionOut = ref(null);
const radius = ref(null);

const objectIn = ref("none");
const objectOut = ref("none");

let listObject = {};

watch(() =>props.show,async (value) => {
  if (value) {
    await nextTick();


    let arrayAssetsName = []
    props.assets.forEach((asset) => {
      arrayAssetsName.push(asset.name);
    })

    let arrayAssetsAnimation = []
    props.assets.forEach((asset) => {
      asset.animations.forEach((animation) => {
        arrayAssetsAnimation.push(asset.name + " " + asset.animation);
      })

    })

    listObject ={
      'none' : {},
      'displayAsset' : arrayAssetsName,
      'playSound' : {},
      'changeScene' : {},
      'animation' : {arrayAssetsName},
      'startDialogue' : {},
    };

    actionIn.value = actions[props.trigger.actionIn];
    actionOut.value = actions[props.trigger.actionOut]
    radius.value = props.trigger.radius;
  }
})

const getEditedTrigger = computed(()=>{
  if (radius.value === "") {
    radius.value = 1;
  }

  return {actionIn : getActionKeyByLabel(actionIn.value),
          actionOut : getActionKeyByLabel(actionOut.value),
          radius : radius.value,
          objectIn : objectIn.value,
          objectOut : objectOut.value,
  };
})

function getActionKeyByLabel(label) {
  if (label === undefined || label === null || label === "none") {
    return "none";
  }

  return Object.keys(actions).find(key => actions[key] === label);
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
          <div class="multilineField">
            <span class="inlineFlex">
              <h4>{{$t("triggerEditModal.actionIn")}}</h4>
              <icon-svg url="/icons/in.svg" theme="textImportant"></icon-svg>
            </span>

            <select v-model="actionIn"  @change="objectIn= 'none'">
              <option v-for="(key, name) in actions" :key="name" :value="key">
                {{key}}
              </option>
            </select>

            <div>
              <select v-model="objectIn" v-if="getActionKeyByLabel(actionIn) !== 'none'
              && Array.isArray(listObject[getActionKeyByLabel(actionIn)])
              && listObject[getActionKeyByLabel(actionIn)].length > 0">
                <option v-for="(name) in listObject[getActionKeyByLabel(actionIn)]" :key="name" :value="name">
                  {{name}}
                </option>
              </select>
            </div>

          </div>



          <div class="multilineField" id="advancedEditTimestampArea">
            <span class="inlineFlex">
              <h4>{{$t("triggerEditModal.actionOut")}}</h4>
              <icon-svg url="/icons/out.svg" theme="textImportant"></icon-svg>
            </span>

            <select v-model="actionOut" @change="objectOut= 'none'">
              <option v-for="(key, name) in actions" :key="name" :value="key">
                {{key}}
              </option>
            </select>

            <div>
              <select v-model="objectOut" v-if="getActionKeyByLabel(actionOut) !== 'none'
                && Array.isArray(listObject[getActionKeyByLabel(actionOut)])
                && listObject[getActionKeyByLabel(actionOut)].length > 0
                ">
                <option v-for="(name) in listObject[getActionKeyByLabel(actionOut)]" :key="name" :value="name">
                  {{name}}
                </option>
              </select>
            </div>

          </div>



          <div id="advancedEditTimestampArea">
            <span class="inlineFlex">
              <h4>{{$t("triggerEditModal.radius")}}</h4>
              <icon-svg url="/icons/animation.svg" theme="textImportant"></icon-svg>
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

input{
  width: auto;
  flex-grow: 1;

  color: var(--textImportantColor);
  border: solid 1px var(--darkerBackgroundColor);
  background: none;
  padding: 4px;
  border-radius: 4px;
  font-size: 16px;
  field-sizing: content;
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
  field-sizing: content;
  display: block;
}

#advancedEditSettingsArea{
  flex-grow: 1;
}
</style>
