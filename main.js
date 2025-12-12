// State
let apps = [];
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let isAdmin = false;

// Deobfuscation helper
const deobfuscate = (s) => atob(s.split('').reverse().join(''));

// GitHub Config - Sincronización automática (token ofuscado)
const GITHUB_CONFIG = {
    // Token ofuscado en Base64 invertido
    _t: 'wcjNsdEM59URMdlMBh1SRpHd5pXcMpXNxo2dJR0M5JHdx5WeupGTuNFWVtGdUxWQWF3asZDR3l1bXhzXthGWrZHZodTVwpkVwEkTK9USzIUMx8FdhB3XiVHa0l2Z',
    get token() { return deobfuscate(this._t); },
    repo: 'TnMorty-dev/Launcher-TnMorty',
    branch: 'main',
    filePath: 'public/apps.json'
};

// Hash SHA-256 de la contraseña admin
const ADMIN_PWD_HASH = 'a82fe4574ef9a4fb064a19b0386fb887f320b34069d4090a3d037ffe32145669';

// Hash function for password verification
async function hashPassword(pwd) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

    // SIEMPRE cargar apps desde el JSON (fuente de verdad)
    // Esto evita problemas de caché entre navegadores
    await loadDefaultApps();

    render();
    setupEvents();
    setupAdminEvents();
}

async function loadDefaultApps() {
    // Intentar cargar desde la raíz (Vite sirve public/ desde raíz)
    const paths = ['./apps.json', './public/apps.json'];
    // Cache busting: añadir timestamp para forzar recarga sin caché
    const cacheBuster = `?t=${Date.now()}`;

    for (const path of paths) {
        try {
            console.log(`Intentando cargar apps desde: ${path}`);
            const res = await fetch(path + cacheBuster, {
                cache: 'no-store' // Forzar petición sin caché
            });
            if (!res.ok) {
                console.warn(`No se pudo cargar desde ${path}: ${res.status}`);
                continue;
            }
            const data = await res.json();
            apps = data.apps || [];
            console.log(`Apps cargadas exitosamente desde ${path}:`, apps);
            return; // Éxito, salir
        } catch (e) {
            console.warn(`Error cargando desde ${path}:`, e);
        }
    }

    console.error('No se pudieron cargar las apps de ninguna ubicación');
    toast('❌ Error cargando apps');
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
    <div class="card" onclick="openPreview('${app.id}')">
      <div class="card-header">
        <div class="card-icon">${iconContent}</div>
        <div class="card-info">
            <h4>${app.name}</h4>
            ${app.version ? `<span class="app-version">v${app.version}</span>` : ''}
            <span class="app-category">${app.category}</span>
        </div>
      </div>
      <p class="card-desc">${app.description}</p>
      <div class="card-footer" onclick="event.stopPropagation()">
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

    // Preview Modal close
    $('#closePreview').onclick = () => $('#appPreviewModal').classList.remove('show');
    $('#appPreviewModal').onclick = (e) => {
        if (e.target.id === 'appPreviewModal') {
            $('#appPreviewModal').classList.remove('show');
        }
    };
}

// Open App Preview
window.openPreview = (id) => {
    const app = apps.find(a => a.id === id);
    if (!app) return;

    const initials = app.name ? app.name.split(' ').map(w => w[0]).join('').substring(0, 2) : '??';
    const isFav = favorites.includes(app.id);

    // Set icon
    const iconEl = $('#previewIcon');
    if (app.icon && app.icon.trim() !== '') {
        iconEl.innerHTML = `<img src="${app.icon}" alt="${app.name}" onerror="this.onerror=null;this.parentElement.innerHTML='${initials}'">`;
    } else {
        iconEl.textContent = initials;
    }

    // Set info
    $('#previewName').textContent = app.name;
    $('#previewVersion').textContent = app.version ? `v${app.version}` : '';
    $('#previewCategory').textContent = app.category;
    $('#previewDesc').textContent = app.description;

    // Set actions
    $('#previewActions').innerHTML = `
        ${app.url ? `<button class="btn btn-primary" onclick="openApp('${app.id}')">🌐 Abrir App</button>` : '<button class="btn" disabled>🚧 No disponible</button>'}
        <button class="btn btn-icon" onclick="toggleFav('${app.id}'); openPreview('${app.id}');">${isFav ? '⭐' : '☆'}</button>
        ${app.repo ? `<a href="${app.repo}" target="_blank" class="btn" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3);">📁 Ver Código</a>` : ''}
    `;

    $('#appPreviewModal').classList.add('show');
};

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

async function handleLogin() {
    const pwd = $('#adminPassword').value;
    const pwdHash = await hashPassword(pwd);

    // Comparar hash (la contraseña nunca se ve en el código)
    if (pwdHash === ADMIN_PWD_HASH) {
        isAdmin = true;
        document.body.dataset.admin = 'true';
        $('#adminModal').classList.remove('show');
        $('#adminControls').classList.remove('hidden');
        $('#adminBtn').textContent = '🔓';
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
    syncToGitHub(); // Sincronizar con GitHub
    render();
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
    syncToGitHub(); // Sincronizar con GitHub
    render();

    $('#appEditorModal').classList.remove('show');
}

function saveAppsLocally() {
    localStorage.setItem('customApps', JSON.stringify(apps));
}

// --- GitHub Sync ---
async function syncToGitHub() {
    if (!GITHUB_CONFIG.token || !GITHUB_CONFIG.repo) {
        console.warn('GitHub no configurado');
        return false;
    }

    try {
        toast('🔄 Sincronizando con GitHub...');

        // 1. Obtener el SHA actual del archivo
        const getUrl = `https://api.github.com/repos/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}?ref=${GITHUB_CONFIG.branch}`;
        const getRes = await fetch(getUrl, {
            headers: {
                'Authorization': `Bearer ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let sha = null;
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        // 2. Crear el nuevo contenido
        const content = JSON.stringify({ apps }, null, 4);
        const base64Content = btoa(unescape(encodeURIComponent(content)));

        // 3. Actualizar el archivo
        const putUrl = `https://api.github.com/repos/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}`;
        const putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `🚀 Actualizado apps.json desde Admin Panel`,
                content: base64Content,
                branch: GITHUB_CONFIG.branch,
                ...(sha && { sha })
            })
        });

        if (putRes.ok) {
            toast('✅ Sincronizado con GitHub');
            return true;
        } else {
            const error = await putRes.json();
            console.error('GitHub sync error:', error);
            toast('❌ Error al sincronizar: ' + (error.message || 'Error desconocido'));
            return false;
        }
    } catch (e) {
        console.error('GitHub sync error:', e);
        toast('❌ Error de conexión con GitHub');
        return false;
    }
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
