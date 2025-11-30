//imports
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { v4 as uuidv4 } from 'uuid';
import csv from 'csv-parser';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}


//main window
const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // load app content
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

//file sys setup
//defines path for notes dir and creates if not exist
const notesPath = path.join(app.getPath('userData'), 'notes');
if (!fs.existsSync(notesPath)) {
  fs.mkdirSync(notesPath, { recursive: true });
}

//defines path for diet data dir and creates if not exist
const dietPath = path.join(app.getPath('userData'), 'diet');
if (!fs.existsSync(dietPath)) {
  fs.mkdirSync(dietPath, { recursive: true });
}

/**
 * Generates a unique path for a file or folder by appending a number if the path already exists.
 * @param {string} directory The directory where the item should be.
 * @param {string} name The desired name for the item.
 * @param {string|null} extension The file extension (or null for a directory).
 * @returns {{uniqueName: string, uniquePath: string}}
 */
function getUniquePath(directory, name, extension = null) {
  let uniqueName = name;
  let uniquePath = path.join(directory, extension ? `${uniqueName}.${extension}` : uniqueName);
  let counter = 1;
  while (fs.existsSync(uniquePath)) {
    uniqueName = `${name} (${counter})`;
    uniquePath = path.join(directory, extension ? `${uniqueName}.${extension}` : uniqueName);
    counter++;
  }
  return { uniqueName, uniquePath };
}

//ipc handlers
//get a list of all folder names within notes dir
ipcMain.handle('notes:getFolders', async () => {
  try {
    const dirents = fs.readdirSync(notesPath, { withFileTypes: true });
    return dirents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (err) {
    console.error('Failed to read folders from notes directory:', err);
    return [];
  }
});

//ipc get list of all notes + id in folder
ipcMain.handle('notes:getNotesInFolder', async (event, folderName) => {
  const folderPath = path.join(notesPath, folderName);
  try {
    if (!fs.existsSync(folderPath)) {
      return [];
    }
    const fileNames = fs.readdirSync(folderPath).filter(file => file.endsWith('.json'));
    const notesData = fileNames.map(fileName => {
      const filePath = path.join(folderPath, fileName);
      const title = fileName.replace(/\.json$/, '');
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let data = JSON.parse(content);
        let needsUpdate = false;
        //add uuid if not existent
        
        if (!data.id) {
          data.id = uuidv4();
          needsUpdate = true;
        }
        // Add lastOpened if it doesn't exist, using file's modification time as a fallback.
        if (typeof data.lastOpened === 'undefined') {
          const stats = fs.statSync(filePath);
          data.lastOpened = stats.mtime.getTime();
          needsUpdate = true;
        }

        if (needsUpdate) {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
        return { id: data.id, title, lastOpened: data.lastOpened };
      } catch (e) {
        console.error(`Could not read or parse ${fileName} in ${folderName}:`, e);
        return null;
      }
    });
    return notesData.filter(note => note !== null);
  } catch (err) {
    console.error(`Failed to read notes from ${folderName}:`, err);
    return [];
  }
});

//create new folder w singualr name
ipcMain.handle('notes:createFolder', async (event, folderName) => {
  if (!folderName || typeof folderName !== 'string' || folderName.trim().length === 0) {
    return { success: false, error: 'Invalid folder name.' };
  }
  const sanitizedName = folderName.replace(/[\\/:*?"<>|]/g, '');
  const { uniqueName, uniquePath: newFolderPath } = getUniquePath(notesPath, sanitizedName);
  try {
    fs.mkdirSync(newFolderPath);
    return { success: true, folderName: uniqueName };
  } catch (err) {
    console.error('Failed to create new folder:', err);
    return { success: false, error: err.message };
  }
});
//delete file
ipcMain.handle('notes:deleteFile', async (event, folderName, fileName) => {
  const filePath = path.join(notesPath, folderName, `${fileName}.json`);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found.' };
  } catch (err) {
    console.error(`Failed to delete note file: ${filePath}`, err);
    return { success: false, error: err.message };
  }
});
//rename file safely
ipcMain.handle('notes:renameFile', async (event, oldFilePath, newTitle) => {
  if (!newTitle || typeof newTitle !== 'string' || newTitle.trim().length === 0) {
    return { success: false, error: 'Invalid title provided.' };
  }

  const oldTitle = path.basename(oldFilePath, '.json');
  if (oldTitle === newTitle) {
    return { success: true, filePath: oldFilePath, newFileName: oldTitle }; // No change needed
  }

  const folderPath = path.dirname(oldFilePath);

  // Sanitize the new title to create a valid filename
  const sanitizedTitle = newTitle.replace(/[\\/:*?"<>|]/g, '');
  const { uniqueName: newFileName, uniquePath: newFilePath } = getUniquePath(folderPath, sanitizedTitle, 'json');

  try {
    fs.renameSync(oldFilePath, newFilePath);
    return { success: true, filePath: newFilePath, newFileName: newFileName };
  } catch (err) {
    console.error(`Failed to rename note from ${oldFilePath} to ${newFilePath}:`, err);
    return { success: false, error: err.message };
  }
});
//read note file
ipcMain.handle('notes:readFile', async (event, folderName, fileName) => {
  const filePath = path.join(notesPath, folderName, `${fileName}.json`);
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Update last opened timestamp
    data.lastOpened = Date.now();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return { filePath, content: JSON.stringify(data) };
  } catch (err) {
    console.error('Failed to read file:', err);
    return null;
  }
});

//opem notes folder
ipcMain.handle('notes:openFolder', () => {
  shell.openPath(notesPath);
});

//create new unique file +initial content
ipcMain.handle('notes:createFile', async (event, folderName, title) => {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { success: false, error: 'Invalid title provided.' };
  }
  const folderPath = path.join(notesPath, folderName);
  // Sanitize filename to remove invalid characters
  const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, '');
  const { uniqueName: newFileName, uniquePath: newFilePath } = getUniquePath(folderPath, sanitizedTitle, 'json');
  try {
    const noteId = uuidv4();
    const initialContent = {
      id: noteId,
      lastOpened: Date.now(),
      type: 'doc',
      content: [{ type: 'paragraph' }]
    };
    fs.writeFileSync(newFilePath, JSON.stringify(initialContent, null, 2));
    return { success: true, fileName: newFileName, filePath: newFilePath };
  } catch (err) {
    console.error('Failed to create new note file:', err);
    return { success: false, error: err.message };
  }

});


//save content
ipcMain.handle('notes:saveFile', (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content);
    return { success: true };
  } catch (err) {
    console.error('Failed to save file:', err);
    return { success: false, error: err.message };
  }
});

