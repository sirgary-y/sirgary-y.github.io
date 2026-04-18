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
            modsGrid.innerHTML = `<div class="no-results">The abyssal archives refused to open. Please try again later.</div>`;
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
            const searchSource = (mod.name + ' ' + mod.description + ' ' + mod.tags.join(' ')).toLowerCase();
            const matchesSearch = searchSource.includes(searchTerm);
            const matchesGame = gameFilter === 'All' ? true : mod.game === gameFilter;
            return matchesSearch && matchesGame;
        });

        // Sort
        filteredMods.sort((a, b) => {
            if (sortValue === 'newest') {
                return new Date(b.releaseDate) - new Date(a.releaseDate);
            } else if (sortValue === 'oldest') {
                return new Date(a.releaseDate) - new Date(b.releaseDate);
            } else if (sortValue === 'name-asc') {
                return a.name.localeCompare(b.name);
            } else if (sortValue === 'name-desc') {
                return b.name.localeCompare(a.name);
            }
            return 0;
        });

        // Create HTML Output
        if (filteredMods.length === 0) {
            modsGrid.innerHTML = `
                <div class="no-results">
                    <p>No artifacts unearthed matching your criteria.</p>
                </div>
            `;
            return;
        }

        const html = filteredMods.map(mod => {
            const tagsHtml = mod.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
            const downloadsHtml = mod.downloads.map(dl => 
                `<a href="${dl.url}" class="dl-btn">⬇ Download ${dl.version}</a>`
            ).join('');

            return `
                <article class="mod-card">
                    <img src="${mod.thumbnail}" alt="Thumbnail for ${mod.name}" class="mod-card-img" loading="lazy">
                    <div class="mod-card-content">
                        <span class="mod-game">${mod.game}</span>
                        <h2 class="mod-title">${mod.name}</h2>
                        <div class="mod-tags">${tagsHtml}</div>
                        <p class="mod-desc">${mod.description}</p>
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

    // Initial Fetch
    fetchMods();
});
