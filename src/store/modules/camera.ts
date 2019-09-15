import { Module, VuexModule, MutationAction, Action, Mutation } from 'vuex-module-decorators';

import { Camera, CameraList, ICamera, closeQuietly } from '@typedproject/gphoto2-driver/src';
import store from '../store'

@Module({
  store,
  namespaced: true,
  name: 'camera',
  dynamic: true,
})
export default class CameraModule extends VuexModule {
  activeCamera: Camera | null = null;
  activeCameraId: string | null = null;
  camerasInfo: ICamera[] = [];

  cameraList: CameraList;

  cameraSelectRetryTimeout: NodeJS.Timeout;

  get hasAutofocus(): boolean {
    return this.activeCamera.widgets.has('/actions/adutofocusdrive')
  }

  @Action({ commit: 'setCamerasInfo' })
  async fetchCameras() {
    if (this.cameraList) this.cameraList.closeQuietly();
    this.cameraList = new CameraList()
    this.cameraList.autodetect()
    const camerasInfo = this.cameraList.toArray();
    return { camerasInfo };
  }

  @Action({commit: 'setCamera'})
  async selectCamera(cameraId: string) {
    if (this.cameraSelectRetryTimeout) {
      clearTimeout(this.cameraSelectRetryTimeout);
    }

    const pos = this.camerasInfo.findIndex((info) => info.id === cameraId);
    let activeCamera
    try {
      activeCamera = this.cameraList && this.cameraList.getCamera(pos) || null;
    } catch(err) {
      if (!!~err.message.indexOf('GP_ERROR_IO_USB_CLAIM')) {
        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            console.warn('USB not ready, retry in 1sec')
            resolve(await this.context.dispatch('selectCamera', cameraId));
          }, 1000);
        });
      }
      return {};
    }

    if (this.activeCamera) closeQuietly(this.activeCamera);

    return { activeCamera, activeCameraId: cameraId };
  }

  @Action
  async autofocus() {
    if (this.activeCamera.widgets.has('/actions/adutofocusdrive')) {
      return console.warn('no autofocus');
    }
    this.activeCamera.widgets.get('/actions/adutofocusdrive').value = true;
  }

  @Mutation
  setCamerasInfo({ camerasInfo }) {
    this.camerasInfo = camerasInfo;
  }

  @Mutation
  setCamera({ activeCamera, activeCameraId }) {
    this.activeCamera = activeCamera;
    (global as any).activeCamera = activeCamera;
    this.activeCameraId = activeCameraId;
  }
}