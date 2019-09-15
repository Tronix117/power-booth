import { Module, VuexModule, MutationAction } from 'vuex-module-decorators';
import store from '../store'

@Module({
  store,
  namespaced: true,
  name: 'setting',
  dynamic: true,
})
export default class SettingModule extends VuexModule {
  liveviewEnabled = true;

  @MutationAction({ mutate: ['liveviewEnabled'] })
  async changeLiveviewEnabled(liveviewEnabled: boolean) {
    return { liveviewEnabled }
  }
}