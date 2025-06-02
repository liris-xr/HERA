<script setup>
import IconSvg from "@/components/icons/IconSvg.vue";

const props = defineProps({
  text: {type: String, required: false},
  theme: {type: String, default: "default"},
  icon:{type: String, default: ""},
  disabled: {type: Boolean, default: false},
})

const hasIcon = props.icon.trim().length > 0;

const themeKeyword = "Button";
let textTheme = props.theme

</script>

<template>
    <button :class="{[`${textTheme}${themeKeyword}`]: true, 'disabled':disabled}" type="button" :disabled="disabled">
    <span v-if="props.text" :class="textTheme+themeKeyword">{{text}}</span>
    <IconSvg v-if="hasIcon" :url="icon" :theme="textTheme"></IconSvg>
  </button>
</template>

<style scoped>

.disabled{
  opacity: 0.64;
  outline: none !important;
  cursor: default;
}

.backgroundButton{
  color: var(--backgroundColor);
  border-color: var(--backgroundColor);
}
.textButton{
  color: var(--textColor);
  border-color: var(--textColor);
}

.textImportantButton{
  color: var(--textImportantColor);
  border-color: var(--textImportantColor);
}

.defaultButton{
  color: var(--accentColor);
  border-color: var(--accentColor);
}
.dangerButton{
  color: var(--dangerColor);
  border-color: var(--dangerColor);
}
.warningButton{
  color: var(--warningColor);
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
  background-color: var(--backgroundColor);
  transition: ease-out .1s;
}

button>span:has(+div){
  margin-right: 4px;
  font-weight: 450;
}

button:hover{
  outline: solid 2px var(--textImportantColor);
  outline-offset: 2px;
}

</style>
