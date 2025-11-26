import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

const notesPath = path.join(app.getPath('userData'), 'notes');
if (!fs.existsSync(notesPath)) {
  fs.mkdirSync(notesPath, { recursive: true });
}

ipcMain.handle('notes:getFiles', async () => {
  try{
    const files = fs.readdirSync(notesPath);
    return files.filter(file => file.endsWith('.json')).map(file => file.replace(/\.json$/, ''));
  }catch(err){
    console.error('Failed to read notes directory', err);
    return[];
  }
});

ipcMain.handle('notes:readFile', async (event, fileName) => {
  const filePath = path.join(notesPath, `${fileName}.json`);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { filePath, content };
  } catch (err) {
    console.error('Failed to read file:', err);
    return null;
  }
});

ipcMain.handle('notes:openFolder', () => {
  shell.openPath(notesPath);
});

ipcMain.handle('notes:createFile', async (event, title) => {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { success: false, error: 'Invalid title provided.' };
  }
    // Sanitize filename to remove invalid characters
    const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, '');
    let newFileName = sanitizedTitle;
    let newFilePath = path.join(notesPath, `${newFileName}.json`);
    let counter = 1;
    
    // Ensure filename is unique by appending a number if it exists
    while (fs.existsSync(newFilePath)) {
      newFileName = `${sanitizedTitle} (${counter})`;
      newFilePath = path.join(notesPath, `${newFileName}.json`);
      counter++;
    }
     try {
    // Create an empty note file with a valid Tiptap/ProseMirror structure
    const initialContent = { type: 'doc', content: [{ type: 'paragraph' }] };
    fs.writeFileSync(newFilePath, JSON.stringify(initialContent, null, 2));
    // Return the name (without extension) and the full path
    return { success: true, fileName: newFileName, filePath: newFilePath };
  } catch (err) {
    console.error('Failed to create new note file:', err);
    return { success: false, error: err.message };
  }

});



ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Text Documents', extensions: ['json', 'txt', 'md'] }]
  });
  if (!canceled && filePaths.length > 0) {
    const filePath = filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { filePath, content };
    } catch (err) {
      console.error('Failed to read file:', err);
      return null;
    }
  }
  return null;
});

ipcMain.on('file:save', (event, filePath, content) => {
  fs.writeFileSync(filePath, content);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
