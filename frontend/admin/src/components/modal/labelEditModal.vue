<script setup>

import Modal from "@/components/modal/modal.vue";
import {computed, nextTick, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import {Label} from "@/js/threeExt/postprocessing/label.js";
import IconSvg from "@/components/icons/IconSvg.vue";
import Editor from "primevue/editor"
import NotificationComponent from '@/components/notification/notification.vue'

const props = defineProps({
  show: {type: Boolean, default: false},
  label: {type: Label},
})

const text = ref("");
const timestampStart = ref(null);
const timestampEnd = ref(null);

const showNotification = ref(false);
const textNotification = ref("");

watch(() =>props.show,async (value) => {
  if (value) {
    await nextTick();
    text.value = props.label.content.value;
    timestampStart.value = props.label.timestampStart;
    timestampEnd.value = props.label.timestampEnd;
  }
})


function clampValue(value){
  if(value === undefined || isNaN(value) || isNaN(Math.round(value))) return undefined;
  if(value === "" ||  value === null) return null;

  return Math.round(Number(value))
}

function editedLabelValidation($emit){
  let startTimer = clampValue(timestampStart.value)
  const endTimer = clampValue(timestampEnd.value)

  if(!validateTimestamps(startTimer,endTimer))
    return

  if(startTimer === null && endTimer !== null) {
    timestampStart.value = 0
    startTimer = clampValue(timestampStart.value)
  }

  if(endTimer === null){
    $emit('confirm', getEditedLabel.value)
  } else if(startTimer < endTimer){
    $emit('confirm', getEditedLabel.value)
  }
}

function validateTimestamps (startTimer,endTimer){
  let isTimeStampValid = true;

  console.log("startTimer : ", startTimer, " endTimer : ",endTimer);
  if(startTimer === undefined || endTimer === undefined){
    displayNotification("Please, enter a number")
    isTimeStampValid = false
  } else if (endTimer < 0 || startTimer < 0){
    displayNotification("A number cannot be less than 0")
    isTimeStampValid = false
  } else if (endTimer != null && endTimer < startTimer){
    displayNotification("Exit number must be greater than Entry number")
    isTimeStampValid = false
  }

  return isTimeStampValid
}

function displayNotification(textToDisplay) {
  showNotification.value = true;
  textNotification.value = textToDisplay;

  setTimeout(() => {
    showNotification.value = false;
  }, 5000);
}

const getEditedLabel = computed(()=>{
    const data = {
      text: text.value,
      timestampStart: clampValue(timestampStart.value),
      timestampEnd: clampValue(timestampEnd.value),
    }

    console.log("getEditedLabel - data content : ", data);
    return new Label(data)
})
</script>

<template>
  <modal :show="show" @close="$emit('close')">
    <template #header>
      <h3>{{$t("labelEditModal.title")}}</h3>
    </template>

    <template #body>
      <div class="inlineFlex advancedEditBody">
        <section id="advancedEditSettingsArea">
          <div class="multilineField">
            <span class="inlineFlex">
              <h4>{{$t("labelEditModal.content.label")}}</h4>
              <icon-svg url="/icons/text.svg" theme="textImportant"></icon-svg>
            </span>

            <Editor class="editor" v-model="text" />
            <!-- <textarea v-model="text" rows="8" :placeholder="$t('labelEditModal.content.placeholder')"></textarea> -->
          </div>


          <div id="advancedEditTimestampArea">
            <span class="inlineFlex">
              <h4>{{$t("labelEditModal.animation.title")}}</h4>
              <icon-svg url="/icons/animation.svg" theme="textImportant"></icon-svg>
            </span>
          </div>

          <div>
              <div class="inlineFlex">
                <label for="AdvancedEditTimestampStart">{{$t("labelEditModal.animation.in.label")}}</label>
                <input type="text" id="AdvancedEditTimestampStart" :placeholder="$t('labelEditModal.animation.in.placeholder')" v-model="timestampStart" min="0">
              </div>

            <div class="inlineFlex">
              <label for="AdvancedEditTimestampEnd">{{$t("labelEditModal.animation.out.label")}}</label>
              <input type="text" id="AdvancedEditTimestampEnd" :placeholder="$t('labelEditModal.animation.out.placeholder')" v-model="timestampEnd" min="timestampStart">
            </div>

          </div>


        </section>

      </div>



    </template>

    <template #footer>
      <div class="inlineFlex flexRight">
        <button-view :text="$t('labelEditModal.buttons.cancel')" @click="$emit('close') ; showNotification=false"></button-view>
        <filled-button-view :text="$t('labelEditModal.buttons.confirm')" @click="editedLabelValidation($emit)"></filled-button-view>
      </div>
      <NotificationComponent :visible="showNotification">
        <template #content>
          <p class="notificationText">{{ textNotification }}</p>
        </template>
      </NotificationComponent>
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

.editor {
  --p-editor-toolbar-border-color: var(--darkerBackgroundColor);
  --p-editor-toolbar-item-color: var(--textColor);
  --p-editor-toolbar-item-hover-color: var(--textImportantColor);
  --p-editor-toolbar-item-active-color: var(--textImportantColor);
  --p-editor-content-border-color: var(--darkerBackgroundColor);

  --p-editor-overlay-background: var(--backgroundColor);
  --p-editor-overlay-option-focus-background: var(--darkerBackgroundColor);


}

.notificationText{
  text-align: center;
}
</style>
