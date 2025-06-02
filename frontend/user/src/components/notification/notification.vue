<script setup>
import {ref} from "vue";
import IconSvg from "@/components/icons/IconSvg.vue";

const props = defineProps({
  icon:{type: String, default: ""},
  visible: {type: Boolean, default: true},
  theme: {type: String, default: "default"},
})

const hasIcon = ref(props.icon.trim().length > 0);

</script>

<template>
  <div :class="[{hidden: !props.visible, },props.theme]" @click="$event.stopPropagation()">
    <slot name="content">default content</slot>
    <icon-svg class="logo" :url="props.icon" :theme="props.theme"></icon-svg>
  </div>
</template>


<style scoped>

.default{
  background-color: var(--backgroundColor);
  color: var(--textColor);
}
.danger{
  background-color: #FCEBEB;
  color: var(--dangerColor);
}
.warning{
  background-color: #FEF6D5;
  color: var(--warningColor);
}

.logo{
  margin-left: 16px;
}

div {
  backdrop-filter: blur(64px);
  box-shadow: var(--defaultUniformShadow);
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 16px;

  transition: .4s;
  transform-origin: top center;
  opacity: 1;
  pointer-events: visible;
}

:slotted(div, p){
  color: inherit;
}

p{
  color: inherit;
}

@keyframes hideAnimation{
  0%{
    transform: none;
    opacity: 1;
  }
  99%{
    transform: scale(0,0);
    opacity: 0;
  }
  100%{
    transform: scale(0,0);
    pointer-events: none;
    opacity: 0;
    height: 0;
    margin:0;
    padding:0;
  }
}


.hidden{
  animation: hideAnimation .4s;
  animation-fill-mode: forwards;
}


</style>
