import { WorkerProcess } from './worker-process';
import { ipcRenderer } from 'electron';

export interface WorkerOption {
  namespace?: string;
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
    this.install();
  }

  get selfClass(): typeof Worker {
    return this.constructor as any
  }

  static create(options: WorkerOption = {}) {
    return new WorkerProcess(this.name, this as any as typeof Worker, options);
  }

  protected install() {
    // const console = window.console;
    const { _parentWebContentsId } = this;
    (window as any).console = new Proxy(window.console, {
      get: function(target, name, receiver) {
        return function(...args) {
          ipcRenderer.sendTo(_parentWebContentsId, 'worker::console', name, ...args);
          // console[name](...args);
        }
      }
    })

    this.attachEvents();
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