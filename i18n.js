// src/lib/i18n.js
// Translation & Language management system

const SUPPORTED_LANGS = ['ar', 'en', 'tl', 'hi'];
const RTL_LANGS = ['ar'];
const LANG_NAMES = {
  ar: 'العربية',
  en: 'English',
  tl: 'Tagalog',
  hi: 'हिंदी'
};
const LANG_FLAGS = {
  ar: '🇸🇦',
  en: '🇺🇸',
  tl: '🇵🇭',
  hi: '🇮🇳'
};

let currentLang = localStorage.getItem('gym_lang') || 'ar';
let translations = {};

async function loadTranslations(lang) {
  try {
    const response = await fetch(`/i18n/${lang}.json`);
    if (!response.ok) throw new Error(`Failed to load ${lang}`);
    translations = await response.json();
  } catch (err) {
    console.error('Failed to load translations:', err);
    // Fallback to embedded minimal translations
    translations = {};
  }
}

async function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem('gym_lang', lang);
  await loadTranslations(lang);
  applyDirection();
  // Dispatch event so app can re-render
  window.dispatchEvent(new CustomEvent('langChange', { detail: { lang } }));
}

function applyDirection() {
  const isRTL = RTL_LANGS.includes(currentLang);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = currentLang;
  document.body.classList.toggle('rtl', isRTL);
  document.body.classList.toggle('ltr', !isRTL);
}

// Get translation by dot-notation key: t('nav.dashboard')
function t(key) {
  const keys = key.split('.');
  let val = translations;
  for (const k of keys) {
    if (val && typeof val === 'object' && k in val) {
      val = val[k];
    } else {
      return key; // fallback: return key itself
    }
  }
  return val || key;
}

function getCurrentLang() {
  return currentLang;
}

function isRTL() {
  return RTL_LANGS.includes(currentLang);
}

async function initI18n() {
  await loadTranslations(currentLang);
  applyDirection();
}

export {
  SUPPORTED_LANGS, RTL_LANGS, LANG_NAMES, LANG_FLAGS,
  setLanguage, t, getCurrentLang, isRTL, initI18n
};
