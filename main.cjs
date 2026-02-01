const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "BOQ Pro - Professional Engineering Estimates",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        icon: path.join(__dirname, 'public/favicon.ico'),
        backgroundColor: '#0f172a' // Matches app theme
    });

    // In production, we load the built index.html from dist
    // In development, we load from the local Vite dev server
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools(); // Optional: open dev tools in dev mode
    } else {
        win.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    // Remove menu for a cleaner, native feel
    win.setMenu(null);
}

app.whenReady().then(() => {
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
