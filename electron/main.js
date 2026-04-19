const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const os = require('os');

// ─── Almacenamiento local ─────────────────────────────────────────────────────

function getDataDir() {
  return path.join(app.getPath('userData'), 'negocio-data');
}
function ensureDataDir() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function getEntityFile(name) {
  return path.join(getDataDir(), `${name}.json`);
}
function readEntity(name) {
  const file = getEntityFile(name);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error(`Error leyendo ${name}:`, e); return []; }
}
function writeEntity(name, data) {
  ensureDataDir();
  fs.writeFileSync(getEntityFile(name), JSON.stringify(data, null, 2), 'utf8');
}
function generateId() { return crypto.randomUUID(); }

// ─── Sistema de usuarios ──────────────────────────────────────────────────────

function getUsersFile() { return path.join(getDataDir(), '_users.json'); }

function readUsers() {
  const file = getUsersFile();
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(getUsersFile(), JSON.stringify(users, null, 2), 'utf8');
}

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function ensureDefaultAdmin() {
  const users = readUsers();
  if (users.length === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    writeUsers([{
      id: generateId(),
      username: 'admin',
      name: 'Administrador',
      passwordHash: hashPassword('admin', salt),
      salt,
      role: 'admin',
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    }]);
  }
}

// ─── Sistema de tokens (en memoria) ──────────────────────────────────────────

const tokens = new Map(); // token → { userId, role, username, name, expires }

function createToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
  tokens.set(token, {
    userId: user.id,
    role: user.role,
    username: user.username,
    name: user.name,
    mustChangePassword: user.mustChangePassword || false,
    expires,
  });
  return token;
}

function verifyToken(token) {
  if (!token) return null;
  const session = tokens.get(token);
  if (!session) return null;
  if (Date.now() > session.expires) { tokens.delete(token); return null; }
  return session;
}

function revokeToken(token) { tokens.delete(token); }

// ─── Validación de contraseña ─────────────────────────────────────────────────

function validatePassword(password) {
  if (!password || password.length < 8) return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'Debe tener al menos una mayúscula';
  if (!/[0-9]/.test(password)) return 'Debe tener al menos un número';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Debe tener al menos un carácter especial';
  return null;
}

// ─── IPC Auth (Electron desktop) ─────────────────────────────────────────────

// Token activo en la sesión de escritorio
let desktopToken = null;

ipcMain.handle('auth:login', (_, username, password) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'Usuario o contraseña incorrectos' };
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) return { success: false, error: 'Usuario o contraseña incorrectos' };
  if (desktopToken) revokeToken(desktopToken);
  desktopToken = createToken(user);
  return { success: true, token: desktopToken, user: { id: user.id, username: user.username, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword } };
});

ipcMain.handle('auth:logout', () => {
  if (desktopToken) { revokeToken(desktopToken); desktopToken = null; }
  return { success: true };
});

ipcMain.handle('auth:check', () => {
  if (!desktopToken) return null;
  return verifyToken(desktopToken);
});

ipcMain.handle('auth:changePassword', (_, currentPassword, newPassword) => {
  if (!desktopToken) return { success: false, error: 'No autenticado' };
  const session = verifyToken(desktopToken);
  if (!session) return { success: false, error: 'Sesión expirada' };

  const validationError = validatePassword(newPassword);
  if (validationError) return { success: false, error: validationError };

  const users = readUsers();
  const idx = users.findIndex(u => u.id === session.userId);
  if (idx === -1) return { success: false, error: 'Usuario no encontrado' };

  const currentHash = hashPassword(currentPassword, users[idx].salt);
  if (currentHash !== users[idx].passwordHash) return { success: false, error: 'Contraseña actual incorrecta' };

  const newSalt = crypto.randomBytes(16).toString('hex');
  users[idx].passwordHash = hashPassword(newPassword, newSalt);
  users[idx].salt = newSalt;
  users[idx].mustChangePassword = false;
  writeUsers(users);

  // Actualizar sesión
  const session2 = tokens.get(desktopToken);
  if (session2) session2.mustChangePassword = false;

  return { success: true };
});

