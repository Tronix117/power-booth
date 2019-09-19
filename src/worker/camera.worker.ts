import { Worker, Action, WorkerActionType } from '../lib/worker';
import { CameraList } from '@typedproject/gphoto2-driver/src';

export default class CameraWorker extends Worker {
  @Action(WorkerActionType.Immediate)
  async takePicture(cameraId) {
    console.log('takepic')
    const cameraList = new CameraList()
    cameraList.autodetect()
    const camera = cameraList.getCamera(cameraId);

    console.log('captImg')
    const file = await camera.captureImageAsync();
    console.log('loadimg')
    const filepath = `/Users/jeremyt/Development/PhotoBooth/power-booth/tmp/${Date.now() / 1000}.jpg`;
    await file.saveAsync(filepath);
    const { data } = await file.getDataAndSizeAsync('binary');

    return data;
  }

  @Action(WorkerActionType.Event)
  async startLiveview() {
    console.log('startLiveview');
    // this.liveview = this.activeCamera.liveview({
    //   output: 'base64',
    //   fps: 24,
    // })

    // this.liveview.on('data', (data) => {
    //   this.context.commit('setPreviewPicture', data);
    // })

    // while(true) {
    //   try {
    //     this.liveview.start();
    //   } catch(err) {
    //     if (err.code === GPCodes.GP_ERROR_CAMERA_BUSY) continue;
    //     console.error(err);
    //   }
    //   break;
    // }
  }
}