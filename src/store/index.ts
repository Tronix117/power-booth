import { getModule } from "vuex-module-decorators";
import camera from './modules/camera';
import setting from './modules/setting';
import store from './store';

export const cameraStore = getModule(camera);
export const settingStore = getModule(setting);

(global as any).cameraStore = cameraStore;

export default store;
