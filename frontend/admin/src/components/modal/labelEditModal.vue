<script setup>

import Modal from "@/components/modal/modal.vue";
import {computed, getCurrentInstance, nextTick, ref, watch} from "vue";
import ButtonView from "@/components/button/buttonView.vue";
import FilledButtonView from "@/components/button/filledButtonView.vue";
import {Label} from "@/js/threeExt/postprocessing/label.js";
import IconSvg from "@/components/icons/IconSvg.vue";
const props = defineProps({
  show: {type: Boolean, default: false},
  label: {type: Label, required: true},
})

const text = ref("");
const timestampStart = ref(null);
const timestampEnd = ref(null);


watch(() =>props.show,async (value) => {
  if (value) {
    await nextTick();
    text.value = props.label.content.value;

    timestampStart.value = props.label.timestampStart;
    timestampEnd.value = props.label.timestampEnd;
  }
})


function clampValue(value){
  if(value === "" || value === undefined || isNaN(value) || isNaN(Math.round(value))) return null;
  let rounded = Math.round(value);
  if(rounded < 0) return 0;
  return value
}



const getEditedLabel = computed(()=>{
  const data = {
    text: text.value,
    timestampStart: clampValue(timestampStart.value),
    timestampEnd: clampValue(timestampEnd.value),
  }
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


            <textarea v-model="text" rows="8" :placeholder="$t('labelEditModal.content.placeholder')"></textarea>
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
                <input type="number" id="AdvancedEditTimestampStart" :placeholder="$t('labelEditModal.animation.in.placeholder')" v-model="timestampStart" min="0">
              </div>

            <div class="inlineFlex">
              <label for="AdvancedEditTimestampEnd">{{$t("labelEditModal.animation.out.label")}}</label>
              <input type="number" id="AdvancedEditTimestampEnd" :placeholder="$t('labelEditModal.animation.out.placeholder')" v-model="timestampEnd" min="0">
            </div>

          </div>


        </section>

      </div>



    </template>

    <template #footer>
      <div class="inlineFlex flexRight">
        <button-view :text="$t('labelEditModal.buttons.cancel')" @click="$emit('close')"></button-view>
        <filled-button-view :text="$t('labelEditModal.buttons.confirm')" @click="$emit('confirm', getEditedLabel)"></filled-button-view>
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
