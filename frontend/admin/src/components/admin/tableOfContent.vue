<script setup>

import {onMounted, ref} from "vue";

const props = defineProps({
  sections: { type: Object, required: true }
})

const activeSection = ref(null)

function scrollTo(section) {

  const el = props.sections[section].element
  window.scrollTo({top: el.offsetTop - 65, behavior: "smooth"})

}

function handleScroll() {
  for(const fieldName of Object.keys(props.sections)) {
    const section = props.sections[fieldName];
    const el = section.element

    const top = el.offsetTop
    const height = el.offsetHeight

    if(window.scrollY + 125 >= top && window.scrollY + 125 <= top + height) {
      activeSection.value = el.getAttribute("section")
    }

  }
}

onMounted(() => {
  for (const section of Object.keys(props.sections)) {
    props.sections[section].element.setAttribute("section", section)
  }

  window.addEventListener("scroll", handleScroll)
  handleScroll()

})

</script>

<template>
  <aside>
    <ul>
      <li
          v-for="section in Object.keys(sections)"
          v-bind:class="{ active: activeSection === section }"

          @click="scrollTo(section)" >
       {{$t(`admin.sections.${section}.h1`)}}
      </li>
    </ul>
  </aside>
</template>

<style scoped>

aside {
  top: 56px;
  right: 0;
  margin: 25px;
  position: fixed;
  width: 20%;
  box-sizing: border-box;

  text-align: center;
}

aside ul {
  list-style-type: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

aside ul li {
  cursor: pointer;
}

aside ul li:hover {
  font-weight: bold;
}

.active {
  color: darkorange;
}

</style>