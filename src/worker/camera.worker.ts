import { Worker, Action, WorkerActionType } from '../lib/worker';
import { CameraList, ICamera, Camera, Liveview, closeQuietly, GPCodes } from '@typedproject/gphoto2-driver/src';

import { homedir } from 'os';

export default class CameraWorker extends Worker {
  activeCamera: Camera | null = null;
  activeCameraInfo: ICamera;

  camerasInfo: ICamera[];

  private cameraList: CameraList;
  private cameraSelectRetryTimeout: NodeJS.Timeout;
  private liveview: Liveview;

  @Action
  async fetchCameras(autoSelect: boolean) {
    if (this.cameraList) this.cameraList.closeQuietly();
    this.cameraList = new CameraList()
    this.cameraList.autodetect()
    const camerasInfo = this.cameraList.toArray();

    if (this.activeCamera) {
      let found = false;
      for (const cameraInfo of camerasInfo) {
        if (cameraInfo.model === this.activeCameraInfo.model) {
          found = true;
          break;
        }
      }

      if (!found) {
        await this.releaseActiveCamera();
      }
    }

    this.camerasInfo = camerasInfo;

    if (autoSelect && !this.activeCamera && camerasInfo.length) {
      this.selectCamera(camerasInfo[0].id);
    }

    return { camerasInfo, activeCameraInfo: this.activeCameraInfo };
  }

  @Action
  async releaseActiveCamera() {
    this.activeCamera.closeQuietly();
  }

  @Action
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
            resolve(await this.selectCamera(cameraId));
          }, 1000);
        });
      }
      return {};
    }

    if (this.activeCamera) closeQuietly(this.activeCamera);

    this.activeCamera = activeCamera;
    this.activeCameraInfo = cameraInfo;

    return cameraInfo;
  }

  @Action
  async takePicture() {
    let hadLiveview = !!this.liveview;
    if (hadLiveview) {
      this.liveview.stop();
    }
    
    let picture = null;
    while(true) {
      try {
        const file = await this.activeCamera.captureImageAsync();
        const filepath = `${homedir()}/img/${Date.now() / 1000}.jpg`;
        await file.saveAsync(filepath);
        const { data } = await file.getDataAndSizeAsync('binary');
        // const buffer = new Buffer(32);
        // console.log(await file.getMimeTypeAsync(buffer as any as PointerOf<string>));
        // console.log(buffer);
        // file.closeQuietly()
        picture = data.toString('base64');
      } catch(err) {
        if (err.code === GPCodes.GP_ERROR_CAMERA_BUSY) continue;
        console.error(err);
      }
      break;
    }

    if (hadLiveview) this.liveview.start();
    return picture;
  }

  @Action
  async startLiveview(fps) {
    if (!this.activeCamera) return;
    this.liveview = this.activeCamera.liveview({
      fps,
      output: 'base64',
    })

    this.liveview.on('data', (data) => {
      this.emit('previewPicture', data);
    })

    while(true) {
      try {
        this.liveview.start();
      } catch(err) {
        if (err.code === GPCodes.GP_ERROR_CAMERA_BUSY) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }
        throw new Error(err);
      }
      break;
    }

    return true;
  }

  @Action
  async stopLiveview() {
    if (!this.liveview) return;
    this.liveview.stop();
    this.liveview.removeAllListeners();
    closeQuietly(this.liveview);
    this.liveview = null;
  }

  beforeDestroy() {
    closeQuietly(this.activeCamera);
  }
}