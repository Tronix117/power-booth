<template>
  <div class="Picture">
    <img v-show="src" class="Picture__img" :src="src" />
    <div v-show="!isLoading">
      <MoonLoader color="white" size="64"></MoonLoader>
      Traitement de la photo en cours...
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import MoonLoader from 'vue-spinner/src/MoonLoader.vue'
import path from "path";

import { Camera } from '@typedproject/gphoto2-driver/src';
import { cameraStore } from '../../store';

@Component({ components: {MoonLoader} })
export default class Picture extends Vue {
  @Prop()
  src: string;

  get isLoading() {
    return cameraStore.isPictureLoading;
  }
}
</script>

<style scoped lang="scss">
.Picture {
  position: absolute;
  width: 100%;
  height: 100%;
  background: black;
  backdrop-filter: blur(-20px);

  &__img {
    object-fit: contain;
    width: 100%;
    height: 100%;
  }
}
</style>
