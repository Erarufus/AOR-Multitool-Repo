const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    navTo: (page) => ipcRenderer.send('nav-To', page),

    saveFile: (filePath, content) => ipcRenderer.send('file:save', filePath, content),
    getNoteFiles: () => ipcRenderer.invoke('notes:getFiles'),
    readNoteFile: (fileName) => ipcRenderer.invoke('notes:readFile', fileName),
    createNote: (title) => ipcRenderer.invoke('notes:createFile', title),
    openNotesFolder: () => ipcRenderer.invoke('notes:openFolder'),
    renameNote: (oldFilePath, newTitle) => ipcRenderer.invoke('notes:renameFile', oldFilePath, newTitle),
    deleteNote: (fileName) => ipcRenderer.invoke('notes:deleteFile', fileName),
  });