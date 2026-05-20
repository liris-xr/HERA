<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";

const props = defineProps({
  sections: { type: Object, required: true }
})

const activeSection = ref(null)
const HEADER_OFFSET = 80

function getSectionElement(sectionKey) {
  const sectionKeys = Object.keys(props.sections)
  const sectionIndex = sectionKeys.indexOf(sectionKey)
  const sectionByOrder = document.querySelectorAll("main > section")?.[sectionIndex] ?? null
  if (sectionByOrder)
    return sectionByOrder

  const section = props.sections?.[sectionKey]
  const component = section?.value ?? section
  const element = component?.element ?? component?.$el ?? null

  return element?.value ?? element
}

function handleScroll() {
  let nextSection = null
  let currentSection = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const fieldName of Object.keys(props.sections)) {
    const el = getSectionElement(fieldName)
    if (!el) continue

    const { top, bottom } = el.getBoundingClientRect()
    const distance = Math.abs(top - HEADER_OFFSET)

    if (distance < closestDistance) {
      closestDistance = distance
      currentSection = fieldName
    }

    if (top <= HEADER_OFFSET && bottom > HEADER_OFFSET)
      nextSection = fieldName
  }

  activeSection.value = nextSection ?? currentSection
}

onMounted(() => {
  for (const sectionKey of Object.keys(props.sections)) {
    const el = getSectionElement(sectionKey)
    if (!el) continue
    el.setAttribute("section", sectionKey)
    el.id = `admin-${sectionKey}`
    el.style.scrollMarginTop = `${HEADER_OFFSET}px`
  }

  document.addEventListener("scroll", handleScroll, true)
  handleScroll()
})

onBeforeUnmount(() => {
  document.removeEventListener("scroll", handleScroll, true)
})
</script>

<template>
  <aside>
    <ul>
      <li
          v-for="section in Object.keys(sections)"
          v-bind:class="{ active: activeSection === section }"
      >
        <a
            :href="`#admin-${section}`"
            @click="activeSection = section">
          {{$t(`admin.sections.${section}.h1`)}}
        </a>
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

aside ul li a {
  display: block;
}

aside ul li:hover {
  font-weight: bold;
}

.active {
  color: darkorange;
}

</style>
