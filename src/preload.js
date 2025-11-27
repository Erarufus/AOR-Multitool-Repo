const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    navTo: (page) => ipcRenderer.send('nav-To', page),

    saveFile: (filePath, content) => ipcRenderer.invoke('notes:saveFile', filePath, content),
    getFolders: () => ipcRenderer.invoke('notes:getFolders'),
    getNotesInFolder: (folderName) => ipcRenderer.invoke('notes:getNotesInFolder', folderName),
    createFolder: (folderName) => ipcRenderer.invoke('notes:createFolder', folderName),
    readNoteFile: (folderName, fileName) => ipcRenderer.invoke('notes:readFile', folderName, fileName),
    createNote: (folderName, title) => ipcRenderer.invoke('notes:createFile', folderName, title),
    openNotesFolder: () => ipcRenderer.invoke('notes:openFolder'),
    renameNote: (oldFilePath, newTitle) => ipcRenderer.invoke('notes:renameFile', oldFilePath, newTitle),
    deleteNote: (folderName, fileName) => ipcRenderer.invoke('notes:deleteFile', folderName, fileName),
  });