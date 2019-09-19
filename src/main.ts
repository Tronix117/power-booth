import { remote, ipcRenderer } from 'electron'
import workerClasses from './worker';

ipcRenderer.on('ready', (event, { worker: workerSetting } = {}) => {
  (window as any).win = remote.getCurrentWindow();
  if (workerSetting) {
    // const workerClass = require(worker.filepath) as any as (new (...args: any[]) => Worker);
    const workerClass = workerClasses[workerSetting.className];
    const worker = (window as any).worker = new workerClass(workerSetting.namespace, workerSetting.parentWebContentsId);
    console.log('test');
  } else {
    const Vue = require('vue').default;
    const App = require('./views/layouts/App.vue').default;
    const router = require('./router').default;
    const store = require('./store').default;
  
    Vue.config.productionTip = false
  
    new Vue({
      router,
      store,
      render: h => h(App)
    }).$mount('#app')
  }
})
