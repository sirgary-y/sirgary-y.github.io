document.addEventListener("DOMContentLoaded", () => {
    const modsGrid = document.getElementById('mods-grid');
    const searchInput = document.getElementById('search-input');
    const sortOrderSelect = document.getElementById('sort-order');
    const gameFilterSelect = document.getElementById('game-filter');

    let modsData = [];

    // Fetch the mods data from assets/data/mods.json
    async function fetchMods() {
        try {
            console.log("Fetching mods.json from assets...");
            const response = await fetch('assets/data/mods.json');
            if (!response.ok) throw new Error('Failed to load mods');
            modsData = await response.json();
            renderMods();
        } catch (error) {
            console.error('Error fetching mods:', error);
            const msg = window.i18nStore && window.i18nStore['no.fetch'] ? window.i18nStore['no.fetch'] : 'The abyssal archives refused to open.';
            modsGrid.innerHTML = `<div class="no-results" data-i18n="no.fetch">${msg}</div>`;
        }
    }

    // Render Mods to HTML Grid
    function renderMods() {
        if (!modsData || modsData.length === 0) return;

        const searchTerm = searchInput.value.toLowerCase().trim();
        const sortValue = sortOrderSelect.value;
        const gameFilter = gameFilterSelect.value;

        // Filter
        let filteredMods = modsData.filter(mod => {
            const lang = window.activeLang || 'en';
            let mName = mod.name[lang] || mod.name.en || mod.name || '';
            if (typeof mName !== 'string') mName = '';
            mName = mName.toLowerCase();
            
            let mDesc = mod.description[lang] || mod.description.en || mod.description || '';
            if (typeof mDesc !== 'string') mDesc = '';
            mDesc = mDesc.toLowerCase();

            let tArr = mod.tags[lang] || mod.tags.en || mod.tags || [];
            if (!Array.isArray(tArr)) tArr = [];
            const mTags = tArr.join(' ').toLowerCase();

            const searchSource = mName + ' ' + mDesc + ' ' + mTags;
            const matchesSearch = searchSource.includes(searchTerm);
            const matchesGame = gameFilter === 'All' ? true : mod.game === gameFilter;
            return matchesSearch && matchesGame;
        });

        // Sort
        filteredMods.sort((a, b) => {
            const lang = window.activeLang || 'en';
            const aName = (a.name[lang] || a.name.en || a.name);
            const bName = (b.name[lang] || b.name.en || b.name);

            if (sortValue === 'newest') {
                return new Date(b.releaseDate) - new Date(a.releaseDate);
            } else if (sortValue === 'oldest') {
                return new Date(a.releaseDate) - new Date(b.releaseDate);
            } else if (sortValue === 'name-asc') {
                return aName.localeCompare(bName);
            } else if (sortValue === 'name-desc') {
                return bName.localeCompare(aName);
            }
            return 0;
        });

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

        const html = filteredMods.map(mod => {
            const lang = window.activeLang || 'en';
            
            let mName = mod.name[lang] || mod.name.en || mod.name || '';
            if (typeof mName !== 'string') mName = 'Unknown Mod';
            
            let mDesc = mod.description[lang] || mod.description.en || mod.description || '';
            if (typeof mDesc !== 'string') mDesc = '';
            
            let tArr = mod.tags[lang] || mod.tags.en || mod.tags || [];
            if (!Array.isArray(tArr)) tArr = [];

            const tagsHtml = tArr.map(tag => `<span class="tag">${tag}</span>`).join('');
            const dlText = window.i18nStore && window.i18nStore['btn.download'] ? window.i18nStore['btn.download'] : 'Download';
            const downloadsHtml = mod.downloads.map(dl => 
                `<a href="${dl.url}" class="dl-btn">⬇ ${dlText} ${dl.version}</a>`
            ).join('');

            return `
                <article class="mod-card">
                    <img src="${mod.thumbnail}" alt="Thumbnail for ${mName}" class="mod-card-img" loading="lazy">
                    <div class="mod-card-content">
                        <span class="mod-game">${mod.game}</span>
                        <h2 class="mod-title">${mName}</h2>
                        <div class="mod-tags">${tagsHtml}</div>
                        <p class="mod-desc">${mDesc}</p>
                        <div class="mod-downloads">
                            ${downloadsHtml}
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // Apply HTML with a slight fade effect
        modsGrid.style.opacity = 0;
        setTimeout(() => {
            modsGrid.innerHTML = html;
            modsGrid.style.transition = 'opacity 0.4s ease';
            modsGrid.style.opacity = 1;
        }, 50);
    }

    // Event Listeners for controls
    searchInput.addEventListener('input', renderMods);
    sortOrderSelect.addEventListener('change', renderMods);
    gameFilterSelect.addEventListener('change', renderMods);
    
    // Listen to i18n language change events to re-render the grid
    document.addEventListener('languageChanged', renderMods);

    // Initial Fetch
    fetchMods();
});
