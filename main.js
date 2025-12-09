// State
let apps = [];
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let isAdmin = false;

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

    // Load apps: Try LocalStorage first, then JSON
    const storedApps = localStorage.getItem('customApps');
    if (storedApps) {
        try {
            apps = JSON.parse(storedApps);
        } catch (e) {
            console.error('Error parsing local apps, reverting to default:', e);
            await loadDefaultApps();
        }
    } else {
        await loadDefaultApps();
    }

    render();
    setupEvents();
    setupAdminEvents();
}

async function loadDefaultApps() {
    try {
        const res = await fetch('./apps.json');
        const data = await res.json();
        apps = data.apps || [];
    } catch (e) {
        console.error('Error loading apps:', e);
        toast('❌ Error cargando apps');
    }
}

// Render
function render() {
    // Featured
    const featured = apps.filter(a => a.featured);
    // Only show header if featured exists
    const featuredSection = $('#featuredGrid').parentElement.querySelector('h3');
    if (featuredSection) featuredSection.style.display = featured.length ? 'block' : 'none';

    $('#featuredGrid').innerHTML = featured.map(cardHTML).join('');

    // All apps
    $('#appsGrid').innerHTML = apps.map(cardHTML).join('');

    // Favorites
    const favApps = apps.filter(a => favorites.includes(a.id));
    $('#favoritesGrid').innerHTML = favApps.map(cardHTML).join('');
    $('#emptyFav').style.display = favApps.length ? 'none' : 'block';
}