ipcMain.handle('auth:getUsers', () => {
  if (!desktopToken) return { success: false, error: 'No autenticado' };
  const session = verifyToken(desktopToken);
  if (!session || session.role !== 'admin') return { success: false, error: 'Sin permisos' };
  return { success: true, users: readUsers().map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, createdAt: u.createdAt })) };
});

ipcMain.handle('auth:createUser', (_, userData) => {
  if (!desktopToken) return { success: false, error: 'No autenticado' };
  const session = verifyToken(desktopToken);
  if (!session || session.role !== 'admin') return { success: false, error: 'Sin permisos' };

  const { username, name, password, role } = userData;
  if (!username || !name || !password) return { success: false, error: 'Datos incompletos' };

  const validationError = validatePassword(password);
  if (validationError) return { success: false, error: validationError };

  const users = readUsers();
  if (users.find(u => u.username === username)) return { success: false, error: 'El usuario ya existe' };

  const salt = crypto.randomBytes(16).toString('hex');
  const newUser = {
    id: generateId(),
    username,
    name,
    passwordHash: hashPassword(password, salt),
    salt,
    role: role || 'employee',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeUsers(users);
  return { success: true, user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role } };
});

ipcMain.handle('auth:deleteUser', (_, userId) => {
  if (!desktopToken) return { success: false, error: 'No autenticado' };
  const session = verifyToken(desktopToken);
  if (!session || session.role !== 'admin') return { success: false, error: 'Sin permisos' };
  if (session.userId === userId) return { success: false, error: 'No puedes eliminar tu propia cuenta' };

  const users = readUsers();
  writeUsers(users.filter(u => u.id !== userId));
  return { success: true };
});

ipcMain.handle('auth:resetUserPassword', (_, userId, newPassword) => {
  if (!desktopToken) return { success: false, error: 'No autenticado' };
  const session = verifyToken(desktopToken);
  if (!session || session.role !== 'admin') return { success: false, error: 'Sin permisos' };

  const validationError = validatePassword(newPassword);
  if (validationError) return { success: false, error: validationError };

  const users = readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'Usuario no encontrado' };

  const newSalt = crypto.randomBytes(16).toString('hex');
  users[idx].passwordHash = hashPassword(newPassword, newSalt);
  users[idx].salt = newSalt;
  users[idx].mustChangePassword = true;
  writeUsers(users);
  return { success: true };
});

ipcMain.handle('auth:resetApp', () => {
  if (!desktopToken) return { success: false, error: 'No autenticado' };
  const session = verifyToken(desktopToken);
  if (!session || session.role !== 'admin') return { success: false, error: 'Sin permisos' };

  // 1. Borrar todos los datos de negocio
  ['Product', 'CashRegister', 'CashSale', 'InventoryTransaction'].forEach(e => writeEntity(e, []));

  // 2. Borrar configuración (categorías personalizadas, etc.)
  writeSettings({});

  // 3. Borrar todos los usuarios y recrear admin por defecto
  writeUsers([]);
  ensureDefaultAdmin();

  // 4. Revocar todos los tokens activos
  tokens.clear();
  desktopToken = null;

  return { success: true };
});

// ─── Helpers BD ───────────────────────────────────────────────────────────────

