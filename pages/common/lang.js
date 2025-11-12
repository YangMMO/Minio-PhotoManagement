// pages/common/lang.js
function t(key) {
  const lang = window.MMOO_LANG.getLang();
  return (loginLang[lang] && loginLang[lang][key]) || key;
}

(() => {
  const DEFAULT_LANG = "zh";

  // 读取语言
  function getLang() {
    return localStorage.getItem("lang") || DEFAULT_LANG;
  }

  // 设置语言并通知所有页面
  function setLang(lang) {
    localStorage.setItem("lang", lang);
    window.dispatchEvent(new CustomEvent("langChange", { detail: lang }));
  }

  // 应用语言字典
  function applyLang(dictionary) {
    const lang = getLang();
    const t = dictionary[lang];
    if (!t) return;

    // 方式一：自动根据 data-i18n 属性替换文本
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (t[key] !== undefined) el.textContent = t[key];
    });

    // 方式二（可选）：对 placeholder、title 等特殊属性处理
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (t[key] !== undefined) el.placeholder = t[key];
    });
  }

  // 页面初始化时自动应用当前语言
  function initLang(dictionary, toggleSelector = "#langToggle") {
    applyLang(dictionary);

    // 自动更新按钮文字
    const langToggle = document.querySelector(toggleSelector);
    if (langToggle) {
      const currentLang = getLang();
      langToggle.textContent = currentLang === "zh" ? "EN" : "中文";

      langToggle.addEventListener("click", () => {
        const next = getLang() === "zh" ? "en" : "zh";
        setLang(next);
        langToggle.textContent = next === "zh" ? "EN" : "中文";
      });
    }

    // 监听全局语言变化
    window.addEventListener("langChange", e => {
      applyLang(dictionary);
      const current = e.detail;
      if (langToggle) langToggle.textContent = current === "zh" ? "EN" : "中文";
    });
  }

  // 挂载到 window，方便所有页面调用
  window.MMOO_LANG = { getLang, setLang, applyLang, initLang };
})();
