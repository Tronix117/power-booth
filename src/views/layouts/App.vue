<template>
  <div
    class="App"
    tabindex="-1"
    @keydown="onKeyDown"
    @keyup="onKeyUp"
  >
    <CameraPreview v-if="camera && liveviewEnabled" />
    <Picture v-if="showPicture" :src="lastPicture" />
    <transition name="slideLeft">
      <SettingPanel
        ref="settingPanel"
        v-show="settingPanelEnabled"
        @close="settingPanelEnabled = false"
      />
    </transition>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component';
import { ipcRenderer } from 'electron';
import CameraPreview from '@/views/components/CameraPreview.vue';
import SettingPanel from '@/views/components/SettingPanel.vue';
import Picture from '@/views/components/Picture.vue';
import { Camera, closeQuietly } from '@typedproject/gphoto2-driver/src';
import { Dictionary } from 'vue-router/types/router';

import { cameraStore, settingStore } from '@/store';

export enum AppButtonAction {
  Magic = 'magic',
  Trigger = 'trigger',
  LongTrigger = 'longTrigger',
}

const buttonActions: Dictionary<[number, number][]> = {
  magic: [[2000, 10000]],//, [10, 500], [10, 500], [10, 500],
  trigger: [[10, 500]],
  longTrigger: [[500, 2000]],
}

const buttonActionStepResetDuration = 5000;

@Component({
  components: { CameraPreview, SettingPanel, Picture },
})
export default class App extends Vue {
  $el: HTMLElement
  $refs: {
    settingPanel: SettingPanel
  }

  actionsSteps: Dictionary<number> = {};
  actionStepResetTimer: NodeJS.Timeout;

  currentKeyDownTime = 0;
  buttonPressed = false;

  settingPanelEnabled = false;

  get showPicture() {
    return cameraStore.isPictureLoading || cameraStore.lastPicture;
  }

  get lastPicture() {
    return cameraStore.lastPictureEnhanced || cameraStore.lastPicture;
  }

  get liveviewEnabled() {
    return settingStore.liveviewEnabled;
  }

  get camera() {
    return cameraStore.activeCamera;
  }

  mounted() {
    this.$el.focus();
    this.$on('action', this.onAction.bind(this));
    // cameraStore.treatLastPicture('/Users/jeremyt/Development/PhotoBooth/power-booth/tmp/1568589121.802.jpg')
  }

  destroyed() {
    if (this.camera) {
      closeQuietly(this.camera);
    }
  }

  onAction(action: AppButtonAction) {
    if (action === AppButtonAction.Magic) {
      this.settingPanelEnabled = !this.settingPanelEnabled;
      return;
    }

    if (this.settingPanelEnabled) {
      this.$refs.settingPanel.$emit('action', action);
      return;
    }

    switch (action) {
      case AppButtonAction.Trigger:
      case AppButtonAction.LongTrigger:
        if (this.lastPicture) {
          cameraStore.clearLastPicture()
        } else {
          cameraStore.takePicture();
        }
        break;
    }
  }

  onKeyDown(e) {
    if (e.code === "Space" && !this.buttonPressed) {
      this.currentKeyDownTime = Date.now();
      this.buttonPressed = true
    }
  }

  availableButtonActions() {
    const actionNames = Object.keys(this.actionsSteps)
    if (!actionNames.length) return buttonActions;
    const availableButtonActions: Dictionary<[number, number][]> = {};
    for (const actionName of actionNames) {
      availableButtonActions[actionName] = buttonActions[actionName];
    }
    return availableButtonActions
  }

  onKeyUp(e) {
    if (e.code !== "Space") return;
    
    this.buttonPressed = false;
    
    const duration = Date.now() - this.currentKeyDownTime;
    
    const actions = this.availableButtonActions();
    for (const actionName in actions) {
      const buttonAction = buttonActions[actionName];
      let actionStep = this.actionsSteps[actionName] || 0;

      if(
        duration > buttonAction[actionStep][0]
        && duration < buttonAction[actionStep][1]
      ) {
        actionStep++;
      } else {
        actionStep = 0;
      }

      if (actionStep >= buttonAction.length) {
        actionStep = 0;
        console.log(`Trigger Action: ${actionName}`)
        this.$emit('action', actionName);
      }

      if (actionStep) {
        this.actionsSteps[actionName] = actionStep;
      } else {
        delete this.actionsSteps[actionName];
      }
    }

    if (this.actionStepResetTimer) {
      clearTimeout(this.actionStepResetTimer);
    }
    
    this.actionStepResetTimer = setTimeout(() => {
      this.actionsSteps = {};
    }, buttonActionStepResetDuration);
  }
}
</script>

<style lang="scss">
.App {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  background: #000000;
}

.slideLeft-leave-active,
.slideLeft-enter-active {
  transition: 300ms;
}

.slideLeft-enter {
  transform: translate(100%, 0);
}

.slideLeft-leave-to {
  transform: translate(-100%, 0);
}

body {
  overflow: hidden;
}
</style>
