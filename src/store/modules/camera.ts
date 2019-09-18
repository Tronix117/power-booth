import { Module, VuexModule, MutationAction, Action, Mutation } from 'vuex-module-decorators';

import { Camera, CameraList, ICamera, closeQuietly, Liveview, GPCodes, PointerOf } from '@typedproject/gphoto2-driver/src';
import store from '../store';
import path from 'path';

import gm from 'gm';
import { readFile } from 'fs';

@Module({
  store,
  namespaced: true,
  name: 'camera',
  dynamic: true,
})
export default class CameraModule extends VuexModule {
  activeCamera: Camera | null = null;
  activeCameraId: string | null = null;
  activeCameraModel: string | null = null;

  camerasInfo: ICamera[] = [];

  previewPicture: string = null;
  lastPicture = null;
  lastPictureEnhanced = null;

  isPictureLoading = false;

  private cameraList: CameraList;
  private cameraSelectRetryTimeout: NodeJS.Timeout;
  private liveview: Liveview;


  get hasAutofocus(): boolean {
    return this.activeCamera.widgets.has('/actions/adutofocusdrive')
  }

  @Action
  async fetchCameras(autoSelect: boolean) {
    if (this.cameraList) this.cameraList.closeQuietly();
    this.cameraList = new CameraList()
    this.cameraList.autodetect()
    const camerasInfo = this.cameraList.toArray();

    if (this.activeCamera) {
      let found = false;
      for (const cameraInfo of camerasInfo) {
        if (cameraInfo.model === this.activeCameraModel) {
          found = true;
          break;
        }
      }

      if (!found) {
        await this.context.dispatch('releaseActiveCamera');
      }
    }

    this.context.commit('setCamerasInfo', { camerasInfo });

    if (!this.activeCamera && camerasInfo.length) {
      this.context.dispatch('selectCamera', camerasInfo[0].id);
    }
  }

  @Action({commit: 'setCamera'})
  async releaseActiveCamera() {
    this.activeCamera.closeQuietly();
    return {}
  }

  @Action({commit: 'setCamera'})
  async selectCamera(cameraId: string) {
    if (this.cameraSelectRetryTimeout) {
      clearTimeout(this.cameraSelectRetryTimeout);
    }

    const pos = this.camerasInfo.findIndex((info) => info.id === cameraId);
    const cameraInfo = this.camerasInfo[pos];

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

    return {
      activeCamera,
      activeCameraId: cameraId,
      activeCameraModel: cameraInfo.model,
    };
  }

  @Action
  async startLiveview() {
    this.liveview = this.activeCamera.liveview({
      output: 'base64',
      fps: 24,
    })

    this.liveview.on('data', (data) => {
      this.context.commit('setPreviewPicture', data);
    })

    while(true) {
      try {
        this.liveview.start();
      } catch(err) {
        if (err.code === GPCodes.GP_ERROR_CAMERA_BUSY) continue;
        console.error(err);
      }
      break;
    }
  }

  @Action
  async stopLiveview() {
    if (!this.liveview) return;
    this.liveview.stop();
    this.liveview.removeAllListeners();
    closeQuietly(this.liveview);
    this.liveview = null;
  }

  @Action
  async autofocus() {
    if (this.activeCamera.widgets.has('/actions/adutofocusdrive')) {
      return console.warn('no autofocus');
    }
    this.activeCamera.widgets.get('/actions/adutofocusdrive').value = true;
  }

  @Action({ commit: 'setLastPicture' })
  async clearLastPicture() {
    return null;
  }

  @Action
  async takePicture() {
    this.context.commit('setIsPictureLoading', true);

    let hadLiveview = !!this.liveview;
    if (hadLiveview) {
      this.liveview.stop();
    }
    
    while(true) {
      try {
        const file = await this.activeCamera.captureImageAsync();
        const filepath = `/Users/jeremyt/Development/PhotoBooth/power-booth/tmp/${Date.now() / 1000}.jpg`;
        await file.saveAsync(filepath);
        const { data } = await file.getDataAndSizeAsync('binary');
        // const buffer = new Buffer(32);
        // console.log(await file.getMimeTypeAsync(buffer as any as PointerOf<string>));
        // console.log(buffer);
        // file.closeQuietly()
        this.context.commit('setLastPicture', data.toString('base64'));
        this.context.dispatch('treatLastPicture', filepath);
      } catch(err) {
        if (err.code === GPCodes.GP_ERROR_CAMERA_BUSY) continue;
        console.error(err);
      }
      break;
    }

    if (hadLiveview) this.liveview.start();
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
  setCamera({ activeCamera, activeCameraId, activeCameraModel }) {
    this.activeCamera = activeCamera;
    (global as any).activeCamera = activeCamera;
    this.activeCameraId = activeCameraId;
    this.activeCameraModel = activeCameraModel;
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