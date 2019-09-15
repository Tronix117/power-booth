<template>
  <div class="CameraPreview">
    <img class="CameraPreview__liveview" :src="imageSrc" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import path from "path";

import Liveview, { LiveviewHandler } from '@/lib/liveview';
import { Camera } from '@typedproject/gphoto2-driver/src';

@Component
export default class CameraPreview extends Vue {
  imageSrc = ''
  liveview: Liveview

  @Prop()
  camera: Camera;

  created() {
    this.onImageData = this.onImageData.bind(this);
    this.liveview = Liveview.getInstanceForCamera(this.camera);
  }

  mounted() {
    this.liveview.listen(this.onImageData);
  }

  destroyed() {
    this.liveview.unlisten(this.onImageData);
  }

  onImageData(data) {
    this.imageSrc = `data:image/png;base64,${data}`;
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
