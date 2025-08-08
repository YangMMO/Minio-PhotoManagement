// files.js
const { loadContent } = require('./fileContent.js');

const { createMinioClient, loadConfig } = require('../../minioClient');
const fs = require('fs');
const path = require('path');

const { app } = require('electron').remote || require('@electron/remote');
const configPath = path.join(app.getPath('userData'), 'config.json');

const config = loadConfig();
if (!config) window.location.href = '../login/login.html';

const minioClient = createMinioClient();
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const backBtn = document.getElementById('backBtn');
const bucketNameDisplay = document.getElementById('bucketNameDisplay');
const folderTree = document.getElementById('folderTree');
const fileContent = document.getElementById('fileContent');
const addRootFolderBtn = document.getElementById('addRootFolderBtn');

const contextMenu = document.getElementById('contextMenu');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

const toast = document.getElementById('toast');

const resizer = document.getElementById('resizer');
const sidebar = document.querySelector('.sidebar');
let isResizing = false;


// 页面加载时恢复宽度
window.addEventListener('DOMContentLoaded', () => {
  const savedWidth = localStorage.getItem('sidebarWidth');
  if (savedWidth) {
    const width = parseInt(savedWidth, 10);
    if (width >= 200 && width <= 600) {
      sidebar.style.width = width + 'px';
    }
  }
});

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const newWidth = e.clientX;
  if (newWidth >= 200 && newWidth <= 600) {
    sidebar.style.width = `${newWidth}px`;
  }
});

document.addEventListener('mouseup', (e) => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = 'default';

    // 拖拽结束，保存宽度
    const width = sidebar.getBoundingClientRect().width;
    localStorage.setItem('sidebarWidth', Math.round(width));
  }
});

// 顶部信息
userInfo.innerHTML = `<i class="ri-account-circle-fill"></i> ${config.accessKey} @ ${config.endPoint}:${config.port}`;
logoutBtn.onclick = () => {
  try {
    fs.writeFileSync(configPath, JSON.stringify({}));
    window.location.href = '../login/login.html';
  } catch (err) {
    console.error('写入配置失败', err);
    alert('无法退出：配置文件写入失败。');
  }
};
backBtn.onclick = () => { window.location.href = '../buckets/buckets.html'; };

// URL 参数

const urlParams = new URLSearchParams(window.location.search);
const bucketName = urlParams.get('bucket');
bucketNameDisplay.innerText = bucketName || '未指定存储桶';

if (!bucketName) {
  folderTree.innerHTML = '<div>未指定存储桶</div>';
} else {
  // 页面加载时默认加载树形目录 + 根路径文件内容
  loadTreeData(bucketName)
    .then(() => {
      loadContent(bucketName, '');
    })
    .catch(err => console.error('❌ 加载树形目录失败', err));
}


// ==================== toast 函数 ====================
function showToast(message, duration = 2000) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ==================== 自定义确认弹窗 ====================
function openConfirmModal(message) {
  return new Promise((resolve) => {
    confirmMessage.textContent = message;
    confirmModal.style.display = 'flex';

    function cleanUp() {
      confirmModal.style.display = 'none';
      confirmOkBtn.removeEventListener('click', onOk);
      confirmCancelBtn.removeEventListener('click', onCancel);
    }
    function onOk() {
      cleanUp();
      resolve(true);
    }
    function onCancel() {
      cleanUp();
      resolve(false);
    }

    confirmOkBtn.addEventListener('click', onOk);
    confirmCancelBtn.addEventListener('click', onCancel);
  });
}

// ==================== 加载树形数据 ====================
async function loadTreeData(bucket, expandedPaths = [], activePath = '') {
  return new Promise((resolve, reject) => {
    const all = [];
    const stream = minioClient.listObjectsV2(bucket, '', true);
    stream.on('data', o => all.push({ name: o.name, lastModified: o.lastModified }));
    stream.on('end', () => {
      // 过滤一级 thumb/original
      const filtered = all.filter(o => {
        const parts = o.name.split('/');
        return !(parts[1] === 'thumb' || parts[1] === 'original');
      });

      const data = buildTreeFromKeysWithTime(filtered);
      renderTree(data, folderTree, '');
      requestAnimationFrame(() => {
        expandedPaths.forEach(p => {
          expandParentPaths(p).forEach(pp => {
            const it = folderTree.querySelector(`[data-full-path="${pp}"]`);
            if (it) {
              const sibling = it.parentElement.querySelector('.folder-children');
              if (sibling) {
                sibling.style.display = 'block';
              }
            }
          });
        });
        setActivePath(activePath);
        resolve();
      });
    });
    stream.on('error', err => reject(err));
  });
}


