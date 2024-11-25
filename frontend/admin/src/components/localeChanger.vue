<script setup>
import i18n, {stringLocales} from "@/i18n.js";
import IconSvg from "@/components/icons/IconSvg.vue";
import {watch} from "vue";

watch(i18n.global.locale, (locale) => {
  localStorage.setItem("locale", locale);
})

</script>

<template>
  <div class="locale-changer">
    <label for="localeSelect">
      <icon-svg url="/icons/globe.svg"></icon-svg>
    </label>
    <select v-model="$i18n.locale" id="localeSelect">
      <option v-for="(lang) in stringLocales" :key="lang.string" :value="lang.value">
        {{ lang.string }}
      </option>
    </select>
  </div>
</template>

<style scoped>

.locale-changer{
  display: flex;
  flex-direction: row;
  margin-right: 32px;
}

select{
  margin-left: 4px;
  background: none;
  border: none;
  color: var(--textImportantColor);
}
</style>