import { Camera, Liveview as GPLiveview } from '@typedproject/gphoto2-driver/src';
import { Readable, PassThrough } from 'stream';

export type LiveviewHandler = (data: Uint8Array[]) => void;

export class LiveviewStream extends Readable {
  public started = false;
  constructor(public liveview, options?) {
    super(options);
    this.onData = this.onData.bind(this);

    this.liveview.on('data', this.onData);
  }

  _read() {
    if(!this.started) {
      this.liveview.start();
      this.started = true;
    }

    // in case no data are flowing, maybe the liveview file is closed (there is no error emission)
    if (!this.liveview.file) {
      this.push(null);
    }
  }

  _destroy() {
    this.liveview.off('data', this.onData);
    this.liveview.stop();
    this.started = false;
  }

  onData(data, size) {
    this.push(data);
  }
}

export default class Liveview {
  public camera: Camera;
  private _liveview: GPLiveview;

  static $liveviewInstances: Liveview[] = [];
  static $cameraInstances: Camera[] = [];

  private _handlers: LiveviewHandler[] = [];
  public started = false;

  constructor(
    camera: Camera
  ){
    if (~Liveview.$cameraInstances.indexOf(camera)) throw new Error('Already used');
    this.camera = camera;
    this._onFrame = this._onFrame.bind(this);
  }

  static getInstanceForCamera(camera: Camera) {
    const idx = Liveview.$cameraInstances.indexOf(camera);
    if (~idx) {
      return Liveview.$liveviewInstances[idx];
    } else {
      const instance = new Liveview(camera);
      Liveview.$liveviewInstances.push(instance);
      Liveview.$cameraInstances.push(camera);
      return instance
    }
  }

  start() {
    this._liveview = this.camera.liveview({
      output: 'base64',
      fps: 12, // Number of frames per second. Default is 24.
    });

    this._liveview.start();
    this._liveview.on('data', this._onFrame)
    this.started = true;
  }

  listen(handler) {
    if (typeof handler !== 'function') throw new Error('Handler should be a function');

    this._handlers.push(handler);
    if(!this.started) {
      this.start();
    }
  }

  unlisten(handler) {
    const idx = this._handlers.indexOf(handler);
    if (~idx) {
      this._handlers.splice(idx, 1);

      if(!this._handlers.length) {
        this.stop();
      }
    }
  }

  stop() {
    if (this._liveview) this._liveview.stop();
    this.started = false;
  }

  _onFrame(data) {
    for (const handler of this._handlers) {
      handler(data);
    }
  }
}