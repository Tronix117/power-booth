<template>
  <div>
    <video ref='video' width="100%"></video>
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

  buffer_size = 5*1024*1024;
  buffer_index = 0;
  frag_mp4_buffer = new Uint8Array(this.buffer_size);

  created() {
    this.onStreamChunk = this.onStreamChunk.bind(this);
  }

  mounted() {
    const { video } = this.$refs;

    ipcRenderer.on('stream', this.onStreamChunk);
    // this.$refs.video.srcObject = this.mediaSource;

    const mimeCodec = 'video/mp4; codecs="avc1.640028, mp4a.40.2"';
    
    if(MediaSource.isTypeSupported(mimeCodec)) {
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
        this.sourceBuffer.addEventListener('updateend', function(e) {
          if (video.duration && !video.currentTime) {
            video.currentTime = video.duration;
          }
        }, false);
        ipcRenderer.send('stream:open');
      }, false);
      setTimeout(() => video.play().catch((err) => console.error(err)), 500);
    }
    
  }

  unmounted() {
    ipcRenderer.removeListener('stream', this.onStreamChunk);
  }

  onStreamChunk(e, data) {
    console.log('data')
    if(!this.sourceBuffer) return
    if (data.length) {
      if((this.buffer_index + data.length) <= this.buffer_size){
        this.frag_mp4_buffer.set(data, this.buffer_index);
        this.buffer_index = this.buffer_index + data.length;
        if (!this.sourceBuffer.updating && this.mediaSource.readyState == 'open') {
          var appended = this.frag_mp4_buffer.slice(0, this.buffer_index);
          this.sourceBuffer.appendBuffer(appended);
          this.frag_mp4_buffer.fill(0);
          this.buffer_index = 0;
        }
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