function cardHTML(app) {
    const initials = app.name ? app.name.split(' ').map(w => w[0]).join('').substring(0, 2) : '??';
    const isFav = favorites.includes(app.id);

    // Use icon image if available
    const iconContent = app.icon && app.icon.trim() !== ''
        ? `<img src="${app.icon}" alt="${app.name}" onerror="this.onerror=null;this.parentElement.innerHTML='${initials}'">`
        : initials;

    return `
    <div class="card">
      <div class="card-header">
        <div class="card-icon">${iconContent}</div>
        <div class="card-info">
            <h4>${app.name}</h4>
            ${app.version ? `<span class="app-version">v${app.version}</span>` : ''}
            <span class="app-category">${app.category}</span>
        </div>
      </div>
      <p class="card-desc">${app.description}</p>
      <div class="card-footer">
        ${app.url ? `<button class="btn btn-primary" onclick="openApp('${app.id}')">🌐 Abrir</button>` : '<button class="btn" disabled>🚧</button>'}
        <button class="btn btn-icon" onclick="toggleFav('${app.id}')">${isFav ? '⭐' : '☆'}</button>
        ${app.repo ? `<a href="${app.repo}" target="_blank" class="btn btn-icon">📁</a>` : ''}
        
        <!-- Admin Buttons -->
        <div class="admin-btn-group">
            <button class="btn btn-icon" style="background: var(--bg3);" onclick="window.editApp('${app.id}')" title="Editar">✏️</button>
            <button class="btn btn-icon" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;" onclick="window.deleteApp('${app.id}')" title="Eliminar">🗑️</button>
        </div>
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

// --- ADMIN LOGIC ---

function setupAdminEvents() {
    // 1. Open Admin Login
    const adminBtn = $('#adminBtn');
    if (adminBtn) {
        adminBtn.onclick = () => {
            if (isAdmin) {
                // Already admin? Maybe toggle off or just show a toast?
                // Let's allow logging out
                if (confirm('¿Salir del modo administrador?')) {
                    logout();
                }
            } else {
                $('#adminModal').classList.add('show');
                $('#adminPassword').value = '';
                $('#loginError').textContent = '';
                $('#adminPassword').focus();
            }
        };
    }

    // 2. Close Modal Buttons & Logout
    $('#closeAdminLogin').onclick = () => $('#adminModal').classList.remove('show');
    $('#closeAppEditor').onclick = () => $('#appEditorModal').classList.remove('show');

    const logoutBtn = $('#logoutBtn');
    if (logoutBtn) logoutBtn.onclick = logout;

    // 3. Login Action
    $('#loginBtn').onclick = handleLogin;
    $('#adminPassword').onkeypress = (e) => { if (e.key === 'Enter') handleLogin(); };

    // 4. Create New App
    const newAppBtn = $('#newAppBtn');
    if (newAppBtn) {
        newAppBtn.onclick = () => {
            openAppEditor(); // Empty arg = new
        };
    }

    // 5. Save App Form
    $('#appForm').onsubmit = (e) => {
        e.preventDefault();
        saveApp();
    };

    // 6. Download Config
    const downloadBtn = $('#downloadConfigBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ apps }, null, 4));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "apps.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            toast('💾 Configuración descargada');
        };
    }
}

function handleLogin() {
    const pwd = $('#adminPassword').value;
    if (pwd === 'YTmortyYT27') {
        isAdmin = true;
        document.body.dataset.admin = 'true'; // Enable CSS styles
        $('#adminModal').classList.remove('show');

        // Show controls
        $('#adminControls').classList.remove('hidden');
        $('#adminBtn').textContent = '🔓'; // Change lock icon

        toast('🔓 Bienvenido Eric');
    } else {
        $('#loginError').textContent = 'Contraseña incorrecta';
    }
}

function logout() {
    isAdmin = false;
    document.body.dataset.admin = 'false';
    $('#adminControls').classList.add('hidden');
    $('#adminBtn').textContent = '🔒';
    toast('🔒 Modo Admin cerrado');
}

// Exposed to window for onclick handlers
window.editApp = (id) => {
    openAppEditor(apps.find(a => a.id === id));
};

window.deleteApp = (id) => {
    if (!confirm('¿Seguro que quieres eliminar esta app?')) return;
    apps = apps.filter(a => a.id !== id);
    saveAppsLocally();
    render();
    renderAdminDashboard();
    toast('🗑️ App eliminada');
};

function openAppEditor(app = null) {
    const isNew = !app;
    $('#editorTitle').textContent = isNew ? 'Nueva App' : 'Editar App';
    $('#editAppId').value = app ? app.id : ''; // Original ID to track renaming if needed

    // Fill fields
    $('#editName').value = app ? app.name : '';
    $('#editId').value = app ? app.id : '';
    $('#editDesc').value = app ? app.description : '';
    $('#editVersion').value = app ? app.version : '1.0.0';
    $('#editCategory').value = app ? app.category : 'Utilidades';
    $('#editUrl').value = app ? app.url : '';
    $('#editRepo').value = app ? app.repo : '';
    $('#editIcon').value = app ? app.icon : '';
    $('#editFeatured').checked = app ? !!app.featured : false;

    // Enable ID editing only for new apps? Or allow it regardless (be careful of duplicates)
    // For simplicity, allow editing ID but we need to handle "update" vs "create" logic.
    // If we change ID, we should check for conflict.

    $('#appEditorModal').classList.add('show');
}

function saveApp() {
    // Get values
    const newId = $('#editId').value.trim();
    if (!newId) return alert('El ID es obligatorio');

    const newApp = {
        id: newId,
        name: $('#editName').value,
        description: $('#editDesc').value,
        version: $('#editVersion').value,
        category: $('#editCategory').value,
        url: $('#editUrl').value,
        repo: $('#editRepo').value,
        icon: $('#editIcon').value,
        featured: $('#editFeatured').checked
    };

    // Check conflict if it's a NEW app, or if ID changed
    const originalId = $('#editAppId').value; // Hidden input storing original ID
    const isRename = originalId && originalId !== newId;
    const isNew = !originalId;

    if (isNew || isRename) {
        if (apps.find(a => a.id === newId)) {
            return alert(`El ID "${newId}" ya existe. Usa otro.`);
        }
    }

    if (isNew) {
        apps.push(newApp);
    } else {
        // Update existing
        const index = apps.findIndex(a => a.id === originalId);
        if (index !== -1) {
            apps[index] = newApp;
        }
    }

    saveAppsLocally();
    render();

    $('#appEditorModal').classList.remove('show');
    toast('✅ Guardado correctamente');
}

function saveAppsLocally() {
    localStorage.setItem('customApps', JSON.stringify(apps));
}

// Window Actions
window.openApp = (id) => {
    const app = apps.find(a => a.id === id);
    if (app?.url) {
        window.open(app.url, '_blank');
        toast(`🌐 Abriendo ${app.name}...`);
    } else {
        toast('⚠️ Esta app no tiene URL configurada');
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
