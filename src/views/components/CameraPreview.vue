<template>
  <div class="CameraPreview">
    <img v-show="imageSrc" class="CameraPreview__liveview" :src="imageSrc" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import path from "path";

import { Camera } from '@typedproject/gphoto2-driver/src';
import { cameraStore } from '../../store';

@Component
export default class CameraPreview extends Vue {
  get imageSrc() {
    return cameraStore.previewPicture;
  }

  mounted() {
    cameraStore.startLiveview();
  }

  destroyed() {
    cameraStore.stopLiveview();
  }
}
</script>

<style scoped lang="scss">
.CameraPreview {
  position: absolute;
  width: 100%;
  height: 100%;

  &__liveview {
    object-fit: contain;
    width: 100%;
    height: 100%;
  }
}
</style>
