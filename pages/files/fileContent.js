// fileContent.js

const filesLang = {
  zh: {
    NoFolders: "尚未选择任何文件夹",
    SelectedFolder: "已选择文件夹",
    Quantity: "数量",
    PleaseSelect: "请选择要上传的图片",
    noFiles: "无缩略图",
    selected: "已选",
    PleaseDragPicture: "请拖拽图片",
    Uploading: '正在上传',
    UploadFailed: '上传失败',
    UploadCompleted: '上传完成',
    PleaseSelectPictureFirst: '请先选择图片',
    ConfirmDeletionQuantity: '确认删除, 数量:',
    selectFolder: "请选择目录",
    confirm: "确定",
    cancel: "取消",

    DeletedSuccessfully: "删除成功",
    DeletionFailed: "删除失败",
    SizeLoading: ", 尺寸加载中...",
    Time: "时间",
    Thumbnail: "缩略图",
    OriginalImage: "原图",
    watermarkImage: "水印图",
    ViewOriginalImage: "查看原图",
    currentDirectoryNull: "当前目录无缩略图",
    Not: "无",
  },
  en: {
    NoFolders: "No folders have been selected yet",
    SelectedFolder: "Selected folder",
    Quantity: "Quantity",
    PleaseSelect: "Please select the picture you want to upload",
    noFiles: "No thumbnails",
    selected: "Selected",
    PleaseDragPicture: "Please drag the picture",
    Uploading: 'Uploading',
    UploadFailed: 'Upload failed',
    UploadCompleted: 'Upload completed',
    PleaseSelectPictureFirst: 'Please select the picture first',
    ConfirmDeletionQuantity: 'Confirm deletion. Quantity:',
    selectFolder: "Please select a folder",
    confirm: "Confirm",
    cancel: "Cancel",

    DeletedSuccessfully: "Deleted successfully",
    DeletionFailed: "Deletion failed",
    SizeLoading: ", Size loading...",
    Time: "Time",
    Thumbnail: "Thumbnail",
    OriginalImage: "Original",
    watermarkImage: "Watermark",
    ViewOriginalImage: "View the original image",
    currentDirectoryNull: "There are no thumbnails in the current directory",
    Not: "Not",
  }
};

window.addEventListener("DOMContentLoaded", () => {
  if (window.MMOO_LANG) {
    window.MMOO_LANG.initLang(filesLang);
  }
});

function t(key) {
  const lang = window.MMOO_LANG.getLang();
  return (filesLang[lang] && filesLang[lang][key]) || key;
}

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

// 监听工具栏宽度变化
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
function createThumbnail(file, maxSize) {
  return new Promise((resolve, reject) => {
    // 如果没传 maxSize，则从 localStorage 读取，默认 480
    const size = maxSize || parseInt(localStorage.getItem('thumbnailMaxSize'), 10) || 480;

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;

      if (width > height && width > size) {
        height *= size / width;
        width = size;
      } else if (height >= width && height > size) {
        width *= size / height;
        height = size;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('缩略图失败'))),
        'image/jpeg',
        0.75
      );

      URL.revokeObjectURL(url);
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}

