window.i18nStore = {};
window.activeLang = localStorage.getItem('site_lang') || 'en';

window.setLanguage = async function(lang) {
    if (lang !== 'en' && lang !== 'es') lang = 'en';
    window.activeLang = lang;
    localStorage.setItem('site_lang', lang);
    
    // Toggle active state on UI buttons
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    await fetchI18nData();
    applyI18nToDOM();
    
    // Dispatch custom event to notify other scripts (like script.js) to re-render dynamic content
    document.dispatchEvent(new Event('languageChanged'));
};

async function fetchI18nData() {
    try {
        // Determine root path based on whether we're in /pages/ or /
        const isSubPage = window.location.pathname.includes('/pages/');
        const prefix = isSubPage ? '../' : './';
        const response = await fetch(`${prefix}assets/data/locales/${window.activeLang}.json`);
        window.i18nStore = await response.json();
    } catch (e) {
        console.error('Failed to load i18n data', e);
    }
}

function applyI18nToDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = window.i18nStore[key];
        if (text) {
            // For inputs, replace placeholder
            if (el.tagName === 'INPUT') {
                el.placeholder = text;
            } else {
                // To support icons inside spans, only change innerText nodes or raw html
                // Actually safer to just change the text, but let's strictly replace innerHTML to keep icons if needed
                // If the element has child nodes (like an icon), we might overwrite it. 
                // A better approach is to wrap text in a specific element, but for now we'll do raw innerHTML mapping.
                
                // If it contains an icon, the HTML author should put data-i18n on an inner span.
                el.innerText = text;
            }
        }
    });
}

function t(key) {
    return window.i18nStore[key] || key;
}

document.addEventListener('DOMContentLoaded', () => {
    // Attempt mapping buttons
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.setLanguage(e.target.dataset.lang);
        });
    });

    // Initialize
    window.setLanguage(window.activeLang);
});