function sortRecords(records, sortKey) {
  if (!sortKey) return records;
  const desc = sortKey.startsWith('-');
  const key = desc ? sortKey.slice(1) : sortKey;
  return [...records].sort((a, b) => {
    const av = a[key] ?? '', bv = b[key] ?? '';
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}
function filterRecords(records, query) {
  if (!query || Object.keys(query).length === 0) return records;
  return records.filter(record => Object.entries(query).every(([key, value]) => record[key] === value));
}

// ─── IPC BD ───────────────────────────────────────────────────────────────────

ipcMain.handle('db:list', (_, entity, sort, limit) => {
  let records = readEntity(entity);
  records = sortRecords(records, sort);
  if (limit && limit > 0) records = records.slice(0, limit);
  return records;
});
ipcMain.handle('db:filter', (_, entity, query, sort, limit) => {
  let records = readEntity(entity);
  records = filterRecords(records, query);
  records = sortRecords(records, sort);
  if (limit && limit > 0) records = records.slice(0, limit);
  return records;
});
ipcMain.handle('db:create', (_, entity, data) => {
  const records = readEntity(entity);
  const now = new Date().toISOString();
  const newRecord = { ...data, id: generateId(), created_date: now, updated_date: now };
  records.push(newRecord);
  writeEntity(entity, records);
  return newRecord;
});
ipcMain.handle('db:update', (_, entity, id, data) => {
  const records = readEntity(entity);
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) throw new Error(`Registro ${id} no encontrado en ${entity}`);
  records[idx] = { ...records[idx], ...data, id, created_date: records[idx].created_date, updated_date: new Date().toISOString() };
  writeEntity(entity, records);
  return records[idx];
});
ipcMain.handle('db:delete', (_, entity, id) => {
  writeEntity(entity, readEntity(entity).filter(r => r.id !== id));
  return { success: true };
});
ipcMain.handle('db:deleteAll', (_, entity) => {
  writeEntity(entity, []);
  return { success: true };
});
ipcMain.handle('db:exportAll', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Exportar datos',
    defaultPath: `mi-negocio-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { success: false };
  const backup = {
    exportDate: new Date().toISOString(),
    Product: readEntity('Product'),
    CashRegister: readEntity('CashRegister'),
    CashSale: readEntity('CashSale'),
    InventoryTransaction: readEntity('InventoryTransaction'),
  };
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');
  return { success: true, filePath };
});


// ─── Settings (categorías personalizadas, etc.) ───────────────────────────────

function getSettingsFile() { return path.join(getDataDir(), '_settings.json'); }

function readSettings() {
  const file = getSettingsFile();
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return {}; }
}

function writeSettings(data) {
  ensureDataDir();
  fs.writeFileSync(getSettingsFile(), JSON.stringify(data, null, 2), 'utf8');
}

ipcMain.handle('settings:get', () => readSettings());
ipcMain.handle('settings:set', (_, data) => { writeSettings(data); return { success: true }; });

// ─── Servidor HTTP ────────────────────────────────────────────────────────────

const SERVER_PORT = 3001;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const virtualNames = ['virtualbox', 'vmware', 'vbox', 'hyper-v', 'wsl', 'loopback', 'pseudo', 'tunnel', 'bluetooth', 'teredo', 'isatap', 'vpn'];
  const virtualSubnets = ['192.168.56.', '172.16.', '172.17.', '172.18.', '172.19.'];
  function getAdapterPriority(name) {
    const n = name.toLowerCase();
    if (n.includes('ethernet') || n.includes('eth')) return 0;
    if (n.includes('wi-fi') || n.includes('wifi') || n.includes('wlan') || n.includes('wireless')) return 1;
    return 2;
  }
  const candidates = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (virtualNames.some(k => name.toLowerCase().includes(k))) continue;
    for (const iface of addrs) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (virtualSubnets.some(s => iface.address.startsWith(s))) continue;
      const isLAN = iface.address.startsWith('192.168.') || iface.address.startsWith('10.');
      if (!isLAN) continue;
      candidates.push({ address: iface.address, priority: getAdapterPriority(name) });
    }
  }
  if (candidates.length === 0) return '127.0.0.1';
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0].address;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); } });
  });
}

function getTokenFromReq(req) {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function handleHttpAuth(req, res, parsed) {
  const action = req.url.replace('/api/auth/', '').split('?')[0];

  if (action === 'login') {
    const { username, password } = parsed;
    const users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
      res.writeHead(401); res.end(JSON.stringify({ success: false, error: 'Usuario o contraseña incorrectos' })); return;
    }
    const token = createToken(user);
    res.writeHead(200); res.end(JSON.stringify({ success: true, token, user: { id: user.id, username: user.username, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword } }));
    return;
  }

  // Resto de endpoints requieren token
  const token = getTokenFromReq(req);
  const session = verifyToken(token);
  if (!session) { res.writeHead(401); res.end(JSON.stringify({ success: false, error: 'No autenticado' })); return; }

  if (action === 'logout') {
    revokeToken(token); res.writeHead(200); res.end(JSON.stringify({ success: true })); return;
  }

  if (action === 'me') {
    res.writeHead(200); res.end(JSON.stringify({ success: true, user: { userId: session.userId, username: session.username, name: session.name, role: session.role, mustChangePassword: session.mustChangePassword } })); return;
  }

  if (action === 'changePassword') {
    const { currentPassword, newPassword } = parsed;
    const validationError = validatePassword(newPassword);
    if (validationError) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: validationError })); return; }
    const users = readUsers();
    const idx = users.findIndex(u => u.id === session.userId);
    if (idx === -1) { res.writeHead(404); res.end(JSON.stringify({ success: false, error: 'Usuario no encontrado' })); return; }
    if (hashPassword(currentPassword, users[idx].salt) !== users[idx].passwordHash) {
      res.writeHead(400); res.end(JSON.stringify({ success: false, error: 'Contraseña actual incorrecta' })); return;
    }
    const newSalt = crypto.randomBytes(16).toString('hex');
    users[idx].passwordHash = hashPassword(newPassword, newSalt);
    users[idx].salt = newSalt;
    users[idx].mustChangePassword = false;
    writeUsers(users);
    const sess = tokens.get(token);
    if (sess) sess.mustChangePassword = false;
    res.writeHead(200); res.end(JSON.stringify({ success: true })); return;
  }

  if (action === 'getUsers') {
    if (session.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ success: false, error: 'Sin permisos' })); return; }
    res.writeHead(200); res.end(JSON.stringify({ success: true, users: readUsers().map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, createdAt: u.createdAt })) })); return;
  }

  if (action === 'createUser') {
    if (session.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ success: false, error: 'Sin permisos' })); return; }
    const { username, name, password, role } = parsed;
    const validationError = validatePassword(password);
    if (validationError) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: validationError })); return; }
    const users = readUsers();
    if (users.find(u => u.username === username)) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: 'El usuario ya existe' })); return; }
    const salt = crypto.randomBytes(16).toString('hex');
    const newUser = { id: generateId(), username, name, passwordHash: hashPassword(password, salt), salt, role: role || 'employee', mustChangePassword: false, createdAt: new Date().toISOString() };
    users.push(newUser);
    writeUsers(users);
    res.writeHead(200); res.end(JSON.stringify({ success: true, user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role } })); return;
  }

  if (action === 'deleteUser') {
    if (session.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ success: false, error: 'Sin permisos' })); return; }
    const { userId } = parsed;
    if (session.userId === userId) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: 'No puedes eliminar tu propia cuenta' })); return; }
    writeUsers(readUsers().filter(u => u.id !== userId));
    res.writeHead(200); res.end(JSON.stringify({ success: true })); return;
  }

  if (action === 'resetUserPassword') {
    if (session.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ success: false, error: 'Sin permisos' })); return; }
    const { userId, newPassword } = parsed;
    const validationError = validatePassword(newPassword);
    if (validationError) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: validationError })); return; }
    const users = readUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) { res.writeHead(404); res.end(JSON.stringify({ success: false, error: 'Usuario no encontrado' })); return; }
    const newSalt = crypto.randomBytes(16).toString('hex');
    users[idx].passwordHash = hashPassword(newPassword, newSalt);
    users[idx].salt = newSalt;
    users[idx].mustChangePassword = true;
    writeUsers(users);
    res.writeHead(200); res.end(JSON.stringify({ success: true })); return;
  }

  if (action === 'resetApp') {
    if (session.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ success: false, error: 'Sin permisos' })); return; }
    // Borrar todos los datos de negocio
    ['Product', 'CashRegister', 'CashSale', 'InventoryTransaction'].forEach(e => writeEntity(e, []));
    // Borrar configuración
    writeSettings({});
    // Resetear usuarios y recrear admin por defecto
    writeUsers([]);
    ensureDefaultAdmin();
    // Revocar todos los tokens
    tokens.clear();
    res.writeHead(200); res.end(JSON.stringify({ success: true })); return;
  }

  res.writeHead(404); res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
}

function handleHttpDb(req, res, parsed, session) {
  const action = req.url.replace('/api/db/', '').split('?')[0];
  try {
    let result;
    switch (action) {
      case 'list': { const { entity, sort, limit } = parsed; let r = readEntity(entity); r = sortRecords(r, sort); result = limit ? r.slice(0, limit) : r; break; }
      case 'filter': { const { entity, query, sort, limit } = parsed; let r = filterRecords(readEntity(entity), query); r = sortRecords(r, sort); result = limit ? r.slice(0, limit) : r; break; }
      case 'create': { const { entity, data } = parsed; const r = readEntity(entity); const now = new Date().toISOString(); const n = { ...data, id: generateId(), created_date: now, updated_date: now }; r.push(n); writeEntity(entity, r); result = n; break; }
      case 'update': {
        if (session.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ error: 'Sin permisos' })); return; }
        const { entity, id, data } = parsed; const r = readEntity(entity); const idx = r.findIndex(x => x.id === id);
        if (idx === -1) throw new Error('Registro no encontrado');
        r[idx] = { ...r[idx], ...data, id, updated_date: new Date().toISOString() }; writeEntity(entity, r); result = r[idx]; break;
      }
      case 'delete': {
        if (session.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ error: 'Sin permisos' })); return; }
        const { entity, id } = parsed; writeEntity(entity, readEntity(entity).filter(r => r.id !== id)); result = { success: true }; break;
      }
      case 'deleteAll': {
        if (session.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ error: 'Sin permisos' })); return; }
        const { entity } = parsed; writeEntity(entity, []); result = { success: true }; break;
      }
      default: res.writeHead(404); res.end(JSON.stringify({ error: 'Acción no encontrada' })); return;
    }
    res.writeHead(200); res.end(JSON.stringify(result));
  } catch (e) {
    res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
  }
}

function startHttpServer() {
  const distPath = path.join(__dirname, '../dist');
  const server = http.createServer(async (req, res) => {
    setCORS(res);
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const parsed = await parseBody(req);

    if (req.url.startsWith('/api/auth/')) {
      handleHttpAuth(req, res, parsed); return;
    }


    if (req.url.startsWith('/api/settings/')) {
      const action = req.url.replace('/api/settings/', '').split('?')[0];
      const token = getTokenFromReq(req);
      const session = verifyToken(token);
      if (!session) { res.writeHead(401); res.end(JSON.stringify({ error: 'No autenticado' })); return; }
      if (action === 'get') {
        res.writeHead(200); res.end(JSON.stringify(readSettings())); return;
      }
      if (action === 'set') {
        if (session.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ error: 'Sin permisos' })); return; }
        writeSettings(parsed);
        res.writeHead(200); res.end(JSON.stringify({ success: true })); return;
      }
      res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' })); return;
    }

    if (req.url.startsWith('/api/db/')) {
      const token = getTokenFromReq(req);
      const session = verifyToken(token);
      if (!session) { res.writeHead(401); res.end(JSON.stringify({ error: 'No autenticado' })); return; }
      handleHttpDb(req, res, parsed, session); return;
    }

    // Archivos estáticos
    res.removeHeader('Content-Type');
    let reqPath = req.url.split('?')[0];
    let filePath = path.join(distPath, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(distPath, 'index.html');
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  server.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log('Servidor local: http://' + getLocalIP() + ':' + SERVER_PORT);
  });
  server.on('error', err => console.error('Error servidor HTTP:', err.message));
  return server;
}

ipcMain.handle('server:getInfo', () => ({
  ip: getLocalIP(), port: SERVER_PORT, url: 'http://' + getLocalIP() + ':' + SERVER_PORT,
}));

// ─── Ventana principal ────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 960, minHeight: 600,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    title: 'Mi Negocio', show: false,
  });
  win.once('ready-to-show', () => win.show());
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) { win.loadURL('http://localhost:5173'); win.webContents.openDevTools(); }
  else { win.loadFile(path.join(__dirname, '../dist/index.html')); }
}


// ─── Diálogo para seleccionar imagen local ────────────────────────────────────

ipcMain.handle('dialog:openImageFile', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Seleccionar imagen de producto',
    filters: [
      { name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'] },
    ],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths[0]; // devuelve la ruta absoluta nativa
});

app.whenReady().then(() => {
  ensureDataDir();
  ensureDefaultAdmin();
  startHttpServer();

  // ── Protocolo para imágenes locales ──────────────────────────────────────
  // Permite que el renderer cargue archivos del disco duro del usuario
  // usando la URL custom: local-file:///C:/ruta/imagen.png
  protocol.handle('local-file', (request) => {
    const filePath = decodeURIComponent(request.url.slice('local-file://'.length));
    return net.fetch('file://' + filePath);
  });

  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