function buildTreeFromKeysWithTime(objects) {
  const tree = {};
  const dirTimes = {};
  const allDirs = new Set(); // 记录所有目录路径
  const addedPaths = new Set(); // 记录已添加到 tree 的路径

  // 收集 .keep 的目录时间 & 收集所有目录路径
  objects.forEach(obj => {
    const parts = obj.name.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += parts[i] + '/';
      allDirs.add(currentPath);
    }

    if (obj.name.endsWith('.keep')) {
      const dirPath = obj.name.slice(0, -'.keep'.length);
      dirTimes[dirPath] = new Date(obj.lastModified);
    }
  });

  // 正常构建 tree（排除含有 thumb 或 original 的路径）
  objects.forEach(obj => {
    const parts = obj.name.split('/');
    if (parts.length <= 1) return;

    if (parts.includes('thumb') || parts.includes('original')) return;

    let current = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const dirPath = parts.slice(0, i + 1).join('/') + '/';

      if (!current[part]) {
        current[part] = {
          _children: {},
          _time: dirTimes[dirPath] || null
        };
      }

      addedPaths.add(dirPath);
      current = current[part]._children;
    }
  });

  // 比对缺失的路径并补进 tree
  allDirs.forEach(dirPath => {
    if (addedPaths.has(dirPath)) return; // 已有就跳过
    if (dirPath.includes('thumb/') || dirPath.includes('original/')) return; // 仍需跳过

    const parts = dirPath.split('/').filter(Boolean);
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const subPath = parts.slice(0, i + 1).join('/') + '/';

      if (!current[part]) {
        current[part] = {
          _children: {},
          _time: dirTimes[subPath] || null,
          _isFromKeepOnly: true // 标记是补上的
        };
      }

      current = current[part]._children;
    }
  });

  return tree;
}




// 辅助函数：展开所有上级路径，比如 'a/b/c/' -> ['a/', 'a/b/', 'a/b/c/']
function expandParentPaths(path) {
  const parts = path.split('/').filter(Boolean);
  const paths = [];
  for (let i = 1; i <= parts.length; i++) {
    paths.push(parts.slice(0, i).join('/') + '/');
  }
  return paths;
}

// ==================== 渲染树 ====================
function renderTree(node, container, path) {
  container.innerHTML = '';
  const ul = document.createElement('ul');

  // 对当前层目录名排序，按_time倒序（时间最新在前）
  const sortedKeys = Object.keys(node).sort((a, b) => {
    const timeA = node[a]._time ? node[a]._time.getTime() : 0;
    const timeB = node[b]._time ? node[b]._time.getTime() : 0;
    return timeB - timeA; // 时间大的排前面
  });

  sortedKeys.forEach(key => {
    const li = document.createElement('li');
    li.className = 'folder-li';

    const fullPath = path + key + '/';
    const hasChildren = Object.keys(node[key]._children).length > 0;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toggle-icon';
    iconSpan.style.cursor = 'pointer';
    iconSpan.innerHTML = hasChildren ? '<i class="ri-add-box-line"></i>' : '';

    const folderItemDiv = document.createElement('div');
    folderItemDiv.className = 'folder-item';
    folderItemDiv.dataset.fullPath = fullPath;
    folderItemDiv.appendChild(iconSpan);

    const nameSpan = document.createElement('span');
    nameSpan.innerText = key;
    folderItemDiv.appendChild(nameSpan);

    // active时高亮样式，名字蓝色
    folderItemDiv.classList.remove('active');
    nameSpan.style.color = ''; // 默认颜色
    // 激活时样式将在setActivePath中统一处理

    // 统一点击事件：点击整条folderItemDiv切换目录并展开
    folderItemDiv.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      contextMenu.style.display = 'none';
      document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.remove('right-clicked');
      });

      // 点击激活目录，触发加载文件和切换高亮
      loadContent(bucketName, fullPath);;
      setActivePath(fullPath);

      // 有子目录时，切换展开状态
      if (hasChildren) {
        toggleChildDiv();
      }
    });

    // 支持双击名字区域也能展开/收起
    if (hasChildren) {
      nameSpan.style.cursor = 'pointer';
      nameSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        toggleChildDiv();
      });
    }

    iconSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleChildDiv();
    });

    li.appendChild(folderItemDiv);

    let childDiv = null;
    if (hasChildren) {
      childDiv = document.createElement('div');
      childDiv.className = 'folder-children';
      childDiv.style.display = 'none';
      renderTree(node[key]._children, childDiv, fullPath);
      li.appendChild(childDiv);
    }

    function toggleChildDiv() {
      if (!childDiv) return;
      if (childDiv.style.display === 'none') {
        childDiv.style.display = 'block';
        iconSpan.innerHTML = '<i class="ri-checkbox-indeterminate-line"></i>';
      } else {
        childDiv.style.display = 'none';
        iconSpan.innerHTML = '<i class="ri-add-box-line"></i>';
      }
    }

    folderItemDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.pageX, e.pageY, fullPath);
    });

    ul.appendChild(li);
  });

  container.appendChild(ul);
}


