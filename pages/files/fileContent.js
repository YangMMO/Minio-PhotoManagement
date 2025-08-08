// fileContent.js
const { createMinioClient, loadConfig } = require('../../minioClient');

const config = loadConfig();
if (!config) {
  window.location.href = '../login/login.html';
}

const minioClient = createMinioClient();

// DOM 元素
const imageCountSpan = document.getElementById('imageCount');
const toggleFileName = document.getElementById('toggleFileName');
const toggleDate = document.getElementById('toggleDate');
const sortToggle = document.getElementById('sortToggle');
const deleteBtn = document.getElementById('deleteBtn');

// 上传弹窗元素
const uploadModal = document.getElementById('uploadModal');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const uploadConfirmBtn = document.getElementById('uploadConfirmBtn');
const uploadCancelBtn = document.getElementById('uploadCancelBtn');
const dropArea = document.getElementById('dropArea');
const toast = document.getElementById('toast');
const uploadFinishBtn = document.getElementById('uploadFinishBtn');


// 状态
let currentBucket = null;
let currentPrefix = null;
let cachedItems = [];
let selectedFiles = [];
let selectedThumbs = new Set(); // 当前页已选缩略图文件名集合
let sortAsc = true;     // 正序/倒序


const contentBody = document.querySelector('.content-body');
const contentToolbar = document.querySelector('.content-toolbar');

function updateToolbarLayout(entry) {
  const width = entry.contentRect.width;
  if (width < 800) {
    contentToolbar.classList.add('toolbar-vertical');
  } else {
    contentToolbar.classList.remove('toolbar-vertical');
  }
}

const observer = new ResizeObserver((entries) => {
  for (let entry of entries) {
    updateToolbarLayout(entry);
  }
});

if (contentBody && contentToolbar) {
  observer.observe(contentBody);
}

// 工具栏显示控制
function updateToolbarVisibility(hasThumb) {
  const toolbar = document.getElementById('content-toolbar');
  toolbar.style.display = hasThumb ? 'flex' : 'none';
}

// toast 提示
function showToast(msg, duration = 3000) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// 文件转 Buffer
function fileToBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(Buffer.from(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 缩略图生成
function createThumbnail(file, maxSize = 480) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSize) { height *= maxSize/width; width = maxSize; }
      else if (height >= width && height > maxSize) { width *= maxSize/height; height = maxSize; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img,0,0,width,height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('缩略图失败')), 'image/jpeg', 0.75);
      URL.revokeObjectURL(url);
    };
    img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// 判断图片
function isImageFile(name) {
  return ['.jpg','.jpeg','.png','.gif','.bmp','.webp'].some(ext=> name.toLowerCase().endsWith(ext));
}

// 拖拽遍历
async function traverseFileTree(item, path='') {
  return new Promise(resolve => {
    if (item.isFile) item.file(f=>{ f.relativePath = path+f.name; resolve([f]); });
    else if (item.isDirectory) {
      const reader = item.createReader(); let files=[];
      const read = ()=> reader.readEntries(async ents=>{
        if (!ents.length) resolve(files);
        else { for(const e of ents) files=(await traverseFileTree(e, path+item.name+'/')).concat(files); read(); }
      });
      read();
    } else resolve([]);
  });
}

dropArea.addEventListener('dragover',e=>{e.preventDefault(); dropArea.classList.add('dragover');});
dropArea.addEventListener('dragleave',e=>{e.preventDefault(); dropArea.classList.remove('dragover');});
dropArea.addEventListener('drop',async e=>{
  e.preventDefault(); dropArea.classList.remove('dragover');
  let all=[];
  for(const it of e.dataTransfer.items) {
    const entry = it.webkitGetAsEntry?.(); if (!entry) continue;
    all = all.concat(await traverseFileTree(entry));
  }
  selectedFiles = all.filter(f=>isImageFile(f.name));
  showToast(selectedFiles.length?`选中 ${selectedFiles.length} 张`:'请拖拽图片');
  fileInput.value='';
});