// 生成水印图
function createWatermarkedImage(file) {
  return new Promise((resolve, reject) => {

    const maxSize = parseInt(localStorage.getItem('watermarkMaxSize'), 10) || 1200;
    const watermarkImage = localStorage.getItem('watermarkImage');

    const percentage = parseInt(localStorage.getItem('percentage'), 10) || 4;
    const transparency = parseInt(localStorage.getItem('transparency'), 10) || 80;

    if (!watermarkImage) {
      reject(new Error('没有设置水印图片'));
      return;
    }

    const img = new Image();
    const watermark = new Image();

    const url = URL.createObjectURL(file);

    img.onload = () => {

      let { width, height } = img;

      if (width > height && width > maxSize) {
        height *= maxSize / width;
        width = maxSize;
      } else if (height >= width && height > maxSize) {
        width *= maxSize / height;
        height = maxSize;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');

      // 先画原图
      ctx.drawImage(img, 0, 0, width, height);

      watermark.onload = () => {

        const wmWidth = width / percentage;
        const scale = wmWidth / watermark.width;
        const wmHeight = watermark.height * scale;

        ctx.globalAlpha = transparency / 100;

        ctx.drawImage(
          watermark,
          0,
          0,
          wmWidth,
          wmHeight
        );

        ctx.globalAlpha = 1;

        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('水印图生成失败')),
          'image/jpeg',
          0.9
        );

        URL.revokeObjectURL(url);
      };

      watermark.onerror = reject;
      watermark.src = watermarkImage;
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

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
  showToast(selectedFiles.length?`${t("selected")}: ${selectedFiles.length}`: t("PleaseDragPicture"));
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
  document.getElementById('fileInfo').textContent = t("NoFolders");
  dropArea.style.display = 'flex';

  uploadModal.style.display = 'flex';
}

function closeUploadDialog(){ uploadModal.style.display='none'; selectedFiles=[]; }
document.getElementById('uploadCancelBtn').onclick = closeUploadDialog;

// upload finish
uploadFinishBtn.onclick = closeUploadDialog;

// 获取文件 MIME
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
    fileInfo.textContent = `${t("SelectedFolder")}：${folderName}，${t("Quantity")}：${fileInput.files.length}`;
  } else {
    fileInfo.textContent = t("NoFolders");
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
    showToast(t("PleaseSelect"));
    return;
  }

  // 隐藏文件选择区域
  dropArea.style.display = 'none';
  document.getElementById('fileSelectBox').style.display = 'none';
  document.getElementById('uploadActionButtons').style.display = 'none';

  const prog = document.getElementById('uploadProgress');
  prog.style.display = 'block';
  prog.innerHTML = `${t("Uploading")} (0 / ${files.length})`;

  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    prog.innerHTML  = `${t("Uploading")} (${successCount + 1} / ${files.length})`;

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

      // 生成并上传水印图
      const wb = await createWatermarkedImage(f);
      const wbuf = Buffer.from(await wb.arrayBuffer());

      const watermarkPrefix = uploadPrefix.replace(/original\/?$/, 'watermark/');

      await minioClient.putObject(uploadBucket, watermarkPrefix + f.name, wbuf, wbuf.length, {
          'content-type': mime
        }
      );

      successCount++;

    } catch (e) {
      console.error(e);
      showToast(`${t("UploadFailed")}: ${f.name}`, 4000);
    }
  }

  prog.textContent = `✅ ${t("UploadCompleted")}: ${successCount} / ${files.length}`;
  document.getElementById('uploadFinishBox').style.display = 'block';

  // 通知刷新图片区域
  document.dispatchEvent(new Event('refreshTree'));

  // 自动关闭弹窗
  setTimeout(() => {
    closeUploadDialog();
  }, 800);
}

let uploadBound = false;

// 绑定上传确认按钮
function initUploadConfirmEvent(){ 
  uploadConfirmBtn.onclick = handleUploadConfirmClick;
}

// 确认弹窗
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

    // 多语言支持
    confirmOkBtn.textContent = t("confirm");
    confirmCancelBtn.textContent = t("cancel");

    confirmOkBtn.addEventListener('click', onOk);
    confirmCancelBtn.addEventListener('click', onCancel);
  });
}

// 计数
function updateImageCount(c){ if(imageCountSpan) imageCountSpan.textContent=c; }

// 排序切换
if(sortToggle){ sortToggle.style.cursor='pointer'; sortToggle.onclick=()=>{ sortAsc=!sortAsc; const ic=sortToggle.querySelector('i'); ic.className=sortAsc?'ri-sort-asc':'ri-sort-desc'; renderImageGrid(); }; }

// 多选删除
if(deleteBtn){ deleteBtn.onclick=async()=>{
  if(!selectedThumbs.size){showToast(t("PleaseSelectPictureFirst"));return;}
  const confirmed = await openConfirmModal(`${t("ConfirmDeletionQuantity")} ${selectedThumbs.size}`);
  if (!confirmed) return;
  const toDel=[];
  selectedThumbs.forEach(name => {
    // 去掉末尾 thumb/ 或 original/ 得到 base 路径
    const basePrefix = currentPrefix.replace(/(thumb|original)\/?$/, '');
  
    const thumbPath = basePrefix + 'thumb/' + name;
    const originalPath = basePrefix + 'original/' + name;
  
    toDel.push(thumbPath);
    toDel.push(originalPath);
  });
  try{ await minioClient.removeObjects(currentBucket,toDel); showToast(t("DeletedSuccessfully")); selectedThumbs.clear(); await loadContent(currentBucket,currentPrefix); 

  } catch(e){
    console.error(e);showToast(t("DeletionFailed"));
  }}; 

  setTimeout(() => {
    updateImageCount(cachedItems.length);
  }, 1000);
}

