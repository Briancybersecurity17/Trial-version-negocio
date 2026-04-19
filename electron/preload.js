const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronDB', {
  list:      (e, sort, limit)        => ipcRenderer.invoke('db:list', e, sort, limit),
  filter:    (e, q, sort, limit)     => ipcRenderer.invoke('db:filter', e, q, sort, limit),
  create:    (e, data)               => ipcRenderer.invoke('db:create', e, data),
  update:    (e, id, data)           => ipcRenderer.invoke('db:update', e, id, data),
  delete:    (e, id)                 => ipcRenderer.invoke('db:delete', e, id),
  deleteAll: (e)                     => ipcRenderer.invoke('db:deleteAll', e),
  exportAll: ()                      => ipcRenderer.invoke('db:exportAll'),
});

contextBridge.exposeInMainWorld('electronAuth', {
  login:             (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout:            ()                   => ipcRenderer.invoke('auth:logout'),
  check:             ()                   => ipcRenderer.invoke('auth:check'),
  changePassword:    (cur, next)          => ipcRenderer.invoke('auth:changePassword', cur, next),
  getUsers:          ()                   => ipcRenderer.invoke('auth:getUsers'),
  createUser:        (data)               => ipcRenderer.invoke('auth:createUser', data),
  deleteUser:        (id)                 => ipcRenderer.invoke('auth:deleteUser', id),
  resetUserPassword: (id, pw)             => ipcRenderer.invoke('auth:resetUserPassword', id, pw),
  resetApp:          ()                   => ipcRenderer.invoke('auth:resetApp'),
});

contextBridge.exposeInMainWorld('electronServer', {
  getInfo: () => ipcRenderer.invoke('server:getInfo'),
});

contextBridge.exposeInMainWorld('electronSettings', {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (data) => ipcRenderer.invoke('settings:set', data),
});

contextBridge.exposeInMainWorld('electronFiles', {
  /** Abre un diálogo nativo para elegir una imagen. Devuelve la ruta absoluta o null. */
  openImage: () => ipcRenderer.invoke('dialog:openImageFile'),
});