// 上传弹窗
function openUploadDialog(b, p) {
  selectedFiles = [];
  uploadBucket = b;
  uploadPrefix = p;
  fileInput.value = '';

  // ✅ 状态重置
  document.getElementById('fileSelectBox').style.display = 'block';
  document.getElementById('uploadActionButtons').style.display = 'flex';
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('uploadFinishBox').style.display = 'none';
  document.getElementById('fileInfo').textContent = '尚未选择任何文件夹';
  dropArea.style.display = 'flex';

  uploadModal.style.display = 'flex';
}

function closeUploadDialog(){ uploadModal.style.display='none'; selectedFiles=[]; }
document.getElementById('uploadCancelBtn').onclick = closeUploadDialog;

// upload finish
uploadFinishBtn.onclick = closeUploadDialog;

function getMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'bmp': return 'image/bmp';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    const firstPath = fileInput.files[0].webkitRelativePath;
    const folderName = firstPath.split('/')[0];
    fileInfo.textContent = `已选择文件夹：${folderName}，共 ${fileInput.files.length} 个文件`;
  } else {
    fileInfo.textContent = '尚未选择任何文件夹';
  }
});

// 绑定上传
async function handleUploadConfirmClick() {
  if (!uploadBucket || !uploadPrefix) return;

  // 获取文件：已选择（selectedFiles）优先，否则 fileInput 选中项
  const files = selectedFiles.length
    ? selectedFiles
    : Array.from(fileInput.files);

  if (!files.length) {
    showToast('请选择要上传的图片');
    return;
  }

  // 隐藏文件选择区域
  dropArea.style.display = 'none';
  document.getElementById('fileSelectBox').style.display = 'none';
  document.getElementById('uploadActionButtons').style.display = 'none';

  const prog = document.getElementById('uploadProgress');
  prog.style.display = 'block';
  prog.innerHTML = `正在上传 (0 / ${files.length})`;

  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    prog.innerHTML  = `正在上传 (${successCount + 1} / ${files.length})`;

    try {
      const buf = await fileToBuffer(f);
      const mime = getMimeType(f.name);

      // 上传原图
      await minioClient.putObject(uploadBucket, uploadPrefix + f.name, buf, buf.length, {
        'content-type': mime
      });

      // 生成并上传缩略图
      const tb = await createThumbnail(f);
      const tbuf = Buffer.from(await tb.arrayBuffer());
      const thumbPrefix = uploadPrefix.replace(/original\/?$/, 'thumb/');
      await minioClient.putObject(uploadBucket, thumbPrefix + f.name, tbuf, tbuf.length, {
        'content-type': mime
      });

      successCount++;

    } catch (e) {
      console.error(e);
      showToast(`上传失败: ${f.name}`, 4000);
    }
  }

  prog.textContent = `✅ 上传完成：${successCount} / ${files.length} 张`;
  document.getElementById('uploadFinishBox').style.display = 'block';

  // 通知刷新图片区域
  document.dispatchEvent(new Event('refreshTree'));

  // 自动关闭弹窗
  setTimeout(() => {
    closeUploadDialog();
  }, 800);
}

let uploadBound = false;

function initUploadConfirmEvent(){ 
  uploadConfirmBtn.onclick = handleUploadConfirmClick;
}

// 计数
function updateImageCount(c){ if(imageCountSpan) imageCountSpan.textContent=c; }

// 排序切换
if(sortToggle){ sortToggle.style.cursor='pointer'; sortToggle.onclick=()=>{ sortAsc=!sortAsc; const ic=sortToggle.querySelector('i'); ic.className=sortAsc?'ri-sort-asc':'ri-sort-desc'; renderImageGrid(); }; }

