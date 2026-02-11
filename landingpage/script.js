// Claude Plugins Marketplace - Interactive Script
// Cyberpunk Developer Console Experience

// ============================================================================
// Plugin Data
// ============================================================================

const plugins = [
    {
        name: 'codebase-oracle',
        description: 'Deep codebase analysis with C4 diagrams, ERD, API maps, and interactive visualization playgrounds.',
        category: 'devtools',
        version: '2.1.0',
        icon: '◈'
    },
    {
        name: 'worktree',
        description: 'Manage git worktrees for parallel development. Create, sync, merge, and cleanup.',
        category: 'devtools',
        version: '1.0.0',
        icon: '⚡'
    },
    {
        name: 'golangci-lint',
        description: 'Efficient Go linting with golangci-lint. Lint only changed code, fix v2 config issues.',
        category: 'devtools',
        version: '1.0.0',
        icon: '◉'
    },
    {
        name: 'ios-device-debug',
        description: 'Debug iOS apps on physical devices. Build, install, launch, capture logs, analyze crashes.',
        category: 'devtools',
        version: '1.0.0',
        icon: '◆'
    },
    {
        name: 'claude-manager',
        description: 'Enable/disable skills based on project context. Reduce skill clutter for specific project types.',
        category: 'devtools',
        version: '1.0.0',
        icon: '◇'
    },
    {
        name: 'remove-bg',
        description: 'Remove background from images and trim transparent edges. Threshold and AI-based methods.',
        category: 'utilities',
        version: '1.0.0',
        icon: '◐'
    },
    {
        name: 'youtube',
        description: 'Search YouTube and extract video transcripts using yt-dlp.',
        category: 'utilities',
        version: '1.0.0',
        icon: '▶'
    },
    {
        name: 'epub-packing',
        description: 'Generate professional EPUB ebooks from Markdown with neo-brutalism covers.',
        category: 'utilities',
        version: '1.0.0',
        icon: '▣'
    },
    {
        name: 'reflect',
        description: 'Learn from Claude Code sessions. Extract reusable knowledge and build CLAUDE.md rules.',
        category: 'utilities',
        version: '1.0.0',
        icon: '◊'
    },
    {
        name: 'mental-models',
        description: '50+ mental models for decision-making, problem-solving, and strategic thinking.',
        category: 'knowledge',
        version: '1.0.0',
        icon: '◉'
    },
    {
        name: 'monitoring-observability',
        description: 'Monitoring strategy, Golden Signals, OpenTelemetry, SLOs, and automation scripts.',
        category: 'knowledge',
        version: '1.0.0',
        icon: '◆'
    },
    {
        name: 'gherkin-refine',
        description: 'Refine ambiguous requests into structured Gherkin format (Given/When/Then).',
        category: 'knowledge',
        version: '1.0.0',
        icon: '◇'
    },
    {
        name: 'neobrutalism',
        description: 'Apply neobrutalism design patterns. Bold borders, hard shadows, vibrant colors.',
        category: 'design',
        version: '1.0.0',
        icon: '■'
    },
    {
        name: 'bun-fullstack-setup',
        description: 'Setup Bun server serving API and static frontend on single port with Vite proxy.',
        category: 'design',
        version: '1.0.0',
        icon: '□'
    }
];

// ============================================================================
// Typewriter Effect
// ============================================================================

const typewriterText = 'discover powerful Claude Code plugins';
let typewriterIndex = 0;
let typewriterElement = null;

function initTypewriter() {
    typewriterElement = document.getElementById('typewriter');
    if (!typewriterElement) return;

    typeWriter();
}

function typeWriter() {
    if (typewriterIndex < typewriterText.length) {
        typewriterElement.textContent += typewriterText.charAt(typewriterIndex);
        typewriterIndex++;
        setTimeout(typeWriter, 50 + Math.random() * 50);
    }
}

// ============================================================================
// Stats Counter Animation
// ============================================================================

function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number[data-count]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const count = parseInt(target.dataset.count);
                animateNumber(target, count);
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => observer.observe(stat));
}

function animateNumber(element, target) {
    let current = 0;
    const increment = target / 30;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 50);
}

// ============================================================================
// Plugin Grid Rendering
// ============================================================================

function renderPlugins(filter = 'all', search = '') {
    const grid = document.getElementById('pluginsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const filtered = plugins.filter(plugin => {
        const matchesCategory = filter === 'all' || plugin.category === filter;
        const matchesSearch = !search ||
            plugin.name.toLowerCase().includes(search.toLowerCase()) ||
            plugin.description.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    filtered.forEach((plugin, index) => {
        const card = createPluginCard(plugin);
        card.style.animationDelay = `${index * 0.05}s`;
        grid.appendChild(card);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span style="color: var(--text-secondary); font-family: var(--font-mono);">
                    No plugins found matching your criteria
                </span>
            </div>
        `;
    }
}

function createPluginCard(plugin) {
    const card = document.createElement('div');
    card.className = 'plugin-card';
    card.dataset.category = plugin.category;

    const installCommand = `/plugin install ${plugin.name}@aiocean-plugins`;

    card.innerHTML = `
        <div class="plugin-icon">${plugin.icon}</div>
        <div class="plugin-info">
            <div class="plugin-name">${plugin.name} <span class="plugin-version">${plugin.version}</span></div>
            <div class="plugin-desc">${plugin.description}</div>
            <div class="plugin-install">
                <code class="plugin-cmd">${installCommand}</code>
                <button class="plugin-copy-btn" onclick="copyToClipboard('${installCommand}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;

    return card;
}

// ============================================================================
// Search & Filter
// ============================================================================

let currentFilter = 'all';
let searchTimeout = null;

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const filterTags = document.querySelectorAll('.filter-tag');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderPlugins(currentFilter, e.target.value);
            }, 150);
        });
    }

    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentFilter = tag.dataset.filter;
            renderPlugins(currentFilter, searchInput?.value || '');
        });
    });
}

// ============================================================================
// Copy to Clipboard
// ============================================================================

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard');
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.querySelector('.toast-message').textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// ============================================================================
// Smooth Scroll
// ============================================================================

function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================================================
// Parallax Effect for Floating Snippets
// ============================================================================

function initParallax() {
    const snippets = document.querySelectorAll('.snippet');
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;

                snippets.forEach((snippet, index) => {
                    const speed = 0.1 + (index * 0.05);
                    const y = scrollY * speed;
                    snippet.style.transform = `translateY(${y}px)`;
                });

                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ============================================================================
// Navigation Scroll Effect
// ============================================================================

function initNavScroll() {
    const nav = document.querySelector('.nav');

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 100) {
            nav.style.background = 'rgba(10, 10, 15, 0.9)';
            nav.style.backdropFilter = 'blur(10px)';
        } else {
            nav.style.background = 'transparent';
            nav.style.backdropFilter = 'none';
        }
    }, { passive: true });
}

// ============================================================================
// Initialize Everything
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initTypewriter();
    animateStats();
    renderPlugins();
    initSearch();
    initParallax();
    initNavScroll();

    // Expose functions to global scope for inline handlers
    window.copyToClipboard = copyToClipboard;
    window.scrollToSection = scrollToSection;
});

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

document.addEventListener('keydown', (e) => {
    // Press '/' to focus search
    if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
    }

    // Press 'Escape' to blur search
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && document.activeElement === searchInput) {
            searchInput.blur();
        }
    }
});
