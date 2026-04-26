document.addEventListener("DOMContentLoaded", () => {
    const modsGrid = document.getElementById('mods-grid');
    const searchInput = document.getElementById('search-input');
    const sortOrderSelect = document.getElementById('sort-order');
    const gameFilterSelect = document.getElementById('game-filter');

    let modsData = [];
    let searchTimeout;

    // Safe date parser for non-standard dates like "TBD"
    function parseDate(d) {
        if (!d || d === 'TBD') return new Date(0);
        const parsed = new Date(d);
        return isNaN(parsed) ? new Date(0) : parsed;
    }

    // Fetch the mods data from assets/data/mods.json
    async function fetchMods() {
        try {
            console.log("Fetching mods.json from assets...");
            const response = await fetch('assets/data/mods.json');
            if (!response.ok) throw new Error('Failed to load mods');
            modsData = await response.json();
            populateGameFilter();
            renderMods();
        } catch (error) {
            console.error('Error fetching mods:', error);
            const msg = window.i18nStore && window.i18nStore['no.fetch'] ? window.i18nStore['no.fetch'] : 'The abyssal archives refused to open.';
            modsGrid.innerHTML = `<div class="no-results" data-i18n="no.fetch">${msg}</div>`;
        }
    }

    // Populate Game Filter dynamically
    function populateGameFilter() {
        const games = [...new Set(modsData.map(mod => mod.game).filter(Boolean))];
        games.sort((a, b) => a.localeCompare(b));
        
        const allGamesOption = gameFilterSelect.querySelector('option[value="All"]');
        gameFilterSelect.innerHTML = '';
        if (allGamesOption) {
            gameFilterSelect.appendChild(allGamesOption);
        } else {
            gameFilterSelect.innerHTML = '<option value="All" data-i18n="filter.allGames">All Games</option>';
        }
        
        games.forEach(game => {
            const option = document.createElement('option');
            option.value = game;
            option.textContent = game;
            gameFilterSelect.appendChild(option);
        });
    }


    function generateModCardHtml(mod, isFeatured = false) {
        const lang = window.activeLang || 'en';
        
        let mName = mod.name[lang] || mod.name.en || mod.name || '';
        if (typeof mName !== 'string') mName = 'Unknown Mod';
        
        let badgeHtml = '';
        if (mod.status === 'new') {
            const newTxt = window.i18nStore && window.i18nStore['badge.new'] ? window.i18nStore['badge.new'] : 'NEW!';
            badgeHtml = `<div class="badge badge-new" data-i18n="badge.new">${newTxt}</div>`;
        } else if (mod.status === 'updated') {
            const updTxt = window.i18nStore && window.i18nStore['badge.updated'] ? window.i18nStore['badge.updated'] : 'UPDATED!';
            badgeHtml = `<div class="badge badge-updated" data-i18n="badge.updated">${updTxt}</div>`;
        }

        if (mod.status && mod.status.startsWith('teaser')) {
            let tText = '';
            if (mod.teaserText) {
                tText = mod.teaserText[lang] || mod.teaserText.en || mod.teaserText;
            }
            return `
                <article class="mod-card teaser ${mod.status}">
                    <div class="teaser-content">
                        <h2 class="teaser-title">${mName}</h2>
                        <div class="teaser-divider"></div>
                        <div class="teaser-date">${tText}</div>
                    </div>
                    <div class="teaser-bg-layer"></div>
                    <div class="teaser-particles"></div>
                </article>
            `;
        }

        let mDesc = mod.description && typeof mod.description === 'object' ? (mod.description[lang] || mod.description.en || '') : (mod.description || '');
        if (typeof mDesc !== 'string') mDesc = '';
        
        let tArr = mod.tags && typeof mod.tags === 'object' ? (mod.tags[lang] || mod.tags.en || []) : (mod.tags || []);
        if (!Array.isArray(tArr)) tArr = [];

        const tagsHtml = tArr.map(tag => `<button type="button" class="tag" data-tag="${tag}" aria-label="Filter by tag ${tag}">${tag}</button>`).join('');
        
        const dlText = window.i18nStore && window.i18nStore['btn.download'] ? window.i18nStore['btn.download'] : 'Download';
        const downloadsHtml = (mod.downloads || []).map(dl => {
            let flagHtml = '';
            if (dl.lang === 'en') flagHtml = `<img src="https://flagcdn.com/us.svg" class="lang-flag" alt="EN">`;
            if (dl.lang === 'es') flagHtml = `<img src="https://flagcdn.com/es.svg" class="lang-flag" alt="ES">`;
            return `<a href="${dl.url}" class="dl-btn"><i class='bx bx-download'></i> ${dlText} ${dl.version}${flagHtml}</a>`;
        }).join('');

        let showcasesHtml = '';
        if (mod.showcases && Array.isArray(mod.showcases)) {
            showcasesHtml = mod.showcases.map(sc => {
                let scLabel = sc.label[lang] || sc.label.en || sc.label || 'Watch';
                const isVideo = sc.type === 'youtube' || sc.type === 'video';
                const tintClass = isVideo ? ' video-tint' : '';
                const iconClass = sc.type === 'youtube' ? 'bxl-youtube' : (sc.type === 'twitch' ? 'bxl-twitch' : 'bx-link-external');
                return `<a href="${sc.url}" class="dl-btn${tintClass}" target="_blank" rel="noopener noreferrer"><i class='bx ${iconClass}'></i> ${scLabel}</a>`;
            }).join('');
        }

        let changelogHtml = '';
        if (mod.status === 'updated' && mod.changelog) {
            const clText = mod.changelog[lang] || mod.changelog.en || mod.changelog;
            const btnText = window.i18nStore && window.i18nStore['btn.patchnotes'] ? window.i18nStore['btn.patchnotes'] : 'View Patch Notes';
            changelogHtml = `
                <button class="changelog-btn"><span>${btnText}</span> <i class='bx bx-chevron-down'></i></button>
                <div class="changelog-content">${clText}</div>
            `;
        }

        if (isFeatured) {
            let featTxt = window.i18nStore && window.i18nStore['badge.featured'] ? window.i18nStore['badge.featured'] : 'FEATURED MOD';
            return `
                <article class="featured-mod-container">
                    ${badgeHtml}
                    <div class="featured-label" data-i18n="badge.featured">${featTxt}</div>
                    <img src="${mod.thumbnail}" alt="Thumbnail for ${mName}" class="mod-card-img" loading="lazy" onerror="this.src='assets/favicon.png'; this.onerror=null;">
                    <div class="mod-card-content">
                        <span class="mod-game">${mod.game}</span>
                        <h2 class="mod-title">${mName}</h2>
                        <div class="mod-tags">${tagsHtml}</div>
                        <p class="mod-desc">${mDesc}</p>
                        ${changelogHtml}
                        <div class="mod-downloads">
                            ${showcasesHtml}
                            ${downloadsHtml}
                        </div>
                    </div>
                </article>
            `;
        }

        return `
            <article class="mod-card">
                ${badgeHtml}
                <img src="${mod.thumbnail}" alt="Thumbnail for ${mName}" class="mod-card-img" loading="lazy" onerror="this.src='assets/favicon.png'; this.onerror=null;">
                <div class="mod-card-content">
                    <span class="mod-game">${mod.game}</span>
                    <h2 class="mod-title">${mName}</h2>
                    <div class="mod-tags">${tagsHtml}</div>
                    <p class="mod-desc">${mDesc}</p>
                    ${changelogHtml}
                    <div class="mod-downloads">
                        ${showcasesHtml}
                        ${downloadsHtml}
                    </div>
                </div>
            </article>
        `;
    }

    // Render Mods to HTML Grid
    function renderMods() {
        if (!modsData || modsData.length === 0) return;

        const searchTerm = searchInput.value.toLowerCase().trim();
        const sortValue = sortOrderSelect.value;
        const gameFilter = gameFilterSelect.value;
        const groupBySelect = document.getElementById('group-by');
        const groupByValue = groupBySelect ? groupBySelect.value : 'none';

        // Filter
        let filteredMods = modsData.filter(mod => {
            const lang = window.activeLang || 'en';
            let mName = mod.name[lang] || mod.name.en || mod.name || '';
            if (typeof mName !== 'string') mName = '';
            
            let mDesc = mod.description && typeof mod.description === 'object' ? (mod.description[lang] || mod.description.en || '') : (mod.description || '');
            if (typeof mDesc !== 'string') mDesc = '';

            let tArr = mod.tags && typeof mod.tags === 'object' ? (mod.tags[lang] || mod.tags.en || []) : (mod.tags || []);
            if (!Array.isArray(tArr)) tArr = [];

            const searchSource = (mName + ' ' + mDesc + ' ' + tArr.join(' ')).toLowerCase();
            const matchesSearch = searchSource.includes(searchTerm);
            const matchesGame = gameFilter === 'All' ? true : mod.game === gameFilter;
            return matchesSearch && matchesGame;
        });

        // Sort
        filteredMods.sort((a, b) => {
            const aIsTeaser = a.status && a.status.startsWith('teaser');
            const bIsTeaser = b.status && b.status.startsWith('teaser');
            
            if (aIsTeaser && !bIsTeaser) return -1;
            if (bIsTeaser && !aIsTeaser) return 1;

            const lang = window.activeLang || 'en';
            const aName = (a.name[lang] || a.name.en || a.name || '');
            const bName = (b.name[lang] || b.name.en || b.name || '');

            if (sortValue === 'newest') {
                return parseDate(b.releaseDate) - parseDate(a.releaseDate);
            } else if (sortValue === 'oldest') {
                return parseDate(a.releaseDate) - parseDate(b.releaseDate);
            } else if (sortValue === 'name-asc') {
                return aName.localeCompare(bName);
            } else if (sortValue === 'name-desc') {
                return bName.localeCompare(aName);
            }
            return 0;
        });

        // Handle Featured Mod
        const featuredSection = document.getElementById('featured-mod');
        let featuredMod = null;
        if (searchTerm === '' && gameFilter === 'All' && groupByValue === 'none') {
            featuredMod = filteredMods.find(m => m.featured);
        }
        
        if (featuredMod && featuredSection) {
            featuredSection.innerHTML = generateModCardHtml(featuredMod, true);
            featuredSection.style.display = 'block';
            filteredMods = filteredMods.filter(m => m.id !== featuredMod.id);
        } else if (featuredSection) {
            featuredSection.innerHTML = '';
            featuredSection.style.display = 'none';
        }

        // Create HTML Output
        if (filteredMods.length === 0) {
            const noResTxt = window.i18nStore && window.i18nStore['no.results'] ? window.i18nStore['no.results'] : "No artifacts unearthed matching your criteria.";
            modsGrid.innerHTML = `
                <div class="no-results">
                    <p data-i18n="no.results">${noResTxt}</p>
                </div>
            `;
            return;
        }

        let finalHtml = '';

        if (groupByValue === 'none') {
            finalHtml = filteredMods.map(mod => generateModCardHtml(mod, false)).join('');
        } else {
            const groups = {};
            filteredMods.forEach(mod => {
                let key = 'Other';
                if (groupByValue === 'game') key = mod.game || 'Other';
                if (groupByValue === 'year') {
                    if (mod.releaseDate) {
                        key = mod.releaseDate.split('-')[0];
                    } else {
                        key = 'Unknown Year';
                    }
                }
                if (!groups[key]) groups[key] = [];
                groups[key].push(mod);
            });

            const sortedKeys = Object.keys(groups).sort((a,b) => {
                if (groupByValue === 'year') return b.localeCompare(a);
                return a.localeCompare(b);
            });

            sortedKeys.forEach(key => {
                finalHtml += `<div class="group-divider"><h3>${key}</h3></div>`;
                finalHtml += groups[key].map(mod => generateModCardHtml(mod, false)).join('');
            });
        }

        // Apply HTML with a slight fade effect
        modsGrid.style.opacity = 0;
        setTimeout(() => {
            modsGrid.innerHTML = finalHtml;
            modsGrid.style.transition = 'opacity 0.4s ease';
            modsGrid.style.opacity = 1;
        }, 50);
    }

    // Event Listeners for controls
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(renderMods, 250);
    });
    sortOrderSelect.addEventListener('change', renderMods);
    gameFilterSelect.addEventListener('change', renderMods);
    
    // Tag Click Delegation
    modsGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag')) {
            const tagValue = e.target.getAttribute('data-tag');
            if (tagValue) {
                searchInput.value = tagValue;
                renderMods();
                document.querySelector('.controls-section').scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // Handle group by changes
    const groupBySelectElement = document.getElementById('group-by');
    if (groupBySelectElement) {
        groupBySelectElement.addEventListener('change', renderMods);
    }

    // Changelog accordion click
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.changelog-btn');
        if (btn) {
            const content = btn.nextElementSibling;
            const icon = btn.querySelector('i');
            content.classList.toggle('active');
            if (content.classList.contains('active')) {
                icon.classList.replace('bx-chevron-down', 'bx-chevron-up');
            } else {
                icon.classList.replace('bx-chevron-up', 'bx-chevron-down');
            }
        }
    });
    
    // Listen to i18n language change events to re-render the grid
    document.addEventListener('languageChanged', renderMods);

    // Initial Fetch
    fetchMods();
});
