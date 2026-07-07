import './load-env.js'; // 반드시 최상단 — 다른 모듈이 process.env 읽기 전에

import express from 'express';
import cookieParser from 'cookie-parser';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { initSchema, seedDirectoryIfEmpty, getDirectoryTree, getDeptImage, getMajorImage } from './db.js';
import authRouter from './auth.js';
import surveysRouter from './surveys.js';
import adminRouter from './admin.js';
import dirRequestsRouter from './dir-requests.js';
import { trackRouter, adminAnalyticsRouter, trackGuard } from './analytics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

await initSchema();
// 학과 디렉터리: 비어있으면 정적 JSON 으로 1회 시드 (이후 DB가 원본)
try {
  const seedJson = JSON.parse(readFileSync(resolve(__dirname, 'data', 'departments.json'), 'utf8'));
  const r = await seedDirectoryIfEmpty(seedJson);
  if (r.seeded) console.log(`[directory] seeded ${r.count} departments from departments.json`);
} catch (e) { console.error('[directory] seed failed:', e.message); }

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd;

// HTTPS proxy(Cloudflare Tunnel / nginx) 뒤에 있을 때 X-Forwarded-Proto 신뢰
app.set('trust proxy', 1);

// /api/track(공개 수집)은 8mb 전역 파서에 닿기 전에 봇·rate limit 차단 + 소용량 파서로 제한.
// (아래 전역 파서는 이미 파싱된 본문을 건너뜀)
app.use('/api/track', trackGuard, express.json({ limit: '64kb' }));
app.use(express.json({ limit: '8mb' })); // 이미지 base64 업로드 허용
app.use(cookieParser());

// === CORS ===
const PRIVATE_IP_RE = /^https?:\/\/(localhost|127\.0\.0\.1|10\.[\d.]+|192\.168\.[\d.]+|172\.(1[6-9]|2[0-9]|3[01])\.[\d.]+)(:\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === process.env.FRONTEND_URL) return true;
  const extras = (process.env.FRONTEND_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (extras.includes(origin)) return true;
  if (isDev && PRIVATE_IP_RE.test(origin)) return true;
  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// === API Routes ===
app.use('/auth', authRouter);
app.use('/api/track', trackRouter);
app.use('/api/surveys', surveysRouter);
app.use('/api/admin/analytics', adminAnalyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/dir-change-requests', dirRequestsRouter);

// 학과 디렉터리 (공개 — 인증 불필요). DB에서 조립해 반환(관리자 편집 즉시 반영).
app.get('/api/departments', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache');
    res.json(await getDirectoryTree());
  } catch (err) {
    console.error('[departments] read failed:', err.message);
    res.status(500).json({ error: 'departments_unavailable' });
  }
});

// 학과/세부전공 이미지 서빙 (DB bytea)
function sendImage(res, row) {
  if (!row || !row.image_data) return res.status(404).end();
  res.set('Content-Type', row.image_mime || 'image/jpeg');
  res.set('Cache-Control', 'no-cache');
  res.send(row.image_data);
}
app.get('/api/departments/:id/image', async (req, res) => {
  try { sendImage(res, await getDeptImage(req.params.id)); }
  catch (e) { res.status(500).end(); }
});
app.get('/api/departments/:id/majors/:mid/image', async (req, res) => {
  try { sendImage(res, await getMajorImage(req.params.mid)); }
  catch (e) { res.status(500).end(); }
});

app.get('/health', (req, res) => res.json({ ok: true }));

// === Production: 프론트 정적 서빙 + SPA fallback ===
// (dev 모드에서는 Vite dev 서버가 따로 5173에서 서빙하므로 스킵)
const distPath = resolve(__dirname, '..', '..', 'frontend', 'dist');
const s30Dist = resolve(__dirname, '..', '..', 's30', 'dist');
if (isProd && existsSync(distPath)) {
  // s30 (arise-ai 마케팅 사이트) — /s30/* 정적 서빙 (ADR 0006)
  if (existsSync(s30Dist)) {
    app.use('/s30', express.static(s30Dist, { extensions: ['html'] }));
    console.log(`[prod] s30 static: ${s30Dist} -> /s30`);
  }
  app.use(express.static(distPath, { index: false, extensions: ['html'] }));
  // 루트(/) → React SPA 게이트웨이(index.html)
  app.get('/', (req, res) => res.sendFile(join(distPath, 'index.html')));
  // SPA fallback — /admin, /login 등 React 라우트 (s30·api·auth 제외)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/auth') || req.path.startsWith('/api') || req.path.startsWith('/s30') || req.path === '/health') return next();
    res.sendFile(join(distPath, 'index.html'));
  });
  console.log(`[prod] Static serving: ${distPath}`);
} else if (isProd) {
  console.warn(`[prod] dist/ 없음 — frontend 빌드 안 됨. 'cd frontend && npm run build' 실행하세요.`);
}

function getLanAddresses() {
  const nets = networkInterfaces();
  const addrs = [];
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) addrs.push(n.address);
    }
  }
  return addrs;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`);
  if (isDev) {
    for (const ip of getLanAddresses()) {
      console.log(`               also  http://${ip}:${PORT}  (LAN)`);
    }
  }
  console.log(`OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'enabled' : 'NOT configured'}`);
  console.log(`Allowed domain: ${process.env.ALLOWED_EMAIL_DOMAIN}`);
  console.log(`CORS allowed: ${process.env.FRONTEND_URL}${isDev ? ' + LAN private-IP origins (dev)' : ''}`);
});
