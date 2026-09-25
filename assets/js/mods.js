/* Mod catalog: featured banner, filterable grid (with teaser cards) and the detail dialog.
 * All data comes from assets/data/mods.json (see assets/data/templates.txt). */
(() => {
    const { t, loc, icon, flag, escape } = Site;

    const INSTALL_GUIDES = ['rompatcher', 'switch', 'racman', 'deltapatcher'];
    const $ = id => document.getElementById(id);
    const el = {
        featured: $('featured-mod'),
        grid: $('mods-grid'),
        search: $('search-input'),
        clear: $('search-clear'),
        game: $('game-filter'),
        sort: $('sort-order'),
        group: $('group-by'),
        count: $('result-count'),
        activeTag: $('active-tag'),
        reset: $('reset-filters'),
        dialog: $('mod-dialog')
    };

    let mods = [];
    const state = { q: '', game: 'All', sort: 'newest', group: 'none', tag: '' };
    const sizeCache = new Map();

    // ---------- Helpers ----------
    const isTeaser = m => String(m.status || '').startsWith('teaser');
    const nameOf = m => { const n = loc(m.name); return typeof n === 'string' ? n : 'Unknown Mod'; };
    const tagsOf = m => { const tg = loc(m.tags); return Array.isArray(tg) ? tg : (Array.isArray(m.tags) ? m.tags : []); };
    const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const stripHtml = s => String(s).replace(/<[^>]*>/g, ' ');

    function parseDate(d) {
        const parsed = d && d !== 'TBD' ? new Date(d) : null;
        return parsed && !isNaN(parsed) ? parsed : new Date(0);
    }

    function formatDate(d) {
        if (!d || d === 'TBD') return t('dialog.tbd');
        if (/^\d{4}$/.test(d)) return d;
        const parsed = new Date(d + 'T00:00:00');
        return isNaN(parsed) ? d : parsed.toLocaleDateString(Site.lang, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function webp(path) {
        return path.replace(/\.(png|jpe?g)$/i, '.webp');
    }

    function thumbImg(mod, { eager = false, cls = '' } = {}) {
        const src = mod.thumbnail || 'assets/favicon.png';
        const alt = escape(nameOf(mod));
        return `<img class="${cls}" src="${webp(src)}" data-fallback="${src}" alt="${alt}" width="960" height="540"
            ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
    }

    function badge(mod) {
        if (mod.status === 'new') return `<span class="badge badge-new">${t('badge.new')}</span>`;
        if (mod.status === 'updated') return `<span class="badge badge-updated">${t('badge.updated')}</span>`;
        return '';
    }

    function tagButtons(mod) {
        return tagsOf(mod).map(tag => {
            const safe = escape(tag);
            return `<button type="button" class="tag${tag === state.tag ? ' is-active' : ''}" data-tag="${safe}">${safe}</button>`;
        }).join('');
    }

    function downloadButton(dl, { compact = false } = {}) {
        const ext = (dl.url.split('?')[0].match(/\.(\w+)$/) || [])[1] || '';
        const langName = dl.lang ? `<span class="dl-lang">${flag(dl.lang)}<span>${t('lang.' + dl.lang)}</span></span>` : '';
        return `<a class="dl-btn${compact ? ' dl-compact' : ''}" href="${escape(dl.url)}" download>
            ${icon('download')}
            <span class="dl-main"><span class="dl-name">${t('btn.download')} ${escape(dl.version || '')}</span>
                <span class="dl-meta">${langName}${ext ? `<span class="dl-ext">.${ext}</span>` : ''}<span class="dl-size" data-size-for="${escape(dl.url)}"></span></span>
            </span>
        </a>`;
    }

    function showcaseButton(sc, cls = 'sc-btn') {
        const kind = sc.type === 'youtube' || sc.type === 'video' ? 'youtube' : sc.type === 'twitch' ? 'twitch' : sc.type === 'twitter' ? 'twitter' : 'external';
        const label = loc(sc.label) || t('card.video');
        return `<a class="${cls} sc-${kind}" href="${escape(sc.url)}" target="_blank" rel="noopener">${icon(kind)}<span>${escape(label)}</span></a>`;
    }

    // Wrap sha1 hashes in the warning text so they can be copied with one click.
    function formatWarning(text) {
        return String(text).replace(/sha1:\s*([0-9a-f]{40})\.?/gi, (_, hash) =>
            `<span class="hash-row"><span class="hash-label">sha1</span><code class="hash">${hash}</code>` +
            `<button type="button" class="copy-btn" data-copy="${hash}" aria-label="${t('dialog.copy')}" title="${t('dialog.copy')}">${icon('copy')}</button></span>`);
    }

    function warningBlock(mod) {
        if (!mod.warning) return '';
        const text = loc(mod.warning);
        if (typeof text !== 'string' || !text.trim()) return '';
        const label = mod.warningLabel ? loc(mod.warningLabel) : t('badge.important');
        return `<div class="notice">
            <div class="notice-head">${icon('alert')}<span>${escape(label)}</span></div>
            <div class="notice-body">${formatWarning(text)}</div>
        </div>`;
    }

    // File sizes are read with a HEAD request (same-origin files only), or from an optional "size" field.
    function fillSizes(root) {
        root.querySelectorAll('.dl-size[data-size-for]').forEach(span => {
            const url = span.dataset.sizeFor;
            const dl = mods.flatMap(m => m.downloads || []).find(d => d.url === url);
            if (dl && dl.size) { span.textContent = dl.size; return; }
            if (/^https?:/i.test(url) && !url.startsWith(location.origin)) return;
            if (!sizeCache.has(url)) {
                sizeCache.set(url, fetch(url, { method: 'HEAD' })
                    .then(r => (r.ok ? Number(r.headers.get('content-length')) : 0))
                    .catch(() => 0));
            }
            sizeCache.get(url).then(bytes => {
                if (!bytes) return;
                const mb = bytes / 1048576;
                span.textContent = mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
            });
        });
    }

    // ---------- Rendering ----------
    function cardHtml(mod) {
        const name = escape(nameOf(mod));
        const downloads = mod.downloads || [];
        const langs = [...new Set(downloads.map(d => d.lang).filter(Boolean))];
        const video = (mod.showcases || [])[0];
        return `<article class="card" id="card-${mod.id}">
            <span class="card-sheen" aria-hidden="true"></span>
            <div class="card-media">
                ${thumbImg(mod)}
                ${badge(mod)}
                ${mod.platform ? `<span class="platform">${escape(mod.platform)}</span>` : ''}
            </div>
            <div class="card-body">
                <p class="eyebrow">${escape(mod.game || '')}</p>
                <h3 class="card-title"><a class="card-link" href="#${mod.id}" data-open="${mod.id}">${name}</a></h3>
                <p class="card-desc">${String(loc(mod.description)).replace(/<br\s*\/?>/gi, ' ')}</p>
                <div class="tags">${tagButtons(mod)}</div>
            </div>
            <div class="card-foot">
                <span class="card-cta">${t('card.details')} ${icon('arrow-right')}</span>
                <span class="card-foot-meta">
                    ${langs.map(flag).join('')}
                    ${downloads.length ? `<span class="dl-count">${icon('file')}${downloads.length === 1 ? t('card.file') : t('card.files', { n: downloads.length })}</span>` : ''}
                    ${video ? `<a class="icon-btn card-video sc-${video.type}" href="${escape(video.url)}" target="_blank" rel="noopener" aria-label="${escape(loc(video.label) || t('card.video'))}" title="${escape(loc(video.label) || t('card.video'))}">${icon(video.type === 'youtube' ? 'youtube' : video.type === 'twitter' ? 'twitter' : 'external')}</a>` : ''}
                </span>
            </div>
        </article>`;
    }

    function renderFeatured(mod) {
        if (!mod) { el.featured.hidden = true; el.featured.innerHTML = ''; return; }
        el.featured.hidden = false;
        el.featured.innerHTML = `
            <article class="featured">
                <div class="featured-aura" aria-hidden="true"></div>
                <div class="featured-inner">
                <span class="card-sheen" aria-hidden="true"></span>
                <div class="featured-media">
                    ${thumbImg(mod, { eager: true })}
                    <span class="featured-label">${icon('sparkle')}${t('badge.featured')}</span>
                </div>
                <div class="featured-body">
                    <div class="featured-top">
                        <p class="eyebrow">${escape(mod.game || '')}${mod.platform ? ` · ${escape(mod.platform)}` : ''}</p>
                        ${badge(mod)}
                    </div>
                    <h2 class="featured-title"><a href="#${mod.id}" data-open="${mod.id}">${escape(nameOf(mod))}</a></h2>
                    <p class="featured-desc">${loc(mod.description)}</p>
                    <div class="tags">${tagButtons(mod)}</div>
                    <div class="featured-actions">
                        ${(mod.downloads || []).map(d => downloadButton(d)).join('')}
                        ${(mod.showcases || []).map(sc => showcaseButton(sc)).join('')}
                        <a class="ghost-btn" href="#${mod.id}" data-open="${mod.id}">${icon('book')}<span>${t('dialog.howto')}</span></a>
                    </div>
                </div>
                </div>
            </article>`;
        fillSizes(el.featured);
    }

    function teaserHtml(mod) {
        return `
            <article class="teaser ${escape(mod.status)}" id="card-${mod.id}">
                <div class="teaser-content">
                    <p class="teaser-label">${t('teaser.label')}${mod.platform ? ` · ${escape(mod.platform)}` : ''}</p>
                    <h3 class="teaser-title">${escape(nameOf(mod))}</h3>
                    <div class="teaser-divider"></div>
                    <p class="teaser-date">${escape(loc(mod.teaserText))}</p>
                </div>
                <div class="teaser-bg-layer" aria-hidden="true"></div>
                <div class="teaser-particles" aria-hidden="true"></div>
            </article>`;
    }

    function render() {
        const q = fold(state.q.trim());
        const filtered = mods.filter(mod => {
            if (isTeaser(mod)) return false;
            if (state.game !== 'All' && mod.game !== state.game) return false;
            if (state.tag && !tagsOf(mod).includes(state.tag)) return false;
            if (!q) return true;
            const hay = fold([nameOf(mod), mod.game, stripHtml(loc(mod.description)), tagsOf(mod).join(' '), mod.platform].join(' '));
            return q.split(/\s+/).every(word => hay.includes(word));
        });

        filtered.sort((a, b) => {
            switch (state.sort) {
                case 'oldest': return parseDate(a.releaseDate) - parseDate(b.releaseDate);
                case 'name-asc': return nameOf(a).localeCompare(nameOf(b), Site.lang);
                case 'name-desc': return nameOf(b).localeCompare(nameOf(a), Site.lang);
                default: return parseDate(b.releaseDate) - parseDate(a.releaseDate);
            }
        });

        const unfiltered = !q && state.game === 'All' && !state.tag && state.group === 'none';
        const featured = unfiltered ? filtered.find(m => m.featured) : null;
        renderFeatured(featured);
        const list = featured ? filtered.filter(m => m !== featured) : filtered;

        // Teasers lead the ungrouped grid; they have no game or tags, so game/tag filters hide them.
        const teasers = state.group === 'none' && state.game === 'All' && !state.tag
            ? mods.filter(m => isTeaser(m) && (!q || q.split(/\s+/).every(w => fold(nameOf(m)).includes(w))))
            : [];

        el.count.textContent = filtered.length === 1 ? t('results.one') : t('results.count', { n: filtered.length });
        el.activeTag.hidden = !state.tag;
        el.activeTag.innerHTML = state.tag ? `${icon('tag')}<span>${escape(state.tag)}</span>${icon('x')}` : '';
        el.reset.hidden = !(q || state.game !== 'All' || state.tag);
        el.clear.hidden = !state.q;

        if (!list.length && !teasers.length) {
            el.grid.innerHTML = filtered.length ? '' : `<div class="empty">${icon('search')}<p>${t('no.results')}</p>
                <button type="button" class="ghost-btn" data-action="reset">${t('filter.clear')}</button></div>`;
            return;
        }

        if (state.group === 'none') {
            el.grid.innerHTML = teasers.map(m => teaserHtml(m)).join('') + list.map(m => cardHtml(m)).join('');
            return;
        }

        const groups = new Map();
        list.forEach(mod => {
            let key = mod.game || 'Other';
            if (state.group === 'year') {
                const y = String(mod.releaseDate || '').slice(0, 4);
                key = /^\d{4}$/.test(y) ? y : t('dialog.tbd');
            }
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(mod);
        });
        const keys = [...groups.keys()].sort((a, b) => (state.group === 'year' ? b.localeCompare(a) : a.localeCompare(b)));
        el.grid.innerHTML = keys.map(key =>
            `<div class="group-divider"><h3>${escape(key)}</h3><span>${groups.get(key).length}</span></div>` +
            groups.get(key).map(m => cardHtml(m)).join('')
        ).join('');
    }

    function populateGames() {
        const games = [...new Set(mods.filter(m => !isTeaser(m)).map(m => m.game).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        el.game.innerHTML = `<option value="All">${t('filter.allGames')}</option>` +
            games.map(g => `<option value="${escape(g)}">${escape(g)}</option>`).join('');
        el.game.value = games.includes(state.game) ? state.game : 'All';
    }

    // ---------- Detail dialog ----------
    function openDialog(id) {
        const mod = mods.find(m => m.id === id && !isTeaser(m));
        if (!mod) return false;
        const downloads = mod.downloads || [];
        const showcases = mod.showcases || [];
        const guide = INSTALL_GUIDES.includes(mod.install) ? t('install.' + mod.install) : null;
        const changelog = mod.changelog ? loc(mod.changelog) : '';

        el.dialog.innerHTML = `
            <div class="dialog-inner">
                <button type="button" class="dialog-close icon-btn" data-action="close" aria-label="${t('dialog.close')}">${icon('x')}</button>
                <div class="dialog-media">${thumbImg(mod, { eager: true })}${badge(mod)}</div>
                <div class="dialog-body">
                    <p class="eyebrow">${escape(mod.game || '')}</p>
                    <h2 class="dialog-title" id="dialog-title">${escape(nameOf(mod))}</h2>
                    <ul class="facts">
                        ${mod.platform ? `<li>${icon('chip')}<span>${t('dialog.platform')}: <strong>${escape(mod.platform)}</strong></span></li>` : ''}
                        <li>${icon('calendar')}<span>${t('dialog.released')}: <strong>${formatDate(mod.releaseDate)}</strong></span></li>
                    </ul>
                    <div class="tags">${tagButtons(mod)}</div>
                    <p class="dialog-desc">${loc(mod.description)}</p>
                    ${warningBlock(mod)}
                    ${changelog ? `<details class="changelog"${mod.status === 'updated' ? ' open' : ''}>
                        <summary>${icon('sparkle')}<span>${t('dialog.patchnotes')}</span>${icon('chevron-down', 'chev')}</summary>
                        <div class="changelog-body">${changelog}</div>
                    </details>` : ''}
                    ${downloads.length ? `<section class="dialog-section">
                        <h3>${icon('download')}${t('dialog.downloads')}</h3>
                        <div class="dl-list">${downloads.map(d => downloadButton(d)).join('')}</div>
                    </section>` : ''}
                    ${guide ? `<section class="dialog-section">
                        <h3>${icon('book')}${t('dialog.howto')}</h3>
                        <ol class="steps">${guide.map(s => `<li>${s}</li>`).join('')}</ol>
                        <a class="text-link" href="pages/faq.html#${mod.install}">${t('dialog.fullGuide')} ${icon('arrow-right')}</a>
                    </section>` : ''}
                    ${showcases.length ? `<section class="dialog-section">
                        <h3>${icon('play')}${t('dialog.showcase')}</h3>
                        <div class="sc-list">${showcases.map(sc => showcaseButton(sc)).join('')}</div>
                    </section>` : ''}
                    <div class="dialog-foot">
                        <button type="button" class="ghost-btn" data-copy="${location.origin}${location.pathname}#${mod.id}">${icon('link')}<span>${t('dialog.share')}</span></button>
                    </div>
                </div>
            </div>`;
        el.dialog.setAttribute('aria-labelledby', 'dialog-title');
        if (!el.dialog.open) el.dialog.showModal();
        el.dialog.scrollTop = 0;
        document.title = `${nameOf(mod)} | Sir Gary's Mods`;
        fillSizes(el.dialog);
        return true;
    }

    function closeDialog() {
        if (history.state && history.state.modal) {
            history.back(); // the popstate handler closes the dialog
        } else {
            el.dialog.close();
            history.replaceState(null, '', location.pathname + location.search);
        }
    }

    function syncFromHash() {
        const id = decodeURIComponent(location.hash.slice(1));
        if (id && openDialog(id)) return;
        if (el.dialog.open) el.dialog.close();
    }

    el.dialog.addEventListener('close', () => { document.title = "Sir Gary's Mods"; });
    el.dialog.addEventListener('cancel', e => { e.preventDefault(); closeDialog(); });
    el.dialog.addEventListener('click', e => {
        if (e.target === el.dialog || e.target.closest('[data-action="close"]')) closeDialog();
    });
    window.addEventListener('popstate', syncFromHash);

    // ---------- URL state (shareable filters) ----------
    function readUrl() {
        const p = new URLSearchParams(location.search);
        state.q = p.get('q') || '';
        state.game = p.get('game') || 'All';
        state.sort = ['newest', 'oldest', 'name-asc', 'name-desc'].includes(p.get('sort')) ? p.get('sort') : 'newest';
        state.group = ['none', 'game', 'year'].includes(p.get('group')) ? p.get('group') : 'none';
        state.tag = p.get('tag') || '';
        el.search.value = state.q;
        el.sort.value = state.sort;
        el.group.value = state.group;
    }

    function writeUrl() {
        const p = new URLSearchParams(location.search);
        const set = (k, v, def) => (v && v !== def ? p.set(k, v) : p.delete(k));
        set('q', state.q.trim(), '');
        set('game', state.game, 'All');
        set('sort', state.sort, 'newest');
        set('group', state.group, 'none');
        set('tag', state.tag, '');
        const qs = p.toString();
        history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }

    function update() { writeUrl(); render(); }

    // Tags are parallel arrays per language, so a tag keeps its meaning when the language changes.
    function translateTag(tag) {
        if (!tag) return '';
        for (const mod of mods) {
            if (!mod.tags || Array.isArray(mod.tags)) continue;
            for (const list of Object.values(mod.tags)) {
                const i = list.indexOf(tag);
                if (i !== -1) return (mod.tags[Site.lang] || mod.tags.en || [])[i] || '';
            }
        }
        return '';
    }

    function resetFilters() {
        Object.assign(state, { q: '', game: 'All', tag: '' });
        el.search.value = '';
        el.game.value = 'All';
        update();
    }

    // ---------- Events ----------
    let searchTimer;
    el.search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { state.q = el.search.value; update(); }, 150);
    });
    el.search.addEventListener('keydown', e => { if (e.key === 'Escape' && el.search.value) { el.search.value = ''; state.q = ''; update(); } });
    el.clear.addEventListener('click', () => { el.search.value = ''; state.q = ''; update(); el.search.focus(); });
    el.game.addEventListener('change', () => { state.game = el.game.value; update(); });
    el.sort.addEventListener('change', () => { state.sort = el.sort.value; update(); });
    el.group.addEventListener('change', () => { state.group = el.group.value; update(); });
    el.activeTag.addEventListener('click', () => { state.tag = ''; update(); });
    el.reset.addEventListener('click', resetFilters);

    document.addEventListener('click', async e => {
        const open = e.target.closest('[data-open]');
        if (open && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            if (!el.dialog.open) history.pushState({ modal: true }, '', '#' + open.dataset.open);
            openDialog(open.dataset.open);
            return;
        }

        const tag = e.target.closest('.tag[data-tag]');
        if (tag) {
            state.tag = state.tag === tag.dataset.tag ? '' : tag.dataset.tag;
            if (el.dialog.open) {
                el.dialog.close();
                history.replaceState(null, '', location.pathname + location.search);
            }
            update();
            document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const copy = e.target.closest('[data-copy]');
        if (copy) {
            try { await navigator.clipboard.writeText(copy.dataset.copy); } catch { return; }
            copy.classList.add('is-copied');
            const label = copy.querySelector('span');
            const old = label && label.textContent;
            if (label) label.textContent = t('dialog.copied');
            setTimeout(() => { copy.classList.remove('is-copied'); if (label) label.textContent = old; }, 1600);
            return;
        }

        if (e.target.closest('[data-action="reset"]')) resetFilters();
    });

    // Clicking anywhere on a card opens it (tags and the video button keep their own behavior).
    el.grid.addEventListener('click', e => {
        if (e.target.closest('a, button')) return;
        const card = e.target.closest('.card');
        if (card) card.querySelector('[data-open]').click();
    });

    // ---------- Boot ----------
    async function init() {
        readUrl();
        try {
            const [res] = await Promise.all([fetch('assets/data/mods.json'), Site.ready]);
            if (!res.ok) throw new Error(res.status);
            mods = (await res.json()).filter(m => !m.hidden);
        } catch (err) {
            console.error('Error fetching mods:', err);
            el.grid.innerHTML = `<div class="empty">${icon('alert')}<p>${t('no.fetch')}</p></div>`;
            return;
        }
        populateGames();
        render();
        syncFromHash();
        Site.onLanguage(() => {
            state.tag = translateTag(state.tag);
            writeUrl();
            populateGames();
                render();
            if (el.dialog.open) syncFromHash();
        });
    }

    init();
})();
