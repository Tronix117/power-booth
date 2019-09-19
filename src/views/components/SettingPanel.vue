<template>
  <section class="SettingPanel">
    <header>
      <h2>Settings</h2>
    </header>

    <section
      v-for="(section, idx) in sections"
      :key="section.key"
      :class="{
        SettingPanel__section: true,
        'SettingPanel__section--highligthed': highlightedSection === idx,
        'SettingPanel__section--opened': openedSection && openedSection.key === section.key,
      }"
    >
      <header>
        <h3 v-if="section.title">{{section.title}}</h3>
        <p v-if="section.content">{{section.content}}</p>
      </header>
      <ul v-if="section.items">
        <li
          v-for="(item, idx) in section.items"
          :key="idx"
          :class="{
            SettingPanel__sectionItem: true,
            'SettingPanel__sectionItem--highligthed': (
              openedSection && openedSection.key === section.key && highlightedItem === idx
            ),
            'SettingPanel__sectionItem--enabled': item.enabled,
          }"
        >
          <div>
            <h4 v-if="item.title">{{item.title}}</h4>
            <p v-if="item.content">{{item.content}}</p>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { cameraStore, settingStore } from '@/store';
import { AppButtonAction } from '../layouts/App.vue';
import { ICamera } from '@typedproject/gphoto2-driver/src';

export interface SettingPanelActionEvent {
  action: AppButtonAction,
}

export interface SettingPanelSectionActionEvent extends SettingPanelActionEvent {
  section: SettingPanelSection,
}

export interface SettingPanelSectionItemActionEvent extends SettingPanelSectionActionEvent {
  item: SettingPanelSectionItem,
}

export interface SettingPanelSectionItem {
  key: string,
  title: string,
  content?: string,
  action?: (event: SettingPanelSectionItemActionEvent) => void,
  enabled: boolean,
}

export interface SettingPanelSection {
  key: string,
  title?: string,
  items?: SettingPanelSectionItem[],
  content?: string,
  action?: (event: SettingPanelSectionActionEvent) => void
}

@Component
export default class SettingPanel extends Vue {
  highlightedSection = 0
  highlightedItem = 0

  openedSection: SettingPanelSection = null;

  private autodetectInterval: NodeJS.Timeout;

  get camerasInfo() {
    return cameraStore.camerasInfo || [];
  }

  get sections(): SettingPanelSection[] {
    return [{
      key: 'camera',
      title: 'Camera selection',
      ...(
        this.camerasInfo.length ? {
          items: this.camerasInfo.map((info: ICamera) => ({
            key: info.id,
            title: `${info.id} - ${info.model}`,
            content: info.port,
            action: this.onSelectCamera,
            enabled: cameraStore.activeCamera && cameraStore.activeCamera.id === info.id,
          }))
        } : { content: 'No camera available'}
      )
    }, {
      key: 'showLiveview',
      title: 'Afficher liveview',
      items: [
        { key: 'yes', title: 'Yes', enabled: settingStore.liveviewEnabled },
        { key: 'no', title: 'No', enabled: !settingStore.liveviewEnabled },
      ]
    }, {
      key: 'exit',
      title: 'Exit menu',
      action: this.exit,
    }]
  }

  mounted() {
    this.$on('action', this.onAction.bind(this));
    this.autodetect();
  }

  destroyed() {
    clearInterval(this.autodetectInterval);
  }

  onToggleItem(section, item) {
    switch (section.key) {
      case 'showLiveview':
        console.log(item.key)
        settingStore.changeLiveviewEnabled(item.key === 'yes');
        this.back();
        break;
    }
  }

  onAction(action) {
    switch (action) {
      case AppButtonAction.Trigger:
        if (this.openedSection) {
          this.highlightedItem = (this.highlightedItem + 1) % this.openedSection.items.length;
        } else {
          this.highlightedSection = (this.highlightedSection + 1) % this.sections.length;
        }
        break;
      case AppButtonAction.LongTrigger:
        if (this.openedSection) {
          const item = this.openedSection.items[this.highlightedItem];
          if (item.action) {
            item.action.call(this, {
              action,
              item,
              section: this.openedSection,
            } as SettingPanelSectionItemActionEvent);
          } else {
            this.onToggleItem(this.openedSection, item);
          }
        } else {
          const section = this.sections[this.highlightedSection];
          if (section.action) {
            section.action.call(this, { section, action } as SettingPanelSectionActionEvent);
          } else if (section.items) {
            this.openedSection = section;
          }
        }

        break;
    }
  }

  onSelectCamera({item}) {
    cameraStore.selectCamera(item.key);
    this.back();
  }

  async autodetect() {
    this.autodetectInterval = setInterval(this.detect.bind(this), 2000);
    await this.detect();
  }

  async detect(e?) {
    return cameraStore.fetchCameras(true);
  }

  back(...args){ this.exit(...args) }
  exit(e?) {
    if (this.openedSection) {
      this.openedSection = null;
      this.highlightedItem = 0;
    } else {
      this.$emit('close');
    }
  }
}
</script>

<style scoped lang="scss">
.SettingPanel {
  position: absolute;
  width: 30%;
  height: 100%;
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(-20px);
  box-shadow: 0px 0px 14px 16px rgba(0, 0, 0, 0.5);

  &__section {

    &--highligthed {
      border: 2px solid grey;
    }

    &--opened {
      border: 2px solid white;
    }
  }

  &__sectionItem {
    list-style-type: none;

    & > div {
      display: inline-block;
    }

    &--highligthed {
      color: cyan;
    }

    &--enabled::before {
      content: "\25b6";
    }
  }
}
</style>
