const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//   app.quit();
//   process.exit(0);
// }

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Micro ERP Varejo',
    icon: path.join(__dirname, app.isPackaged ? '../dist/icon.png' : '../public/icon.png') // Use public in dev, dist in prod
  });

  // Remove default menu bar
  mainWindow.removeMenu();

  mainWindow.maximize();
  mainWindow.show();
  mainWindow.focus();

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function startServer() {
  const isDev = !app.isPackaged;
  
  // Dynamic path for database logic
  // In production, we cannot write to the resources folder (asar).
  // So we pass the userData path to the backend, so it knows where to initialize the DB.
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'loja.db');
  
  // Optional: Copy default DB if it doesn't exist to ensure a fresh start or specific structure
  // But our initDb in db.cjs already handles table creation, so just pointing to the path is enough.

  const serverPath = path.join(__dirname, '../server.cjs');
  
  // Fork the server process
  // We pass the DB_PATH as an environment variable
  serverProcess = fork(serverPath, [], {
    env: { 
      ...process.env, 
      DB_PATH: dbPath,
      PORT: 3001
    }
  });

  console.log(`[Electron] Server started with PID: ${serverProcess.pid}`);
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
