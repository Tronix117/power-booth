import Worker, { WorkerActionType } from '../worker';

export function Action(type: WorkerActionType);
export function Action(target: Worker, propertyKey: string, descriptor: PropertyDescriptor);
export function Action(...args) {
  let type = args.length >= 3 ? WorkerActionType.Immediate : args[0];

  const decorator = function (
    target: Worker,
    propertyKey: string,
    descriptor: PropertyDescriptor,
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

  if (args.length >= 3) {
    return decorator(...args as [Worker, string, PropertyDescriptor]);
  } else {
    return decorator;
  }
}