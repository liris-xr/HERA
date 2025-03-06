<script setup>
import { Color } from 'three';


const props = defineProps({
  color:{type:Color,required:false},
  metallicness:{type:Number,required:false},
  roughness:{type:Number,required:false}
})

</script>

<template>
  <div>
    <label for="Color"> {{ $t("sceneView.materialSection.color") }} </label>
    <input type="number" autocomplete="false" id="Color" name="Color" v-model="editor.scene.currentSelectedValues.value.x" step="any">
    <label for="Metallicness"> {{ $t("sceneView.materialSection.metallicness") }} </label>
    <input type="number" autocomplete="false" id="Metallicness" name="Metallicness" v-model="editor.scene.currentSelectedValues.value.y" step="any">
    <label for="Roughness"> {{ $t("sceneView.materialSection.roughness") }} </label>
    <input type="number" autocomplete="false" id="Roughness" name="Roughness" v-model="editor.scene.currentSelectedValues.value.z" step="any">

  </div>
</template>

<style scoped>

div{
  margin-right: 8px;
  padding: 8px;
  border: solid 1px var(--darkerBackgroundColor);
  border-radius: 8px;
}
</style>
