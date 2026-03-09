// ── VERIFICAR NODE VERSION ──────────────────────────────────────────
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`\n❌ kitBit requiere Node.js 18+. Tienes Node ${process.version}\n`);
  process.exit(1);
}

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ── ADVERTIR si BASE_URL sigue siendo localhost ─────────────────────
if (!process.env.BASE_URL || process.env.BASE_URL.includes('localhost')) {
  console.warn('\n⚠️ ADVERTENCIA: BASE_URL apunta a localhost.');
  console.warn('   Los links de cobro no funcionarán en celulares.');
  console.warn('   Usa Railway o tu dominio real.\n');
}

// ── CORS RESTRINGIDO ────────────────────────────────────────────────
const origenesPermitidos = [
  process.env.BASE_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origenesPermitidos.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── SERVIR FRONTEND ─────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend');

app.use(express.static(frontendPath));

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Página de cobro
app.get('/cobro/:invoice_id', (req, res) => {
  res.sendFile(path.join(frontendPath, 'cobro.html'));
});

// ── RUTAS DE API ────────────────────────────────────────────────────
app.use('/pago', require('./routes/pago'));
app.use('/precio', require('./routes/precio'));
app.use('/registro', require('./routes/registro'));
app.use('/sms-entrada', require('./routes/sms-entrada'));
app.use('/suscripcion', require('./routes/suscripciones'));

// ── RUTA DE SALUD ───────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    sistema: '₿ kitBit Backend',
    estado: 'activo',
    version: '2.1.0',
    modo: process.env.BITSO_API_KEY === 'demo' ? 'DEMO' : 'PRODUCCIÓN',
    node: process.version,
    hora: new Date().toLocaleString('es-MX')
  });
});

// ── API BITSO ───────────────────────────────────────────────────────
app.get('/api/ticker', async (req, res) => {
  try {
    const r = await fetch('https://api.bitso.com/v3/ticker/?book=btc_mxn');
    const data = await r.json();
    res.json(data.payload);
  } catch (err) {
    console.error('Error consultando Bitso:', err.message);
    res.status(500).json({ error: 'Error al consultar precio' });
  }
});

// ── MANEJADOR GLOBAL DE ERRORES ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err.message);
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

// ── ARRANCAR SERVIDOR ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('₿ kitBit Backend v2.1 corriendo');
  console.log(`Local:    http://localhost:${PORT}`);
  console.log(`Público:  ${process.env.BASE_URL || '⚠️ No configurado'}`);
  console.log(`Modo:     ${process.env.BITSO_API_KEY === 'demo' ? '⚡ DEMO' : '🟢 PRODUCCIÓN'}`);
  console.log('');
});