<template>
  <div class="Picture">
    <div class="Picture__imgWrapper">
      <img v-show="src" class="Picture__img" :src="src" :style="{ transform: `rotate(${imgRotate}deg)` }" />
    </div>
    <div v-show="isLoading" class="Picture__loadingWrapper">
      <div class="Picture__loadingSpinner">
        <svg class="lds-camera" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><g transform="translate(50,50)">
          <g transform="scale(0.8)">
          <g transform="translate(-50,-50)">
          <g>
            <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" values="360 50 50;240 50 50;120 50 50;0 50 50" keyTimes="0;0.333;0.667;1" dur="1.3s" keySplines="0.7 0 0.3 1;0.7 0 0.3 1;0.7 0 0.3 1" calcMode="spline"></animateTransform>
            <path fill="#ffffff" d="M54.3,28.1h34.2c-4.5-9.3-12.4-16.7-21.9-20.8L45.7,28.1L54.3,28.1L54.3,28.1z"></path>
            <path fill="rgba(100%,100%,100%,0.75)" d="M61.7,7.3C51.9,4,41.1,4.2,31.5,8.1v29.5l6.1-6.1L61.7,7.3C61.7,7.3,61.7,7.3,61.7,7.3z"></path>
            <path fill="rgba(100%,100%,100%,0.5)" d="M28.1,11.6c-9.3,4.5-16.7,12.4-20.8,21.9l20.8,20.8v-8.6L28.1,11.6C28.1,11.6,28.1,11.6,28.1,11.6z"></path>
            <path fill="rgba(100%,100%,100%,0.2)" d="M31.5,62.4L7.3,38.3c0,0,0,0,0,0C4,48.1,4.2,58.9,8.1,68.5h29.5L31.5,62.4z"></path>
            <path fill="#ffffff" d="M45.7,71.9H11.5c0,0,0,0,0,0c4.5,9.3,12.4,16.7,21.9,20.8l20.8-20.8H45.7z"></path>
            <path fill="rgba(100%,100%,100%,0.75)" d="M62.4,68.5L38.3,92.6c0,0,0,0,0,0c9.8,3.4,20.6,3.1,30.2-0.8V62.4L62.4,68.5z"></path>
            <path fill="rgba(100%,100%,100%,0.5)" d="M71.9,45.7v8.6v34.2c0,0,0,0,0,0c9.3-4.5,16.7-12.4,20.8-21.9L71.9,45.7z"></path>
            <path fill="rgba(100%,100%,100%,0.2)" d="M91.9,31.5C91.9,31.5,91.9,31.5,91.9,31.5l-29.5,0l0,0l6.1,6.1l24.1,24.1c0,0,0,0,0,0 C96,51.9,95.8,41.1,91.9,31.5z"></path>
          </g></g></g></g>
        </svg>
      </div>
      <div class="Picture__loadingText">Traitement de la photo en cours...</div>
    </div>
    <svg xmlns="http://www.w3.org/2000/svg">
      <filter id="inset-outline-1">
        <feFlood flood-color="white" flood-opacity="1" result="color"/>
        <feColorMatrix in="SourceGraphic" result="mask1" type="matrix" values="0 0 0 0,0 0 0 0,0 0 0 0,0 0 0 0,0 0 1 0"/>
        <feMorphology in="mask1" result="mask2" operator="erode" radius="20"/>
        <feComposite in="color" in2="mask1" operator="in" result="inner"/>
        <feComposite in="inner" in2="mask2" operator="out" result="outline"/>
        <feBlend in="outline" in2="SourceGraphic" mode="normal"/>
      </filter>
    </svg>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import path from "path";

import { Camera } from '@typedproject/gphoto2-driver/src';
import { cameraStore } from '../../store';

@Component
export default class Picture extends Vue {
  @Prop()
  src: string;

  get isLoading() {
    return cameraStore.isPictureLoading;
  }

  get imgRotate() {
    if (!this.src) return 0; // just trick, to map dependency to this.src
    return Math.floor(Math.random() * 10) - 5;
  }
}
</script>

<style scoped lang="scss">
.Picture {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);

  &__loadingWrapper {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%, -50%, 0);
  }

  &__loadingSpinner {

  }

  &__loadingText {
    color: white;
    font-weight: 600;
    font-size: 64px;
  }

  &__imgWrapper {
    position: absolute;
    top: 150px;
    left: 150px;
    bottom: 150px;
    right: 150px;
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    
    filter:
      drop-shadow(0 -60px 0 white)
      drop-shadow(0 60px 0 white)
      drop-shadow(-60px 0 0 white)
      drop-shadow(60px 0 0 white);
  }
}
</style>
