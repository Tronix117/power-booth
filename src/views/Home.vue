<template>
  <div class="home">
    <CameraPreview />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import CameraPreview from '@/components/CameraPreview.vue'; // @ is an alias to /src

@Component({
  components: {
    CameraPreview,
  },
})
export default class Home extends Vue {}
</script>
