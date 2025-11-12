// pages/files/files.lang.js
const filesLang = {
  zh: {
    // 页面标题
    title: "文件管理",
    
    // 按钮和操作
    logout: "登出",
    back: "返回",
    refresh: "刷新",
    addFolder: "根目录添加，添加子目录请右键目录树",
    uploadImage: "上传图片",
    delete: "删除",
    confirm: "确定",
    cancel: "取消",
    ok: "确定",
    
    // 提示信息
    selectFolder: "请选择左侧目录",
    noBucketSpecified: "未指定存储桶",
    loadTreeFailed: "加载目录树失败",
    configWriteFailed: "写入配置失败",
    cannotLogout: "无法登出",
    
    // 模态框和确认信息
    confirmDelete: "确认删除",
    enterFolderName: "请输入目录名称",
    folderExists: "目录已存在",
    folderCreated: "目录创建成功",
    
    // 工具栏
    showFileName: "显示文件名",
    showDate: "显示创建日期",
    sortTime: "时间顺序",
    imageCount: "图片数量",
    selected: "已选",
    
    // 右键菜单
    createFolder: "新建目录路径",
    deleteFolder: "删除目录路径",
    
    // 状态消息
    refreshSuccess: "目录与内容已刷新",
    manualRefreshFailed: "手动刷新失败",
    deleteSuccess: "删除成功",
    deleteFailed: "删除失败",
    
    // 新建目录弹窗
    newFolderTitle: "新建目录路径",
    currentDate: "当前日期",
    
    // 文件内容区域
    noFilesInDir: "当前目录无缩略图",
    noFiles: "无缩略图",
    supportTip: "仅支持查看图片格式文件，original 与 thumb 的照片将根据操作自动同步"
  },
  en: {
    // 页面标题
    title: "File Management",
    
    // 按钮和操作
    logout: "Logout",
    back: "Back",
    refresh: "Refresh",
    addFolder: "Add root folder, right-click folder tree for subfolders",
    uploadImage: "Upload Image",
    delete: "Delete",
    confirm: "Confirm",
    cancel: "Cancel",
    ok: "OK",
    
    // 提示信息
    selectFolder: "Please select a folder on the left",
    noBucketSpecified: "No bucket specified",
    loadTreeFailed: "Failed to load folder tree",
    configWriteFailed: "Failed to write configuration",
    cannotLogout: "Cannot logout",
    
    // 模态框和确认信息
    confirmDelete: "Confirm deletion of",
    enterFolderName: "Please enter folder name",
    folderExists: "Folder already exists",
    folderCreated: "Folder created successfully",
    
    // 工具栏
    showFileName: "Show filename",
    showDate: "Show creation date",
    sortTime: "Time order",
    imageCount: "Image count",
    selected: "Selected",
    
    // 右键菜单
    createFolder: "Create directory path",
    deleteFolder: "Delete directory path",
    
    // 状态消息
    refreshSuccess: "Directory and content refreshed",
    manualRefreshFailed: "Manual refresh failed",
    deleteSuccess: "Delete successful",
    deleteFailed: "Delete failed",
    
    // 新建目录弹窗
    newFolderTitle: "Create directory path",
    currentDate: "Current date",
    
    // 文件内容区域
    noFilesInDir: "No thumbnails in current directory",
    noFiles: "No thumbnails",
    supportTip: "Only image format files are supported. Original and thumb photos will be automatically synchronized based on operations"
  }
};

// 初始化语言
window.addEventListener("DOMContentLoaded", () => {
  if (window.MMOO_LANG) {
    window.MMOO_LANG.initLang(filesLang);
  }
});

// 翻译函数（供 files.js 和 fileContent.js 使用）
function t(key) {
  const lang = window.MMOO_LANG.getLang();
  return (filesLang[lang] && filesLang[lang][key]) || key;
}