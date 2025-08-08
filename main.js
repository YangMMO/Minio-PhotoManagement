const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
require('@electron/remote/main').initialize();

let mainWindow;

app.name = '客户端'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    icon: path.join(__dirname, 'assets/icon.png'), // 图标路径
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('pages/login/login.html');
  mainWindow.setMinimumSize(960, 720);
  createAppMenu(); // 创建菜单
  require('@electron/remote/main').enable(mainWindow.webContents);
}



// 创建自定义菜单
function createAppMenu() {
const template = [
  {
    label: app.name,
    submenu: [
      {
        label: '关于',
        click: () => {
          showAboutDialog();
        }
      },
      { role: 'quit', label: '退出' }
    ]
  },
  {
    label: '操作',
    submenu: [
      {
        label: '重新载入',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          mainWindow.reload();
        }
      },
      {
        label: '开发者工具',
        accelerator: 'F12',
        click: () => {
          mainWindow.webContents.toggleDevTools();
        }
      },
      {
        label: '全屏',
        accelerator: 'F11',
        click: () => {
          const isFullScreen = mainWindow.isFullScreen();
          mainWindow.setFullScreen(!isFullScreen);
        }
      }
    ]
  }
];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 弹出关于窗口
function showAboutDialog() {
  dialog.showMessageBox({
    type: 'info',
    title: '关于',
    message: 'Minio图片管理系统\n网站Sites: MMOO.FUN',
    buttons: ['确定']
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
