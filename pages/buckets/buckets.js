// pages/buckets/buckets.lang.js
const bucketsLang = {
  zh: {
    title: "存储桶 Buckets",
    logout: "登出",
    bucketList: "存储桶列表",
    notLoggedIn: "未登录，请先登录",
    loadFailed: "加载失败，请检查配置",
    writeConfigFailed: "无法退出：配置文件写入失败。",
  },
  en: {
    title: "Buckets",
    logout: "Logout",
    bucketList: "Bucket List",
    notLoggedIn: "Not logged in. Please log in first.",
    loadFailed: "Failed to load. Please check configuration.",
    writeConfigFailed: "Unable to logout: failed to write configuration file.",
  }
};

// 初始化语言
window.addEventListener("DOMContentLoaded", () => {
  if (window.MMOO_LANG) {
    window.MMOO_LANG.initLang(bucketsLang);
  }
});

// 翻译函数（供 buckets.js 使用）
function t(key) {
  const lang = window.MMOO_LANG.getLang();
  return (bucketsLang[lang] && bucketsLang[lang][key]) || key;
}

const { createMinioClient, loadConfig } = require('../../minioClient');
const fs = require('fs');
const path = require('path');

const { app } = require('electron').remote || require('@electron/remote');
const configPath = path.join(app.getPath('userData'), 'config.json');

const config = loadConfig();
if (!config) {
  // 未登录，跳转
  window.location.href = '../login/login.html';
}

const minioClient = createMinioClient();
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');

// 显示当前登录用户
if (config) {
  userInfo.innerHTML = `<i class="ri-account-circle-fill"></i> ${config.accessKey} @ ${config.endPoint}:${config.port}`;
}

// 登出按钮
logoutBtn.onclick = () => {
  try {
    fs.writeFileSync(configPath, JSON.stringify({}));
    window.location.href = '../login/login.html';
  } catch (err) {
    console.error('写入配置失败', err);
    alert(t('writeConfigFailed'));
  }
};

// 查询桶列表
window.onload = () => {
  const bucketList = document.getElementById('bucketList');

  if (!minioClient) {
    bucketList.innerHTML = `<div>${t('notLoggedIn')}</div>`;
    return;
  }

  minioClient.listBuckets(function (err, buckets) {
    if (err) {
      console.error('Error listing buckets:', err);
      bucketList.innerHTML = `<div>${t('loadFailed')}</div>`;
      return;
    }

    buckets.forEach(bucket => {
      const card = document.createElement('div');
      card.className = 'bucket-card';
      card.innerHTML = `
        <div class="bucket-icon"><i class="ri-folder-5-fill"></i></div>
        <div class="bucket-name">${bucket.name}</div>
        <div class="bucket-date">${new Date(bucket.creationDate).toLocaleString()}</div>
      `;

      card.addEventListener('click', () => {
        window.location.href = `../files/files.html?bucket=${bucket.name}`;
      });

      bucketList.appendChild(card);
    });
  });
};