//Food Search Logic 

let foodDataCache = null; // Start as null
let foodDataLoadingPromise = null; // To store the promise while loading

function loadFoodDataFromCSV() {
   // This function will now return a Promise that resolves with the data
   return new Promise((resolve, reject) => {
    try {
      let filePath;
      if (app.isPackaged) {
        filePath = path.join(process.resourcesPath, 'assets', 'MyFoodData.csv');
      } else {
        filePath = path.join(app.getAppPath(), 'assets', 'MyFoodData.csv');
      }

      if (!fs.existsSync(filePath)) {
        return reject(new Error(`Food data file not found at path: ${filePath}`));
      }
      
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          console.log(`[loadFoodDataFromCSV] Successfully loaded and parsed ${results.length} food items.`);
          resolve(results); // Resolve the promise with the data
        })
        .on('error', (error) => {
            console.error('Failed to parse CSV file:', error);
            reject(error);
        });
    } catch (error) {
      console.error('Failed to load food data file:', error);
      reject(error);
    }
  });
}

/**
 * Asynchronously returns the food data. If not cached, it loads from the CSV.
 */
async function getFoodData() {
  if (!foodDataLoadingPromise) {
    foodDataLoadingPromise = loadFoodDataFromCSV();
  }
  foodDataCache = await foodDataLoadingPromise;
  return foodDataCache;
}

ipcMain.handle('foods:search', async (event, searchTerm) => {
  const allFoodObjects = await getFoodData();
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }
  const lowerCaseSearchTerm = searchTerm.toLowerCase();
  const results = allFoodObjects
    // EDIT 'name' to the column header for the food
     .filter(food => food['name'] && typeof food['name'] === 'string' && food['name'].toLowerCase().includes(lowerCaseSearchTerm))
     .map(food => food['name']) // This extracts just the name string for the frontend
    .slice(0, 25); // Return top 25 matches
  return results;
});

ipcMain.handle('foods:getDetails', async (event, foodName) => {
  const allFoodObjects = await getFoodData();
  if (!foodName) {
    return null;
  }
  // EDIT 'name' to the column header for the food
  const foodDetails = allFoodObjects.find(food => food['name'] === foodName);
  return foodDetails || null;
});

ipcMain.handle('diet:loadFoods', async (event, dateString) => {
  const filePath = path.join(dietPath, `${dateString}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    return []; // Return empty array if file doesn't exist
  } catch (error) {
    console.error(`Failed to load foods for ${dateString}:`, error);
    return []; // Return empty array on error
  }
});

ipcMain.handle('diet:saveFoods', async (event, dateString, foods) => {
  const filePath = path.join(dietPath, `${dateString}.json`);
  try {
    // To keep the directory clean, we'll write the file only if there are foods.
    // If the list is empty, we'll ensure the file is deleted if it exists.
    fs.writeFileSync(filePath, JSON.stringify(foods, null, 2));
    return { success: true };
  } catch (error) {
    console.error(`Failed to save foods for ${dateString}:`, error);
    return { success: false, error: error.message };
  }
});

//electron app life extras
app.whenReady().then(() => {
  createWindow();

  // On macos, standard behaviour
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS to maintain standard behaviour. 
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

