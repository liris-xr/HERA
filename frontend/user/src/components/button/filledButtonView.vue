<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";

const props = defineProps({
  text: {type: String, required: true},
  theme: {type: String, default: "default"},
  icon:{type: String, default: ""},
  disabled: {type: Boolean, default: false},
})

const hasIcon = props.icon.trim().length > 0;

const themeKeyword = "Button";
let buttonTheme = props.theme
</script>

<template>
  <button :class="{[`${buttonTheme}${themeKeyword}`]: true, 'disabled':disabled}" type="button" :disabled="disabled">
    <span>{{text}}</span>
    <IconSvg v-if="hasIcon" :url="icon" theme="background"></IconSvg>
  </button>
</template>

<style scoped>


.disabled{
  opacity: 0.64;
  outline: none !important;
  cursor: default;
}


.backgroundButton{
  background-color: var(--backgroundColor);
  border-color: var(--backgroundColor);
}
.textButton{
  background-color: var(--textColor);
  border-color: var(--textColor);
}

.textImportantButton{
  background-color: var(--textImportantColor);
  border-color: var(--textImportantColor);
}

.defaultButton{
  background-color: var(--accentColor);
  border-color: var(--accentColor);
}
.dangerButton{
  background-color: var(--dangerColor);
  border-color: var(--dangerColor);
}
.warningButton{
  background-color: var(--warningColor);
  border-color: var(--warningColor);
}

button{
  display: flex;
  flex-direction: row;
  align-items: center;
  border-radius: 4px;
  border-width: 2px;
  border-style: solid;
  cursor: pointer;
  transition: ease-out .1s;
}

button>span{
  margin-right: 4px;
  color: var(--backgroundColor);
  font-weight: 450;
}

button:hover{
  outline: solid 2px var(--textImportantColor);
  outline-offset: 2px;
}

</style>
