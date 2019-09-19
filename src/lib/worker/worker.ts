import { WorkerProcess } from './worker-process';
import { ipcRenderer } from 'electron';
import { EventEmitter } from 'events';
import { FunctionPropertyNames, FunctionProperties, ObjectType } from './types';
import CameraWorker from '@/worker/camera.worker';

export interface WorkerOption {
  namespace?: string;
  className?: string;
}

export enum WorkerActionType {
  Immediate = 'Immediate',
  // Event = 'Event',
}

export interface WorkerAction {
  type: WorkerActionType,
}

export abstract class Worker extends EventEmitter {
  private readonly namespace;
  private readonly _parentWebContentsId: number;
  static __workerActions: {[actionName: string]: WorkerAction};

  constructor(namespace: string, parentWebContentsId: number) {
    super();

    this.namespace = namespace;
    this._parentWebContentsId = parentWebContentsId;
    this.install();
  }

  get selfClass(): typeof Worker {
    return this.constructor as any
  }

  static create<T extends Worker>(this: ObjectType<T>, options: WorkerOption = {}) {
    return new WorkerProcess(
      this.name,
      this as any as typeof Worker,
      options
    ) as any as WorkerProcess & FunctionProperties<T>;
  }

  /**
   * Override emit so we can watch all events and propagate them to the main window.
   *
   * @param {(string | symbol)} event
   * @param {...any[]} args
   * @returns {boolean}
   * @override
   * @memberof Worker
   */
  emit(eventName: string | symbol, ...args: any[]): boolean {
    ipcRenderer.sendTo(
      this._parentWebContentsId,
      `worker/${this.namespace}::event`,
      eventName,
      ...args
    );
    return super.emit(eventName, ...args);
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

    window.addEventListener('beforeunload', () => this.beforeDestroy());

    console.info('Started');
  }

  public beforeDestroy () {
    // Hook to be implemented in child class
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
    
    const path = `worker/${this.namespace}/${name}::call`;
    ipcRenderer.on(path, async (event, uid, ...args) => {
      const returnPath = `${path}/${uid}::return`;

      try {
        const result = await this[name](...args);
        ipcRenderer.sendTo(this._parentWebContentsId, returnPath, null, result);
      } catch(err) {
        ipcRenderer.sendTo(this._parentWebContentsId, returnPath, {message: err.message});
      }
    })
  }
}

export default Worker;