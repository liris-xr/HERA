<script setup>

import {getCertUrl} from "@/js/endpoints.js";
</script>

<template>
  <section>
    <slot name="content"></slot>
    <p>
      <span>{{$t('redirectMessage.part1')}}</span>
      {{$t('redirectMessage.part2')}}
      <a :href="getCertUrl()">{{$t('redirectMessage.part3')}}</a>
      {{$t('redirectMessage.part4')}}
    </p>
  </section>

</template>

<style scoped>

span{
  font-weight: 500;
  text-decoration: underline;
}

a{
  color: var(--accentColor);
}


p{
  margin-top: 8px;
}


*{
  color: inherit;
}

:slotted(*){
  color: inherit;
}
</style>