// 多选删除
if(deleteBtn){ deleteBtn.onclick=async()=>{
  if(!selectedThumbs.size){showToast('请先选择图片');return;}
  if(!confirm(`确认删除 ${selectedThumbs.size} 张?`)) return;
  const toDel=[];
  selectedThumbs.forEach(name => {
    // 去掉末尾 thumb/ 或 original/ 得到 base 路径
    const basePrefix = currentPrefix.replace(/(thumb|original)\/?$/, '');
  
    const thumbPath = basePrefix + 'thumb/' + name;
    const originalPath = basePrefix + 'original/' + name;
  
    toDel.push(thumbPath);
    toDel.push(originalPath);
  });
  try{ await minioClient.removeObjects(currentBucket,toDel); showToast('删除成功'); selectedThumbs.clear(); await loadContent(currentBucket,currentPrefix); 

  } catch(e){
    console.error(e);showToast('删除失败');
  }}; 

  setTimeout(() => {
    updateImageCount(cachedItems.length);
  }, 1000);
}

async function previewImage(itemName) {
  const basePrefix = currentPrefix.replace(/thumb\/?$/, '');
  const thumbPath = basePrefix + 'thumb/' + itemName;
  const originalPath = basePrefix + 'original/' + itemName;

  const thumbUrl = `http://${config.endPoint}:${config.port}/${currentBucket}/${thumbPath}`;
  const originalUrl = `http://${config.endPoint}:${config.port}/${currentBucket}/${originalPath}`;

  // 显示图片
  const img = document.getElementById('previewImage');
  img.src = originalUrl;

  // 展示弹窗
  const viewer = document.getElementById('imagePreviewer');
  viewer.style.display = 'flex';

  // 文件名
  document.getElementById('infoFilename').textContent = `${itemName}`;

  // 设置尺寸信息初始为加载中
  document.getElementById('infoThumbDim').textContent = ', 尺寸加载中...';
  document.getElementById('infoOriginalDim').textContent = ', 尺寸加载中...';

  try {
    const [thumbStat, originalStat] = await Promise.all([
      minioClient.statObject(currentBucket, thumbPath),
      minioClient.statObject(currentBucket, originalPath)
    ]);

    // 上传时间来自 original
    document.getElementById('infoTime').innerHTML =
      `<i class="ri-time-fill"></i> 时间：${new Date(originalStat.lastModified).toLocaleString()}`;

    document.getElementById('infoThumbSize').innerHTML =
      `<i class="ri-file-image-fill"></i> 缩略图：${(thumbStat.size / 1024).toFixed(1)} KB`;

    document.getElementById('infoOriginalSize').innerHTML =
      `<i class="ri-file-image-fill"></i> 原图：${(originalStat.size / 1024).toFixed(1)} KB`;
  } catch (err) {
    console.error('获取文件信息失败:', err);
  }

  // 获取尺寸（使用 Image 对象）
  const thumbImg = new Image();
  thumbImg.src = thumbUrl;
  thumbImg.onload = () => {
    document.getElementById('infoThumbDim').textContent =
      `, ${thumbImg.width} × ${thumbImg.height}`;
  };

  const origImg = new Image();
  origImg.src = originalUrl;
  origImg.onload = () => {
    document.getElementById('infoOriginalDim').textContent =
      `, ${origImg.width} × ${origImg.height}`;
  };
}

function closeImagePreview() {
  document.getElementById('imagePreviewer').style.display = 'none';
}

window.closeImagePreview = closeImagePreview;

