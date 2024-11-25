<script setup>
import {ref} from "vue";
import ButtonView from "@/components/button/buttonView.vue";

const props = defineProps({
  title: {type: String, required: true},
  text: {type: String, required: true},
  visible: {type: Boolean, default: true},
})


const transition = "0.4s";
const collapsed = ref(true);
const userHidden = ref(false);

function handleClick(event, fromArrow = false){
  if(fromArrow || (!fromArrow && collapsed.value))
    collapsed.value = !collapsed.value;

  event.stopPropagation()
}

</script>

<template>
  <div class="notification" :class="{hidden: userHidden || !props.visible, test: collapsed}" @click="handleClick($event)">

    <div id="content">
      <h3>{{props.title}}</h3>
      <div class="expandable" :class="{collapsedText: collapsed}">
        <p>
          {{props.text}}
        </p>
        <button-view text="Masquer" @click="userHidden = true"></button-view>
      </div>

    </div>
    <img src="/icons/up.svg" alt="icon" @click="handleClick($event,true)" :class="{collapsedArrow: collapsed}" />
  </div>
</template>

<style scoped>



.notification {
  background-color: var(--backgroundColor);
  backdrop-filter: blur(64px);
  color: var(--textImportantColor);
  box-shadow: var(--defaultUniformShadow);
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  margin-bottom: 16px;

  transition: v-bind(transition);
  transform-origin: top center;
  opacity: 1;
  pointer-events: visible;
}


img{
  margin-left: 16px;
  transition: v-bind(transition);
}
#content{
  word-break: break-word;
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

h3{
  color: var(--textImportantColor);
  font-weight: 500;
}

.expandable{
  overflow: auto;
  transition: v-bind(transition);
  height: auto;
}

.collapsedText{
  overflow: hidden;
  height: 0;
}

.collapsedArrow{
  transform: rotate(180deg);
}

p{
  margin-bottom: 8px;
}

</style>
