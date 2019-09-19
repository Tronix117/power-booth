import { remote, BrowserWindow as TBrowserWindow, ipcRenderer } from 'electron';
const { BrowserWindow } = remote;
const currentWindow = remote.getCurrentWindow();

export interface WorkerOption {
  namespace?: string;
}

export class WorkerProcess {
  readonly namespace: string;

  private _window: TBrowserWindow;
  private readonly _workerClass: typeof Worker;
  private readonly _workerClassName: string;
  private readonly _ipcListenersPathList: string[] = [];

  constructor(workerClassName: string, workerClass: typeof Worker, options: WorkerOption = {}) {
    this._workerClass = workerClass;
    this._workerClassName = workerClassName;
    this.namespace = options.namespace || this._workerClassName;
    WorkerProcess.attachWorkerToCurrentWindow(this);
    this.createWorkerWindow();
    this.attachEvents();
  }

  static attachWorkerToCurrentWindow(worker: WorkerProcess) {
    if (!currentWindow.hasOwnProperty('workers')) {
      Object.defineProperty(currentWindow, 'workers', {
        enumerable: true,
        writable: false,
        configurable: false,
        value: {}
      })
    }

    const workers: { [namespace: string]: WorkerProcess } = (currentWindow as any).workers;
    if(workers[worker.namespace]) {
      console.warn(`A worker using ${worker.namespace} is already used, removing previous worker`);

      const prevWorker = workers[worker.namespace];
      prevWorker.release();
    }
    workers[worker.namespace] = worker;

    window.addEventListener('beforeunload', () => {
      worker.release();
    })
  }

  public release() {
    for (const path of this._ipcListenersPathList) {
      ipcRenderer.removeAllListeners(path);
    }
    this._window.close();
    
    if ((currentWindow as any).workers[this.namespace] === this) {
      delete (currentWindow as any).workers[this.namespace];
    }
  }

  protected async createWorkerWindow() {
    this._window = new BrowserWindow({
      show: true,
      webPreferences: {
        nodeIntegration: true
      }
    });
    
    const url = remote.getGlobal('WEBPACK_DEV_SERVER_URL');
    if (url) {
      this._window.loadURL(url);
      this._window.webContents.openDevTools();
    } else {
      this._window.loadURL("app://./index.html");
    }

    return new Promise((resolve) => {
      this._window.webContents.on('did-finish-load', () => {
        this._window.webContents.send('ready', {
          worker: {
            namespace: this.namespace,
            className: this._workerClassName,
            filepath: `./worker/camera.worker`,
            parentWebContentsId: currentWindow.webContents.id,
          }
        });
        resolve(this._window);
      })
    })
  }

  protected attachEvents() {
    for (const name in this._workerClass.__workerActions) {
      this.addAction(name, this._workerClass.__workerActions[name]);
    }
  }

  protected addAction(name: string, action: WorkerAction) {
    if (this.hasOwnProperty(name)) {
      throw new Error(`${name} is already defined on Worker: ${this._workerClassName}`);
    }

    Object.defineProperty(this, name, {
      enumerable: true,
      configurable: false,
      writable: false,
      value: function (...args) {
        return this.handler(name, action, ...args)
      },
    })
  }

  protected handler(name: string, action: WorkerAction, ...args): Promise<any> | void {
    const uid = Math.random().toString(36).substring(2);
    const path = `worker/${this.namespace}/${name}`;
    this._window.webContents.send(path, uid, ...args);

    switch (action.type) {
      case WorkerActionType.Immediate:
          const returnPath = `${path}/${uid}/result`;
          return new Promise((resolve, reject) => {
            ipcRenderer.once(returnPath, (event, err, result) => {
              const pos = this._ipcListenersPathList.indexOf(returnPath);
              if (pos !== -1) this._ipcListenersPathList.splice(pos, 1);

              if (err) reject(err);
              else resolve(result);
            });
            this._ipcListenersPathList.push(returnPath);
          });
        break;
      case WorkerActionType.Event:
        // this._window.webContents.
        break;
    }
  }
}

export enum WorkerActionType {
  Immediate = 'Immediate',
  Event = 'Event',
}

export interface WorkerAction {
  type: WorkerActionType,
}

export abstract class Worker {
  private readonly namespace;
  private readonly _parentWebContentsId: number;
  static __workerActions: {[actionName: string]: WorkerAction};

  constructor(namespace: string, parentWebContentsId: number) {
    this.namespace = namespace;
    this._parentWebContentsId = parentWebContentsId;
    this.attachEvents();
  }

  get selfClass(): typeof Worker {
    return this.constructor as any
  }

  static create(options: WorkerOption = {}) {
    return new WorkerProcess(this.name, this as any as typeof Worker, options);
  }

  protected attachEvents() {
    for (const name in this.selfClass.__workerActions) {
      this.addActionListeners(name, this.selfClass.__workerActions[name]);
    }
  }

  protected addActionListeners(name: string, action: WorkerAction) {
    if (typeof this[name] !== 'function') {
      throw new Error(`${name} does not exists on: ${this.selfClass.name}`);
    }
    
    const path = `worker/${this.namespace}/${name}`;
    ipcRenderer.on(path, async (event, uid, ...args) => {
      const returnPath = `${path}/${uid}/result`;

      try {
        const result = await this[name](...args);
        ipcRenderer.sendTo(this._parentWebContentsId, returnPath, null, result);
        console.log(`sending to ${returnPath}`, null, result, event.sender)
      } catch(err) {
        ipcRenderer.sendTo(this._parentWebContentsId, returnPath, err);
        console.log(`sending to ${returnPath}`, null, event.sender)
      }
    })
  }

  protected log(...args): void {
    console.log(...args);
  }
}

export function Action(type: WorkerActionType) {
  return function (
    target: Worker,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const targetClass = target.constructor as typeof Worker;

    if (!targetClass.hasOwnProperty('__workerActions')) {
      Object.defineProperty(targetClass, '__workerActions', {
        value: {},
        enumerable: false,
        configurable: false,
        writable: false,
      })
    }

    if (typeof target[propertyKey] !== 'function') return
    targetClass.__workerActions[propertyKey] = {
      type,
    }
  }
}

export default Worker;