<template>
  <div>
    <video controls ref='video' width="100%" height="100%"></video>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import path from "path";
import { ipcRenderer } from 'electron';


@Component
export default class CameraPreview extends Vue {
  $refs: {
    video: HTMLVideoElement,
  }

  sourceBuffer: SourceBuffer
  mediaSource: MediaSource
  queue: any[]

  created() {
    this.onStreamChunk = this.onStreamChunk.bind(this);
  }

  mounted() {
    const { video } = this.$refs;

    ipcRenderer.on('stream', this.onStreamChunk);
    // this.$refs.video.srcObject = this.mediaSource;

    const mimeCodec = 'video/mp4; codecs="avc1.42C028"';
    
    if(MediaSource.isTypeSupported(mimeCodec)) {
      this.queue = []

      this.mediaSource = new MediaSource()
      this.mediaSource.addEventListener('sourceended', (e) => {
        console.log('sourceended: ' + this.mediaSource.readyState);
      });

      this.mediaSource.addEventListener('sourceclose', (e) => {
        console.log('sourceclose: ' + this.mediaSource.readyState);
      });

      this.mediaSource.addEventListener('error', (e) => {
        console.log('error: ' + this.mediaSource.readyState);
      });


      video.src = URL.createObjectURL(this.mediaSource);

      this.mediaSource.addEventListener('sourceopen', () => {
        console.log('sourceOpen')
        this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeCodec);
        this.sourceBuffer.mode = 'sequence';

        this.sourceBuffer.addEventListener('updateend', () => this._updateBuffer())
        this.sourceBuffer.addEventListener('update', () => this._updateBuffer())
        
        ipcRenderer.send('stream:open');
      }, false);
      // setTimeout(() => video.play().catch((err) => console.error(err)), 500);
    }
    
  }

  private _updateBuffer(){
    if (this.queue.length > 0 && !this.sourceBuffer.updating) {
        this.sourceBuffer.appendBuffer(this.queue.shift());
    }
  }

  unmounted() {
    ipcRenderer.removeListener('stream', this.onStreamChunk);
  }

  onStreamChunk(e, data) {
    if(typeof data === 'object'){
      if (this.sourceBuffer.updating || this.queue.length > 0) {
          this.queue.push(data);
      } else {
          this.sourceBuffer.appendBuffer(data);
          this.$refs.video.play();
      }
    }
  }

  destroyed() {
    this.sourceBuffer = null;
    this.mediaSource = null;
  }
}
</script>

<style scoped lang="scss">
</style>