// 卡片渲染
function createImageCard(item, fn, dt) {
  const card = document.createElement('div');
  card.className = 'image-card';
  if (selectedThumbs.has(item.name)) card.classList.add('selected');

  const img = document.createElement('img');
  img.src = item.url;
  img.alt = item.name;
  card.append(img);

  // ✅ 添加右上角的“放大镜”查看原图按钮
  const magnifier = document.createElement('i');
  magnifier.className = 'ri-search-line magnifier-icon';
  magnifier.title = '查看原图';
  magnifier.onclick = e => {
    e.stopPropagation();
    let basePrefix = currentPrefix.replace(/thumb\/?$/, 'original/');
    previewImage(item.name);
  };
  card.append(magnifier);

  // ✅ 可选信息：文件名 & 日期
  if (fn || dt) {
    const info = document.createElement('div');
    info.className = 'image-info';
    if (fn) {
      const n = document.createElement('div');
      n.textContent = item.name;
      info.append(n);
    }
    if (dt) {
      const d = document.createElement('div');
      d.textContent = new Date(item.modified).toLocaleString();
      d.className = 'image-date';
      info.append(d);
    }
    card.append(info);
  }

  // 点击切换选中
  card.addEventListener('click', e => {
    e.stopPropagation();
    if (selectedThumbs.has(item.name)) {
      selectedThumbs.delete(item.name);
      card.classList.remove('selected');
    } else {
      selectedThumbs.add(item.name);
      card.classList.add('selected');
    }

    updateSelectedCount();

    const selAllCb = document.querySelector('#selectDate input');
    if (selAllCb) {
      const allCards = document.querySelectorAll('.image-card');
      const selectedCards = document.querySelectorAll('.image-card.selected');
      selAllCb.checked = (allCards.length === selectedCards.length);
    }
  });

  return card;
}


// 渲染格子
function renderImageGrid(){
  const body=document.querySelector('.content-body'); body.innerHTML='';
  if(!cachedItems.length){ body.innerHTML='<div class="no-files">当前目录无缩略图</div>'; updateImageCount(0); return; }
  // 排序
  cachedItems.sort((a,b)=> sortAsc? new Date(a.modified)-new Date(b.modified) : new Date(b.modified)-new Date(a.modified));
  const grid=document.createElement('div'); grid.className='image-grid';
  const fn=toggleFileName.checked, dt=toggleDate.checked;
  cachedItems.forEach(it=> grid.append(createImageCard(it,fn,dt)));
  body.append(grid); updateImageCount(cachedItems.length);
  // 全选逻辑
  const cb=document.querySelector('#selectDate input'); if(cb){ cb.checked=false; cb.onchange=()=>{
    if(cb.checked) cachedItems.forEach(it=>selectedThumbs.add(it.name)); else selectedThumbs.clear();
    document.querySelectorAll('.image-card').forEach(card=>{
      const n=card.querySelector('img').alt;
      card.classList.toggle('selected', selectedThumbs.has(n));
    });
    updateSelectedCount();
  }};
}

function initToggleListeners(){ toggleFileName.addEventListener('change',renderImageGrid); toggleDate.addEventListener('change',renderImageGrid); }

// 加载缩略图
async function loadThumbImages(bucket, prefix) {
  currentBucket = bucket;
  currentPrefix = prefix;
  const title = document.querySelector('.content-title');
  title.textContent = prefix;
  cachedItems = [];
  updateImageCount(0);

  return new Promise(res => {
    const stream = minioClient.listObjectsV2(bucket, prefix, false);
    stream.on('data', o => {
      if (o.name.endsWith('/.keep')) return;
    
      const name = o.name.slice(prefix.length);
      if (!name || name.includes('/') || !isImageFile(name)) return;
    
      // ✅ 防止重复添加
      if (cachedItems.find(item => item.name === name)) return;
    
      cachedItems.push({
        name,
        modified: o.lastModified,
        url: `http://${config.endPoint}:${config.port}/${bucket}/${prefix}${encodeURIComponent(name)}`
      });
    });
    stream.on('end', () => {
      // ✅ 强制按 name 去重
      const seen = new Set();
      cachedItems = cachedItems.filter(item => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      });
    
      renderImageGrid();
      res(true);
    });
    stream.on('error', e => {
      console.error('loadThumbImages error:', e);
      res(false);
    });
  });
}


