const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
require('@electron/remote/main').initialize();

let mainWindow;
let currentLang = 'zh'; // 默认中文

app.name = '客户端';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('pages/login/login.html');
  mainWindow.setMinimumSize(960, 720);
  require('@electron/remote/main').enable(mainWindow.webContents);

  // 页面加载后读取语言并创建菜单
  mainWindow.webContents.on('did-finish-load', async () => {
    currentLang = await getRendererLang();
    createAppMenu();
  });
}

// 从渲染进程读取当前语言
async function getRendererLang() {
  try {
    const lang = await mainWindow.webContents.executeJavaScript(
      `localStorage.getItem("lang") || "zh"`
    );
    return lang;
  } catch {
    return 'zh';
  }
}

// 切换语言
async function toggleLanguage() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  await mainWindow.webContents.executeJavaScript(`
    window.MMOO_LANG && window.MMOO_LANG.setLang("${currentLang}");
  `);
  createAppMenu();
}

// 创建自定义菜单
function createAppMenu() {
  const text = {
    zh: {
      app: app.name,
      about: '关于',
      quit: '退出',
      action: '操作',
      reload: '重新载入',
      devtools: '开发者工具',
      fullscreen: '全屏',
      setting: '设置',
      langSwitch: '切换为 English',
      aboutMsg: 'Minio图片管理系统\n© 2025 MMOO.FUN, All rights reserved.',
      ok: '确定'
    },
    en: {
      app: 'Client',
      about: 'About',
      quit: 'Quit',
      action: 'Actions',
      reload: 'Reload',
      devtools: 'Dev Tools',
      fullscreen: 'Fullscreen',
      setting: 'Setting',
      langSwitch: 'Switch to 中文',
      aboutMsg: 'Minio Image Manager\n© 2025 MMOO.FUN, All rights reserved.',
      ok: 'OK'
    }
  }[currentLang];

  const template = [
    {
      label: text.app,
      submenu: [
        {
          label: text.about,
          click: () => showAboutDialog(text)
        },
        { type: 'separator' },
        {
          label: text.quit,
          role: 'quit'
        }
      ]
    }, 
    {
      label: text.setting,
      submenu: [
        {
          label: text.langSwitch,
          accelerator: 'CmdOrCtrl+L',
          click: () => toggleLanguage()
        }
      ]
    }, {
      label: text.action,
      submenu: [
        {
          label: text.reload,
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload()
        },
        {
          label: text.devtools,
          accelerator: 'F12',
          click: () => mainWindow.webContents.toggleDevTools()
        },
        {
          label: text.fullscreen,
          accelerator: 'F11',
          click: () => {
            const isFull = mainWindow.isFullScreen();
            mainWindow.setFullScreen(!isFull);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 弹出关于窗口
function showAboutDialog(text) {
  dialog.showMessageBox({
    type: 'info',
    title: text.about,
    message: text.aboutMsg,
    buttons: [text.ok]
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
