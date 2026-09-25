/* Visual effects: scroll reveal, card tilt + pointer light, sparkle bursts.
 * Purely decorative: the site works the same without this file, and it does
 * nothing for visitors who ask for reduced motion. */
(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('fx');

    // ---------- Scroll reveal ----------
    const REVEAL = '.card:not(.skeleton):not(.in), .teaser:not(.in)';
    const io = 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => {
            let n = 0;
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                el.style.setProperty('--d', `${Math.min(n++, 5) * 80}ms`);
                el.classList.add('in');
                io.unobserve(el);
                // Drop the stagger delay afterwards so hover reacts instantly.
                setTimeout(() => el.style.removeProperty('--d'), 1100);
            });
        }, { rootMargin: '0px 0px -6% 0px' })
        : null;

    // Pause looping animations of big decorated blocks while they are off-screen (saves battery).
    const PAUSABLE = '.hero, .featured, .teaser';
    const pauser = 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => entries.forEach(entry =>
            entry.target.classList.toggle('is-paused', !entry.isIntersecting)))
        : null;

    function watch() {
        if (!io) {
            document.querySelectorAll(REVEAL).forEach(el => el.classList.add('in'));
            return;
        }
        io.disconnect(); // cards from the previous render are gone
        document.querySelectorAll(REVEAL).forEach(el => io.observe(el));
        pauser.disconnect();
        document.querySelectorAll(PAUSABLE).forEach(el => pauser.observe(el));
    }
    const grid = document.getElementById('mods-grid');
    const featured = document.getElementById('featured-mod');
    [grid, featured].forEach(el => el && new MutationObserver(watch).observe(el, { childList: true }));
    watch();

    // ---------- Tilt + pointer light (mouse only) ----------
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const TILT = '.card:not(.skeleton), .featured';
    let active = null;
    let frame = 0;
    let px = 0;
    let py = 0;

    function paint() {
        frame = 0;
        if (!active) return;
        const r = active.getBoundingClientRect();
        const x = (px - r.left) / r.width;
        const y = (py - r.top) / r.height;
        active.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        active.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        if (active.classList.contains('card')) {
            active.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
            active.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
        }
    }

    function release(el) {
        el.classList.remove('is-tilting');
        el.style.removeProperty('--rx');
        el.style.removeProperty('--ry');
    }

    document.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse' || !finePointer.matches) return;
        const el = e.target.closest(TILT);
        if (el !== active) {
            if (active) release(active);
            active = el;
            if (el) el.classList.add('is-tilting');
        }
        if (!el) return;
        px = e.clientX;
        py = e.clientY;
        if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', () => {
        if (active) release(active);
        active = null;
    });

    // ---------- Sparkle burst on downloads and copy buttons ----------
    document.addEventListener('click', e => {
        const btn = e.target.closest('.dl-btn, [data-copy], .hero-cta');
        if (!btn) return;
        let x = e.clientX;
        let y = e.clientY;
        if (!x && !y) { // keyboard activation: burst from the button's center
            const r = btn.getBoundingClientRect();
            x = r.left + r.width / 2;
            y = r.top + r.height / 2;
        }
        const burst = document.createElement('div');
        burst.className = 'burst';
        burst.style.left = `${x}px`;
        burst.style.top = `${y}px`;
        for (let i = 0; i < 14; i++) {
            const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
            const dist = 30 + Math.random() * 42;
            const s = document.createElement('i');
            s.style.setProperty('--x', `${(Math.cos(angle) * dist).toFixed(1)}px`);
            s.style.setProperty('--y', `${(Math.sin(angle) * dist).toFixed(1)}px`);
            burst.appendChild(s);
        }
        // Inside the open dialog (top layer) the burst must live in the dialog to be visible.
        (btn.closest('dialog[open]') || document.body).appendChild(burst);
        setTimeout(() => burst.remove(), 900);
    });
})();