// ==================== 设置 active ====================
function setActivePath(path) {
  document.querySelectorAll('.folder-item').forEach(item => {
    const isActive = item.dataset.fullPath === path;
    item.classList.toggle('active', isActive);

    // 高亮名字蓝色，非active恢复默认
    const nameSpan = item.querySelector('span:nth-child(2)'); // folderItemDiv第2个span是名字
    if (nameSpan) {
      nameSpan.style.color = isActive ? '#007bff' /* 蓝色 */ : '';
      nameSpan.style.fontWeight = isActive ? '600' : 'normal'; // 加粗一点更明显
    }
  });
}

// ==================== 展开记录 ====================
function getExpandedPaths() {
  const expanded = [];
  document.querySelectorAll('.folder-item').forEach(item => {
    const nextDiv = item.parentElement.querySelector('.folder-children');
    if (nextDiv && nextDiv.style.display === 'block') {
      expanded.push(item.dataset.fullPath);
    }
  });
  return expanded;
}

// ==================== 右键菜单 ====================
let currentRightClickPath = '';

function showContextMenu(x, y, path) {
  currentRightClickPath = path;

  // 移除其他已高亮的
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('right-clicked');
  });

  // 添加当前右键的高亮
  const targetItem = document.querySelector(`.folder-item[data-full-path="${path}"]`);
  if (targetItem) {
    targetItem.classList.add('right-clicked');
  }

  contextMenu.style.top = y + 'px';
  contextMenu.style.left = x + 'px';
  contextMenu.style.display = 'block';
}

document.addEventListener('click', () => {
  contextMenu.style.display = 'none';

  // 清除右键高亮状态
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('right-clicked');
  });
});

// ==================== 新建目录 ====================
document.getElementById('createFolder').addEventListener('click', async () => {
  try {
    const folderName = await openCreateModal(currentRightClickPath);
    const newFolderPath = currentRightClickPath + folderName + '/';

    const exists = await checkFolderExists(bucketName, newFolderPath);
    if (exists) return showToast('目录已存在，请输入不同名称');

    await minioClient.putObject(bucketName, newFolderPath + '.keep', '');
    showToast('目录创建成功');

    // 获取当前展开目录列表
    await handleNewFolder(newFolderPath);
  } catch {
    // 用户取消，不做任何事
  }
});

// 抽取公共函数：新建目录后的处理流程
async function handleNewFolder(newFolderPath) {
  const expandedPaths = getExpandedPaths();

  // 添加所有父路径（包括新目录自身）用于展开
  const parents = getAllParentPaths(newFolderPath);
  parents.forEach(p => {
    if (!expandedPaths.includes(p)) {
      expandedPaths.push(p);
    }
  });

  // 重新加载树并展开 + 激活 + 加载内容
  await loadTreeData(bucketName, expandedPaths, newFolderPath);
  setActivePath(newFolderPath); // 防止 loadTreeData 内部出问题时漏掉
  await loadContent(bucketName, newFolderPath);
}

// 传入新建目录路径，返回所有父路径（含自身）
function getAllParentPaths(fullPath) {
  const parts = fullPath.split('/').filter(Boolean); // ["AA", "bb"]
  const paths = [];
  for (let i = 0; i < parts.length; i++) {
    paths.push(parts.slice(0, i + 1).join('/') + '/');
  }
  return paths; // ["AA/", "AA/bb/"]
}

addRootFolderBtn.addEventListener('click', async () => {
  try {
    const folderName = await openCreateModal('');
    const newFolderPath = folderName + '/';

    const exists = await checkFolderExists(bucketName, newFolderPath);
    if (exists) {
      showToast('目录已存在，请输入不同名称');
      return;
    }

    await minioClient.putObject(bucketName, newFolderPath + '.keep', '');
    showToast('目录创建成功');
    await handleNewFolder(newFolderPath);
  } catch {
    // 用户取消，不做任何事
  }
});

