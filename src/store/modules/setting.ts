import { Module, VuexModule, MutationAction } from 'vuex-module-decorators';
import store from '../store'

import { cameraStore } from '..';

@Module({
  store,
  namespaced: true,
  name: 'setting',
  dynamic: true,
})
export default class SettingModule extends VuexModule {
  liveviewEnabled = true;
  liveviewFramerate = 12;

  @MutationAction({ mutate: ['liveviewEnabled'] })
  async changeLiveviewEnabled(liveviewEnabled: boolean) {
    return { liveviewEnabled }
  }

  @MutationAction({ mutate: ['liveviewFramerate'] })
  async changeLiveviewFramerate(liveviewFramerate: number) {
    if (liveviewFramerate !== this.liveviewFramerate) {
      cameraStore.restartLiveview();
    }
    return { liveviewFramerate }
  }
}