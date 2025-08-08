const fs = require('fs');
const path = require('path');
const Minio = require('minio');

// const configPath = path.join(__dirname, '../../config.json');

const { app } = require('electron').remote || require('@electron/remote');
const configPath = path.join(app.getPath('userData'), 'config.json');

let minioClient = null;
let bucketName = null;

// 从 config.json 读取配置
function loadConfig() {
  if (!fs.existsSync(configPath)) return null;
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config.endPoint || !config.port || !config.accessKey || !config.secretKey) return null;
    return config;
  } catch (e) {
    console.error('读取配置文件错误', e);
    return null;
  }
}

// 初始化 MinIO 客户端和 bucketName
function initMinioClient() {
  const config = loadConfig();
  if (!config) {
    console.warn('未检测到有效配置，无法初始化 MinIO 客户端');
    return;
  }
  minioClient = new Minio.Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: false,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  bucketName = config.defaultBucket || null;
}

// 登录函数，登录按钮和回车都会调用
function doLogin() {
  const endPoint = document.getElementById('endPoint').value.trim();
  const port = parseInt(document.getElementById('port').value.trim(), 10);
  const accessKey = document.getElementById('accessKey').value.trim();
  const secretKey = document.getElementById('secretKey').value.trim();
  const useSSL = document.getElementById('useSSL').checked;

  const errorDiv = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  errorDiv.innerText = '';

  if (!endPoint || !port || !accessKey || !secretKey) {
    errorDiv.innerText = '所有字段均不能为空';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerText = '登录中...';

  try {
    const client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey
    });

    client.listBuckets((err, buckets) => {
      loginBtn.disabled = false;
      loginBtn.innerText = '登录';

      if (err) {
        console.error('登录验证失败:', err);
        errorDiv.innerText = '登录失败，请检查配置和网络连接';
        return;
      }

      // 保存 config.json （包含密码）
      fs.writeFileSync(configPath, JSON.stringify({ endPoint, port, accessKey, secretKey, useSSL }));

      // 保存本地配置，不含密码
      localStorage.setItem('minioLoginConfig', JSON.stringify({ endPoint, port, accessKey, useSSL }));

      // 跳转
      window.location.href = '../buckets/buckets.html';
    });
  } catch (e) {
    console.error('未知错误:', e);
    errorDiv.innerText = '未知错误，请查看控制台日志';
    loginBtn.disabled = false;
    loginBtn.innerText = '登录';
  }
}

// 给登录按钮绑定点击事件
document.getElementById('loginBtn').addEventListener('click', doLogin);

// 监听回车事件（在所有登录相关输入框内）
['endPoint', 'port', 'accessKey', 'secretKey'].forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // 阻止默认表单提交
        doLogin();
      }
    });
  }
});

// 页面加载时自动读取 localStorage 中配置填充，不填密码
window.addEventListener('DOMContentLoaded', () => {
  const savedConfig = localStorage.getItem('minioLoginConfig');
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);
      if (config.endPoint) document.getElementById('endPoint').value = config.endPoint;
      if (config.port) document.getElementById('port').value = config.port;
      if (config.accessKey) document.getElementById('accessKey').value = config.accessKey;
      if (typeof config.useSSL === 'boolean') {
        document.getElementById('useSSL').checked = config.useSSL;
      }
      // secretKey 不自动填充
    } catch(e) {
      console.warn('读取本地配置失败', e);
    }
  }
  initMinioClient();
  if (bucketName) {
    renderTree();  // 只有有 bucketName 才渲染目录树
  }
});

// 你的其他变量和功能
const backBtn = document.getElementById('backBtn');
const bucketNameDisplay = document.getElementById('bucketNameDisplay');
const folderTree = document.getElementById('folderTree');
const fileContent = document.getElementById('fileContent');

if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.location.href = '../buckets/buckets.html';
  });
}

if (bucketNameDisplay && bucketName) {
  bucketNameDisplay.innerText = bucketName;
  bucketNameDisplay.title = bucketName;
}

const expandedNodes = new Set();

// 递归构建树形目录
async function buildTree(prefix = '') {
  return new Promise((resolve, reject) => {
    const objects = [];
    const foldersSet = new Set();

    if (!minioClient || !bucketName) {
      reject(new Error('MinIO 客户端或 bucketName 未初始化'));
      return;
    }

    const stream = minioClient.listObjectsV2(bucketName, prefix, false);

    stream.on('data', obj => {
      const rest = obj.name.substring(prefix.length);
      const parts = rest.split('/');

      if (parts.length > 1) {
        foldersSet.add(parts[0]);
      } else {
        objects.push(parts[0]);
      }
    });

    stream.on('end', () => {
      resolve({ folders: Array.from(foldersSet), files: objects });
    });

    stream.on('error', err => {
      console.error('列出对象错误:', err);
      reject(err);
    });
  });
}

// 渲染树形目录
async function renderTree(prefix = '', container = folderTree) {
  if (!container) return;
  container.innerHTML = '';

  const { folders } = await buildTree(prefix);

  const ul = document.createElement('ul');

  for (const folder of folders) {
    const li = document.createElement('li');
    const fullPath = prefix + folder + '/';

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon';
    toggleIcon.innerHTML = expandedNodes.has(fullPath) ? '−' : '+';
    toggleIcon.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (expandedNodes.has(fullPath)) {
        expandedNodes.delete(fullPath);
      } else {
        expandedNodes.add(fullPath);
      }
      await renderTree(prefix, container);
    });
    li.appendChild(toggleIcon);

    const textSpan = document.createElement('span');
    textSpan.innerText = folder;
    textSpan.style.marginLeft = '4px';
    textSpan.addEventListener('click', () => {
      loadFilesInFolder(bucketName, fullPath);
    });
    li.appendChild(textSpan);

    if (expandedNodes.has(fullPath)) {
      const childUl = document.createElement('ul');
      await renderTree(fullPath, childUl);
      li.appendChild(childUl);
    }

    ul.appendChild(li);
  }

  container.appendChild(ul);
}

function loadFilesInFolder(bucket, folder) {
  if (!fileContent) return;
  fileContent.innerHTML = `<h2>${folder}</h2>`;

  if (!minioClient) {
    fileContent.innerHTML += '<p>未初始化 MinIO 客户端</p>';
    return;
  }

  const stream = minioClient.listObjectsV2(bucket, folder, false);

  const ul = document.createElement('ul');

  stream.on('data', obj => {
    const li = document.createElement('li');
    li.innerText = obj.name.split('/').pop();
    ul.appendChild(li);
  });

  stream.on('end', () => {
    fileContent.appendChild(ul);
  });

  stream.on('error', err => {
    console.error('加载文件失败:', err);
  });
}

// 页面初始化，加载根目录树
renderTree();