// 主加载
async function loadContent(bucket, prefix) {
  if (!bucket) return;
  selectedThumbs.clear();
  updateSelectedCount();
  const selAllCb = document.querySelector('#selectDate input');
  if (selAllCb) selAllCb.checked = false;
  if (!prefix) {
    document.querySelector('.content-title').textContent = '请选择目录';
    document.querySelector('.content-body').innerHTML = '';
    updateToolbarVisibility(false);
    return;
  }
  const p = prefix.endsWith('/') ? prefix : prefix + '/';

  let displayPath = p;
  if (!/\/(thumb|original)\/$/.test(p)) {
    displayPath = p + 'thumb/';
  }

  let has = false;
  await new Promise(r => {
    const s = minioClient.listObjectsV2(bucket, displayPath, false);
    s.on('data', o => {
      if (o.name && !o.name.endsWith('/.keep')) has = true;
    });
    s.on('end', r);
    s.on('error', e => {
      console.error('listObjectsV2 error:', e);
      r();
    });
  });

  updateToolbarVisibility(has);
  document.querySelector('.content-title').textContent = displayPath;

  if (has) {
    currentPrefix = displayPath;
    await loadThumbImages(bucket, displayPath);
  } else {
    document.querySelector('.content-body').innerHTML = '<div class="no-files">无缩略图</div>';
    updateImageCount(0)
    currentPrefix = displayPath;
    updateToolbarVisibility(true);
  }

  const up = document.getElementById('uploadBtn');
  const basePrefix = p.replace(/(thumb|original)\/?$/, '');
  up.onclick = () => openUploadDialog(bucket, basePrefix + 'original/');
}




function updateSelectedCount() {
  const selectedCountSpan = document.querySelector('#selectDate span');
  if (selectedCountSpan) {
    selectedCountSpan.textContent = selectedThumbs.size;
  }
}

initToggleListeners(); 
initUploadConfirmEvent();
module.exports = { loadContent };


// 框选逻辑
(function enableBoxSelect() {
  const container = document.querySelector('.content-body');
  const box = document.getElementById('selectionBox');
  let startX = 0, startY = 0, selecting = false;

  container.addEventListener('mousedown', (e) => {
    processedNames = new Set();
    if (e.button !== 0 || e.target.closest('.image-card')) return;
    e.preventDefault();
    startX = e.pageX;
    startY = e.pageY;
    selecting = true;
    box.style.left = startX + 'px';
    box.style.top = startY + 'px';
    box.style.width = '0px';
    box.style.height = '0px';
    box.style.display = 'block';
  });

  let processedNames = new Set();

  document.addEventListener('mousemove', (e) => {
    if (!selecting) return;
  
    const containerRect = container.getBoundingClientRect();
  
    let currX = Math.min(Math.max(e.pageX, containerRect.left), containerRect.right);
    let currY = Math.min(Math.max(e.pageY, containerRect.top), containerRect.bottom);
  
    const x = Math.min(currX, startX);
    const y = Math.min(currY, startY);
    const w = Math.abs(currX - startX);
    const h = Math.abs(currY - startY);
  
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
  
    const rect = box.getBoundingClientRect();
    document.querySelectorAll('.image-card').forEach(card => {
      const cRect = card.getBoundingClientRect();
      const name = card.querySelector('img').alt;
      const inBox = !(cRect.right < rect.left || cRect.left > rect.right || cRect.bottom < rect.top || cRect.top > rect.bottom);
  
      if (inBox && !processedNames.has(name)) {
        processedNames.add(name); // ✅ 避免重复处理
  
        if (selectedThumbs.has(name)) {
          selectedThumbs.delete(name);
          card.classList.remove('selected');
        } else {
          selectedThumbs.add(name);
          card.classList.add('selected');
        }
      }
    });
  
    updateSelectedCount();
  });
  

  document.addEventListener('mouseup', () => {
    processedNames.clear();
    if (!selecting) return;
    selecting = false;
    box.style.display = 'none';

    // 自动更新全选 checkbox 状态
    const selAllCb = document.querySelector('#selectDate input');
    if (selAllCb) {
      const allCards = document.querySelectorAll('.image-card');
      const selectedCards = document.querySelectorAll('.image-card.selected');
      selAllCb.checked = (allCards.length === selectedCards.length);
    }
  });
})();