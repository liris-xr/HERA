<script setup>

const props = defineProps({
  materialData:{type:Object,required:true},
})

</script>

<template>
  <div>
    <span>
      <label for="Metalness"> {{ $t("sceneView.materialSection.metalness") }} </label>
      <br/>
      <input type="number" autocomplete="false" id="Metalness" name="Metalness" v-model="materialData.metalness" step="any">
    </span>
    <span>
      <label for="Roughness"> {{ $t("sceneView.materialSection.roughness") }} </label>
      <br/>
      <input type="number" autocomplete="false" id="Roughness" name="Roughness" v-model="materialData.roughness" step="any">
    </span>
    <span>
      <label for="opacity"> {{ $t("sceneView.materialSection.opacity") }} </label>
      <br/>
      <input type="number" autocomplete="false" id="Opacity" name="Opacity" v-model="materialData.opacity" step="any">
    </span>
    <span>
      <label for="Color"> {{ $t("sceneView.materialSection.color") }} </label>
      <br/>
      <input type="number" autocomplete="false" id="Red" name="Red" v-model="materialData.color.r" step="any">
      <input type="number" autocomplete="false" id="Green" name="Green" v-model="materialData.color.g" step="any">
      <input type="number" autocomplete="false" id="Blue" name="Blue" v-model="materialData.color.b" step="any">
      
    </span>
    <span>
      <label for="Emissive"> {{ $t("sceneView.materialSection.emissive") }} </label>
      <br/>
      <input type="number" autocomplete="false" id="EmissiveRed" name="EmissiveRed" v-model="materialData.emissive.r" step="any">
      <input type="number" autocomplete="false" id="EmissiveGreen" name="EmissiveGreen" v-model="materialData.emissive.g" step="any">
      <input type="number" autocomplete="false" id="EmissiveBlue" name="EmissiveBlue" v-model="materialData.emissive.b" step="any">
    </span>
    <span>
      <label for="Roughness"> {{ $t("sceneView.materialSection.emissiveIntensity") }} </label>
      <br/>
      <input type="number" autocomplete="false" id="EmissiveIntensity" name="EmissiveIntensity" v-model="materialData.emissiveIntensity" step="any">
    </span>


  </div>
</template>

<style scoped>

div{
  margin-right: 8px;
  padding: 8px;
  border: solid 1px var(--darkerBackgroundColor);
  border-radius: 8px;
}

span{
  display:block;
}
</style>