// 图片预览
async function previewImage(itemName) {

  const basePrefix = currentPrefix.replace(/thumb\/?$/, '');
  const thumbPath = basePrefix + 'thumb/' + itemName;
  const originalPath = basePrefix + 'original/' + itemName;
  const watermarkPath = basePrefix + 'watermark/' + itemName;

  const thumbUrl = `http://${config.endPoint}:${config.port}/${currentBucket}/${thumbPath}`;
  const originalUrl = `http://${config.endPoint}:${config.port}/${currentBucket}/${originalPath}`;
  const watermarkUrl = `http://${config.endPoint}:${config.port}/${currentBucket}/${watermarkPath}`;

  const img = document.getElementById('previewImage');

  const viewer = document.getElementById('imagePreviewer');
  viewer.style.display = 'flex';

  document.getElementById('infoFilename').textContent = `${itemName}`;

  const thumbBox = document.querySelector('.infoThumbBox');
  const originalBox = document.querySelector('.infoOriginalBox');
  const watermarkBox = document.querySelector('.infoWatermarkBox');

  const setActive = (box) => {
    thumbBox.classList.remove('infoActive');
    originalBox.classList.remove('infoActive');
    watermarkBox.classList.remove('infoActive');
    box.classList.add('infoActive');
  };

  // 默认显示原图
  img.src = originalUrl;
  setActive(originalBox);

  // 初始化
  document.getElementById('infoThumbDim').textContent = t("SizeLoading");
  document.getElementById('infoOriginalDim').textContent = t("SizeLoading");
  document.getElementById('infoWatermarkDim').textContent = t("SizeLoading");

  try {

    const [thumbStat, originalStat] = await Promise.all([
      minioClient.statObject(currentBucket, thumbPath),
      minioClient.statObject(currentBucket, originalPath)
    ]);

    document.getElementById('infoTime').innerHTML =
      `${new Date(originalStat.lastModified).toLocaleString()}`;

    document.getElementById('infoThumbSize').innerHTML =
      `<i class="ri-file-image-fill"></i> ${t("Thumbnail")}：${(thumbStat.size / 1024).toFixed(1)} KB`;

    document.getElementById('infoOriginalSize').innerHTML =
      `<i class="ri-file-image-fill"></i> ${t("OriginalImage")}：${(originalStat.size / 1024).toFixed(1)} KB`;

  } catch (err) {
    console.error('获取文件信息失败:', err);
  }

  // watermark 可能不存在
  let watermarkExists = true;

  try {

    const watermarkStat = await minioClient.statObject(currentBucket, watermarkPath);

    document.getElementById('infoWatermarkSize').innerHTML =
      `<i class="ri-file-image-fill"></i> ${t("watermarkImage")}：${(watermarkStat.size / 1024).toFixed(1)} KB`;

    const watermarkImg = new Image();
    watermarkImg.src = watermarkUrl;

    watermarkImg.onload = () => {
      document.getElementById('infoWatermarkDim').textContent =
        `, ${watermarkImg.width} × ${watermarkImg.height}`;
    };

  } catch (err) {

    watermarkExists = false;

    document.getElementById('infoWatermarkSize').innerHTML =
      `<i class="ri-file-image-fill"></i> ${t("watermarkImage")}：${t("Not")}`;

    document.getElementById('infoWatermarkDim').textContent = '';

  }

  // 尺寸读取
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

  // 点击切换
  thumbBox.onclick = () => {
    img.src = thumbUrl;
    setActive(thumbBox);
  };

  originalBox.onclick = () => {
    img.src = originalUrl;
    setActive(originalBox);
  };

  watermarkBox.onclick = () => {

    if (!watermarkExists) return;

    img.src = watermarkUrl;
    setActive(watermarkBox);
  };
}



// 关闭图片预览
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
  magnifier.title = t('ViewOriginalImage');
  magnifier.onclick = e => {
    e.stopPropagation();
    // let basePrefix = currentPrefix.replace(/thumb\/?$/, 'original/');
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
  if(!cachedItems.length){ body.innerHTML=`<div class="no-files">${t("currentDirectoryNull")}</div>`; updateImageCount(0); return; }
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

// 初始化切换监听器
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
    document.querySelector('.content-title').textContent = t("selectFolder");
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
    document.querySelector('.content-body').innerHTML = `<div class="no-files">${t("noFiles")}</div>`;
    updateImageCount(0)
    currentPrefix = displayPath;
    updateToolbarVisibility(true);
  }

  const up = document.getElementById('uploadBtn');
  const basePrefix = p.replace(/(thumb|original)\/?$/, '');
  up.onclick = () => openUploadDialog(bucket, basePrefix + 'original/');
}


// 更新选中数量
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