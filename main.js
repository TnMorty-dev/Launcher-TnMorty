// State
let apps = [];
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// DOM
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Init
async function init() {
    // Load theme
    if (localStorage.getItem('theme') === 'light') {
        document.body.dataset.theme = 'light';
        $('#themeBtn').textContent = '☀️';
    }

    // Load apps from apps.json
    try {
        const res = await fetch('./apps.json');
        const data = await res.json();
        apps = data.apps || [];
    } catch (e) {
        console.error('Error loading apps:', e);
    }

    render();
    setupEvents();
}

// Render
function render() {
    // Featured
    const featured = apps.filter(a => a.featured);
    $('#featuredGrid').innerHTML = featured.map(cardHTML).join('');

    // All apps
    $('#appsGrid').innerHTML = apps.map(cardHTML).join('');

    // Favorites
    const favApps = apps.filter(a => favorites.includes(a.id));
    $('#favoritesGrid').innerHTML = favApps.map(cardHTML).join('');
    $('#emptyFav').style.display = favApps.length ? 'none' : 'block';
}

function cardHTML(app) {
    const initials = app.name.split(' ').map(w => w[0]).join('').substring(0, 2);
    const isFav = favorites.includes(app.id);

    // Use icon image if available
    const iconContent = app.icon
        ? `<img src="${app.icon}" alt="${app.name}">`
        : initials;

    return `
    <div class="card">
      <div class="card-header">
        <div class="card-icon">${iconContent}</div>
        <div class="card-info">
          <h4>${app.name}</h4>
          <span>v${app.version} · ${app.category}</span>
        </div>
      </div>
      <p class="card-desc">${app.description}</p>
      <div class="card-footer">
        <button class="btn btn-primary" onclick="openApp('${app.id}')">🌐 Abrir</button>
        <button class="btn btn-icon" onclick="toggleFav('${app.id}')">${isFav ? '⭐' : '☆'}</button>
        ${app.repo ? `<a href="${app.repo}" target="_blank" class="btn btn-icon">📁</a>` : ''}
      </div>
    </div>
  `;
}

// Events
function setupEvents() {
    // Theme toggle
    $('#themeBtn').onclick = () => {
        const isLight = document.body.dataset.theme === 'light';
        document.body.dataset.theme = isLight ? '' : 'light';
        localStorage.setItem('theme', isLight ? 'dark' : 'light');
        $('#themeBtn').textContent = isLight ? '🌙' : '☀️';
    };

    // Tab navigation
    $$('.nav-btn').forEach(btn => {
        btn.onclick = () => {
            $$('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.tab').forEach(t => t.classList.remove('active'));
            $(`#${btn.dataset.tab}`).classList.add('active');
        };
    });

    // Search
    $('#search').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = apps.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q)
        );
        $('#appsGrid').innerHTML = filtered.map(cardHTML).join('');
    };
}

// Actions
window.openApp = (id) => {
    const app = apps.find(a => a.id === id);
    if (app?.url) {
        window.open(app.url, '_blank');
        toast(`🌐 Abriendo ${app.name}...`);
    }
};

window.toggleFav = (id) => {
    const idx = favorites.indexOf(id);
    if (idx === -1) {
        favorites.push(id);
        toast('⭐ Añadido a favoritos');
    } else {
        favorites.splice(idx, 1);
        toast('☆ Eliminado de favoritos');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    render();
};

function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// Start
init();