// 弹窗创建函数，返回 Promise，用户确认后 resolve 输入的目录名，取消则 reject
function openCreateModal(basePath) {
  return new Promise((resolve, reject) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display:flex; justify-content:center; align-items:center;';

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const currentDate = `${yyyy}-${mm}-${dd}`;

    modal.innerHTML = `
      <div class="modal">
        <div class="modal-content">
          <h3>新建目录路径</h3>
          <div>
            <input type="text" id="newFolderName" placeholder="请输入目录名称" />
          </div>
          <div class="tags"></div>
          <div class="modal-actions">
            <button id="confirmCreateFolder">新建</button>
            <button id="cancelCreateFolder">取消</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#newFolderName');
    const confirmBtn = modal.querySelector('#confirmCreateFolder');
    const cancelBtn = modal.querySelector('#cancelCreateFolder');
    const tagsContainer = modal.querySelector('.tags');

    // 插入动态日期 tag
    const dateTag = document.createElement('span');
    dateTag.className = 'tag';
    dateTag.dataset.value = currentDate;
    dateTag.textContent = '当前日期';
    tagsContainer.appendChild(dateTag);

    requestAnimationFrame(() => input.focus());

    // tag 点击事件
    dateTag.addEventListener('click', () => {
      input.value += currentDate;
      input.focus();
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      reject('cancel');
    });

    confirmBtn.addEventListener('click', () => {
      const folderName = input.value.trim();
      if (!folderName) {
        showToast('请输入目录名称');
        input.focus();
        return;
      }
      document.body.removeChild(modal);
      resolve(folderName);
    });
  });
}


// ==================== 删除目录 ====================
document.getElementById('deleteFolder').addEventListener('click', async () => {
  if (!currentRightClickPath) return;

  const confirmed = await openConfirmModal(`确定删除目录 ${currentRightClickPath} 吗？`);
  if (!confirmed) return;

  const objectsToDelete = [];
  const stream = minioClient.listObjectsV2(bucketName, currentRightClickPath, true);

  stream.on('data', obj => { objectsToDelete.push({ name: obj.name }); });

  stream.on('end', async () => {
    if (objectsToDelete.length === 0) {
      showToast('目录为空，无需删除。');
      return;
    }

    minioClient.removeObjects(bucketName, objectsToDelete.map(o => o.name), async (err) => {
      if (err) {
        console.error(err);
        showToast('删除失败');
      } else {
        showToast('删除成功');

        // 计算父目录路径
        const parentPath = getParentPath(currentRightClickPath);

        // 保留当前展开路径
        const expandedPaths = getExpandedPaths();
        if (!expandedPaths.includes(parentPath)) expandedPaths.push(parentPath);

        // 重新加载树，展开父目录，active 父目录
        await loadTreeData(bucketName, expandedPaths, parentPath);
        loadContent(bucketName, parentPath);
        
        // fallback：如果 parentPath 是空且树中还有其他项，激活第一个
        if (!parentPath && folderTree.querySelector('.folder-item')) {
          const firstItem = folderTree.querySelector('.folder-item');
          const firstPath = firstItem.dataset.fullPath;
          setActivePath(firstPath);
          loadContent(bucketName, firstPath);
        }
      }
    });
  });

  stream.on('error', err => {
    console.error(err);
    showToast('删除失败');
  });
});

// ==================== 辅助函数：获取父目录路径 ====================
function getParentPath(fullPath) {
  const parts = fullPath.split('/').filter(Boolean);
  if (parts.length <= 1) return ''; // 根目录
  return parts.slice(0, parts.length - 1).join('/') + '/';
}

// ==================== 检查目录是否存在 ====================
async function checkFolderExists(bucket, folderPath) {
  return new Promise((resolve, reject) => {
    const stream = minioClient.listObjectsV2(bucket, folderPath, true);
    let found = false;
    stream.on('data', () => { found = true; });
    stream.on('end', () => { resolve(found); });
    stream.on('error', (err) => reject(err));
  });
}

// ==================== 获取最新的目录 ====================
document.getElementById('refreshFolderBtn').addEventListener('click', async () => {
  try {
    const expanded = getExpandedPaths();
    const active = document.querySelector('.folder-item.active')?.dataset.fullPath || '';
    await loadTreeData(bucketName, expanded, active);
    await loadContent(bucketName, active);
    showToast('目录与内容已刷新');
  } catch (err) {
    console.error('手动刷新失败', err);
  }
});

// 上传模块触发此事件时，自动刷新当前目录树
document.addEventListener('refreshTree', async () => {
  try {
    const expandedPaths = getExpandedPaths();
    const activePath = document.querySelector('.folder-item.active')?.dataset.fullPath || '';
    // 1. 先刷新树
    await loadTreeData(bucketName, expandedPaths, activePath);
    // 2. 再刷新内容区
    await loadContent(bucketName, activePath);
    showToast('目录与内容已刷新');
  } catch (err) {
    console.error('刷新目录/内容失败', err);
  }
});