/* Shared site code: language, icons, header/footer and the static info pages.
 * Every page sets <html data-root="..."> to the path of the site root ("" or "../"). */
(() => {
    const ROOT = document.documentElement.dataset.root || '';
    const LANGS = ['en', 'es'];
    const SOCIALS = [
        { name: 'X (Twitter)', url: 'https://x.com/SirGary_y', icon: 'twitter' },
        { name: 'YouTube', url: 'https://www.youtube.com/@SirGary', icon: 'youtube' },
        { name: 'Twitch', url: 'https://www.twitch.tv/sirgary_twitch', icon: 'twitch' },
        { name: 'Discord', url: 'https://discord.gg/Sc4HSmn', icon: 'discord' }
    ];
    const EMAIL = 'sir.garyp@gmail.com';
    const PAGES = [
        { key: 'about', icon: 'info' },
        { key: 'faq', icon: 'help' },
        { key: 'support', icon: 'lifebuoy' },
        { key: 'terms', icon: 'file' }
    ];

    const storage = {
        get(k) { try { return localStorage.getItem(k); } catch { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
    };

    function detectLang() {
        const fromUrl = new URLSearchParams(location.search).get('lang');
        if (LANGS.includes(fromUrl)) return fromUrl;
        const saved = storage.get('site_lang');
        if (LANGS.includes(saved)) return saved;
        const browser = (navigator.languages || [navigator.language || 'en'])
            .map(l => l.slice(0, 2).toLowerCase())
            .find(l => LANGS.includes(l));
        return browser || 'en';
    }

    const cache = {};
    const listeners = [];
    let dict = {};

    const Site = window.Site = {
        root: ROOT,
        lang: detectLang(),
        socials: SOCIALS,
        email: EMAIL,

        t(key, vars) {
            let s = dict[key];
            if (s === undefined) return key;
            if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
            return s;
        },

        // Pick the active-language value of a {en, es} field (or return plain values as-is).
        loc(value) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value[Site.lang] ?? value.en ?? '';
            }
            return value ?? '';
        },

        icon(name, cls = '') {
            return `<svg class="icon ${cls}" aria-hidden="true"><use href="${ROOT}assets/icons.svg#${name}"></use></svg>`;
        },

        flag(lang) {
            return LANGS.includes(lang)
                ? `<svg class="flag" viewBox="0 0 30 20" role="img" aria-label="${Site.t('lang.' + lang)}"><use href="${ROOT}assets/icons.svg#flag-${lang}"></use></svg>`
                : '';
        },

        escape(s) {
            return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        },

        onLanguage(cb) { listeners.push(cb); },

        async setLanguage(lang) {
            if (!LANGS.includes(lang)) lang = 'en';
            Site.lang = lang;
            storage.set('site_lang', lang);
            document.documentElement.lang = lang;
            dict = await loadLocale(lang);
            applyDom();
            renderChrome();
            renderPage();
            listeners.forEach(cb => cb(lang));
        }
    };

    async function loadLocale(lang) {
        if (!cache[lang]) {
            cache[lang] = fetch(`${ROOT}assets/data/locales/${lang}.json`)
                .then(r => r.json())
                .catch(err => { console.error('Failed to load locale', err); delete cache[lang]; return {}; });
        }
        return cache[lang];
    }

    // Static text: data-i18n (text), data-i18n-placeholder, data-i18n-aria (aria-label)
    function applyDom() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const v = dict[el.dataset.i18n];
            if (typeof v === 'string') el.textContent = v;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const v = dict[el.dataset.i18nPlaceholder];
            if (v) el.placeholder = v;
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const v = dict[el.dataset.i18nAria];
            if (v) el.setAttribute('aria-label', v);
        });
        const titleKey = document.body.dataset.titleKey;
        if (titleKey && dict[titleKey]) document.title = `${dict[titleKey]} | Sir Gary's Mods`;
    }

    function socialLinks(cls) {
        return SOCIALS.map(s =>
            `<a class="${cls}" href="${s.url}" target="_blank" rel="noopener" aria-label="${s.name}" title="${s.name}">${Site.icon(s.icon)}</a>`
        ).join('');
    }

    function langSwitch() {
        return `<div class="lang-switch" role="group" aria-label="${Site.t('nav.lang')}">
            ${LANGS.map(l => `<button type="button" data-lang="${l}" aria-pressed="${l === Site.lang}">
                <svg class="flag" viewBox="0 0 30 20" aria-hidden="true"><use href="${ROOT}assets/icons.svg#flag-${l}"></use></svg>${l.toUpperCase()}
            </button>`).join('')}
        </div>`;
    }

    function renderChrome() {
        const page = document.body.dataset.page || 'home';
        const nav = document.getElementById('site-nav');
        if (nav) {
            const current = key => (key === page ? ' aria-current="page"' : '');
            nav.innerHTML = `
                <div class="nav-inner">
                    <a class="brand" href="${ROOT}index.html">
                        <img src="${ROOT}assets/avatar.webp" width="36" height="36" alt="">
                        <span>Sir Gary's Mods</span>
                    </a>
                    <nav class="nav-links" aria-label="Main">
                        <a href="${ROOT}index.html#catalog"${current('home')}>${Site.t('nav.mods')}</a>
                        <a href="${ROOT}pages/faq.html"${current('faq')}>${Site.t('nav.faq')}</a>
                        <a href="${ROOT}pages/about.html" class="hide-sm"${current('about')}>${Site.t('nav.about')}</a>
                    </nav>
                    <div class="nav-social hide-sm">${socialLinks('icon-btn')}</div>
                    ${langSwitch()}
                </div>`;
        }

        const footer = document.getElementById('site-footer');
        if (footer) {
            footer.innerHTML = `
                <div class="footer-grid container">
                    <div class="footer-brand">
                        <img src="${ROOT}assets/avatar.webp" width="56" height="56" alt="" loading="lazy">
                        <div>
                            <h2>Sir Gary</h2>
                            <p>${Site.t('footer.brandSub')}</p>
                        </div>
                    </div>
                    <div class="footer-col">
                        <h3>${Site.t('footer.info')}</h3>
                        <ul>${PAGES.map(p => `<li><a href="${ROOT}pages/${p.key}.html">${Site.icon(p.icon)}<span>${Site.t('footer.' + p.key)}</span></a></li>`).join('')}</ul>
                    </div>
                    <div class="footer-col">
                        <h3>${Site.t('footer.follow')}</h3>
                        <div class="footer-social">${socialLinks('icon-btn')}</div>
                        <a class="footer-mail" href="mailto:${EMAIL}">${Site.icon('mail')}<span>${Site.t('nav.contact')}</span></a>
                    </div>
                </div>
                <div class="footer-bottom"><p>${Site.t('footer.copyright')}</p></div>`;
        }
    }

    // About / FAQ / Support / Terms content lives in the locale files.
    function renderPage() {
        const page = document.body.dataset.page;
        const el = document.getElementById('page-content');
        if (!el || !page || page === 'home') return;
        const paragraphs = key => (dict[key] || []).map(p => `<p>${p}</p>`).join('');

        if (page === 'faq') {
            const strip = s => s.replace(/^\s*(Q|A|P|R):\s*/, '');
            el.innerHTML = (dict['faq.items'] || []).map(item => `
                <details class="faq-item" id="${item.id || ''}">
                    <summary><span>${strip(item.q)}</span>${Site.icon('chevron-down', 'chev')}</summary>
                    <div class="faq-answer"><p>${strip(item.a)}</p></div>
                </details>`).join('');
            const target = location.hash && document.getElementById(location.hash.slice(1));
            if (target && target.tagName === 'DETAILS') {
                target.open = true;
                target.scrollIntoView({ block: 'center' });
            }
        } else if (page === 'support') {
            el.innerHTML = `${paragraphs('support.paragraphs')}
                <h3 class="page-subhead">${Site.t('support.contactTitle')}</h3>
                <div class="contact-grid">
                    <a class="contact-card" href="mailto:${EMAIL}">${Site.icon('mail')}<span><strong>Email</strong><small>${EMAIL}</small></span></a>
                    ${SOCIALS.map(s => `<a class="contact-card" href="${s.url}" target="_blank" rel="noopener">${Site.icon(s.icon)}<span><strong>${s.name}</strong><small>${s.url.replace(/^https?:\/\/(www\.)?/, '')}</small></span></a>`).join('')}
                </div>`;
        } else if (page === 'about') {
            el.innerHTML = `
                <div class="about-card">
                    <img src="${ROOT}assets/avatar.webp" width="160" height="160" alt="Sir Gary">
                    <div>${paragraphs('about.paragraphs')}
                        <div class="about-social">${socialLinks('icon-btn icon-btn-lg')}</div>
                    </div>
                </div>`;
        } else {
            el.innerHTML = paragraphs(`${page}.paragraphs`);
        }
    }

    document.addEventListener('click', e => {
        const btn = e.target.closest('.lang-switch button');
        if (btn && btn.dataset.lang !== Site.lang) Site.setLanguage(btn.dataset.lang);
    });

    // Broken images fall back to data-fallback (e.g. the original thumbnail), then the logo.
    document.addEventListener('error', e => {
        const img = e.target;
        if (img.tagName !== 'IMG') return;
        if (img.dataset.fallback) {
            img.src = img.dataset.fallback;
            delete img.dataset.fallback;
        } else if (!img.src.endsWith('favicon.png')) {
            img.src = `${ROOT}assets/favicon.png`;
        }
    }, true);

    Site.ready = Site.setLanguage(Site.lang);
})();
