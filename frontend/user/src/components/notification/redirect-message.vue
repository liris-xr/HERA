<script setup>

import {getDevCertificateUrls} from "@/js/endpoints.js";

const certificateUrls = getDevCertificateUrls();
</script>

<template>
  <section>
    <slot name="content"></slot>
    <p>
      <span>{{$t('redirectMessage.part1')}}</span>
      {{$t('redirectMessage.part2')}}
    </p>
    <ul>
      <li><a :href="certificateUrls.backend" target="_blank" rel="noreferrer">{{certificateUrls.backend}}</a></li>
      <li><a :href="certificateUrls.frontend" target="_blank" rel="noreferrer">{{certificateUrls.frontend}}</a></li>
    </ul>
    <p>{{$t('redirectMessage.part3')}}</p>
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

ul{
  margin-top: 8px;
  padding-left: 20px;
}


*{
  color: inherit;
}

:slotted(*){
  color: inherit;
}
</style>
