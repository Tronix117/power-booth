import { Module, VuexModule, MutationAction, Action, Mutation } from 'vuex-module-decorators';

import { Camera, CameraList, ICamera, closeQuietly, Liveview, GPCodes, PointerOf } from '@typedproject/gphoto2-driver/src';
import store from '../store';
import path from 'path';

import { settingStore } from '..';

// import gm from 'gm';
// import { readFile } from 'fs';

import CameraWorker from '@/worker/camera.worker';
const cameraWorker = (window as any).cameraWorker = CameraWorker.create();
(window as any).CameraWorker = CameraWorker;

@Module({
  store,
  namespaced: true,
  name: 'camera',
  dynamic: true,
})
export default class CameraModule extends VuexModule {
  activeCamera: ICamera = null;
  camerasInfo: ICamera[] = [];
  
  previewPicture: string = null;
  lastPicture = null;
  lastPictureEnhanced = null;

  isPictureLoading = false;


  // get hasAutofocus(): boolean {
  //   return this.activeCamera.widgets.has('/actions/adutofocusdrive')
  // }

  @Action
  async fetchCameras(autoSelect: boolean) {
    const { camerasInfo, activeCameraInfo } = await cameraWorker.fetchCameras(autoSelect);
    this.context.commit('setCamerasInfo', { camerasInfo });
    this.context.commit('setCamera', activeCameraInfo);
  }

  @Action
  async releaseActiveCamera() {
    await cameraWorker.releaseActiveCamera();
    this.context.commit('setCamera', null);
  }

  @Action
  async selectCamera(cameraId: string) {
    this.context.commit('setCamera', await cameraWorker.selectCamera(cameraId));
  }

  @Action
  async startLiveview() {
    try {
      cameraWorker.startLiveview(settingStore.liveviewFramerate).catch(err => {
        console.error(err);
      })

      cameraWorker.on('previewPicture', data => this.context.commit('setPreviewPicture', data))
    } catch(err) {
      console.log(err);
    }
  }


  @Action
  async restartLiveview() {
    await this.stopLiveview();
    await this.startLiveview();
  }


  @Action
  async stopLiveview() {
    cameraWorker.removeAllListeners('previewPicture'); //@todo pass correct listener here
    cameraWorker.stopLiveview();
  }

  // @Action
  // async autofocus() {
  //   if (this.activeCamera.widgets.has('/actions/adutofocusdrive')) {
  //     return console.warn('no autofocus');
  //   }
  //   this.activeCamera.widgets.get('/actions/adutofocusdrive').value = true;
  // }

  @Action({ commit: 'setLastPicture' })
  async clearLastPicture() {
    return null;
  }

  @Action
  async takePicture() {
    this.context.commit('setIsPictureLoading', true);
    const data = await cameraWorker.takePicture().catch(err => {
      console.error(err);
      return null;
    })
    if (data) this.context.commit('setLastPicture', data);
    this.context.commit('setIsPictureLoading', false);
  }

  @Action({ commit: 'setLastPictureEnhanced'})
  async treatLastPicture(filepath: string) {
    this.context.commit('setLastPictureEnhanced', null);
    console.log('begin GM')
    const filepathEnhanced = `${filepath}.enhanced.jpg`
    // gm(filepath)
    //   .contrast(+1.2)
    //   .resize(500, 500)
    //   .write(filepathEnhanced, function (err) {
    //     if (!err) {
    //       // readFile(filepathEnhanced, (err, data) => {
    //       //   if (err) return console.error('error reading file');
    //       //   this.context.commit('setLastPictureEnhanced', data.toString('base64'));
    //       // })
    //       console.log('done');
    //     } else console.error(err);
    //   });
  }

  @Mutation
  setCamerasInfo({ camerasInfo }) {
    this.camerasInfo = camerasInfo;
  }

  @Mutation
  setCamera(activeCamera: ICamera) {
    this.activeCamera = { ...activeCamera };
  }

  @Mutation
  setPreviewPicture(data) {
    this.previewPicture = data ? `data:image/png;base64,${data}` : null;
  }

  @Mutation
  setLastPicture(data) {
    this.lastPicture = data ? `data:image/jpeg;base64,${data}` : null;
  }

  @Mutation
  setLastPictureEnhanced(data) {
    this.lastPictureEnhanced = data ? `data:image/jpeg;base64,${data}` : null;
  }

  @Mutation
  setIsPictureLoading(isPictureLoading: boolean) {
    this.isPictureLoading = isPictureLoading;
  }
}