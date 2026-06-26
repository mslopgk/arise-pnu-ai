import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'node:crypto';
import { db } from './db.js';

const router = express.Router();

// process.env는 함수 호출 시점에 읽음 (.env 로드 타이밍 안전)
const env = (k, fallback) => process.env[k] ?? fallback;
const GOOGLE_CLIENT_ID     = () => env('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = () => env('GOOGLE_CLIENT_SECRET');
const GOOGLE_REDIRECT_URI  = () => env('GOOGLE_REDIRECT_URI');
const JWT_SECRET           = () => env('JWT_SECRET');
const JWT_EXPIRES_IN       = () => env('JWT_EXPIRES_IN', '7d');
const FRONTEND_URL         = () => env('FRONTEND_URL', 'http://localhost:5173');
const ALLOWED_EMAIL_DOMAIN = () => env('ALLOWED_EMAIL_DOMAIN', 'pusan.ac.kr');
const NODE_ENV             = () => env('NODE_ENV', 'development');

const oauthEnabled = () => !!(GOOGLE_CLIENT_ID() && GOOGLE_CLIENT_SECRET());
let _oauthClient = null;
const oauthClient = () => {
  if (!oauthEnabled()) return null;
  if (!_oauthClient) _oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID(), GOOGLE_CLIENT_SECRET(), GOOGLE_REDIRECT_URI());
  return _oauthClient;
};

// === 도메인 게이트 === (임시 if문, 요구사항 그대로)
function isAllowedDomain(email) {
  if (!email) return false;
  return email.toLowerCase().endsWith('@' + ALLOWED_EMAIL_DOMAIN().toLowerCase());
}

function issueJwt(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET(),
    { expiresIn: JWT_EXPIRES_IN() }
  );
}

function setAuthCookie(res, token) {
  const isHttps = NODE_ENV() === 'production' && (res.req?.secure || res.req?.headers['x-forwarded-proto'] === 'https');
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function upsertUser({ google_sub, email, email_verified, name, picture }) {
  // google_sub 없으면 email 기준으로
  const existing = google_sub
    ? await db.prepare('SELECT * FROM users WHERE google_sub = ?').get(google_sub)
    : await db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (existing) {
    return await db.prepare(
      `UPDATE users SET name = ?, picture = ?, email = ?, last_login_at = now() WHERE id = ? RETURNING *`
    ).get(name || existing.name, picture || existing.picture, email, existing.id);
  }
  return await db.prepare(`
    INSERT INTO users (google_sub, email, email_verified, name, picture)
    VALUES (?, ?, ?, ?, ?) RETURNING *
  `).get(google_sub || null, email, email_verified ? 1 : 0, name || null, picture || null);
}

// === 인증 미들웨어 (다른 라우트가 사용) ===
export async function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET());
    const user = await db.prepare('SELECT id, email, name, picture FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'user_not_found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// === Routes ===

// 1) Google OAuth 시작
router.get('/google', (req, res) => {
  if (!oauthEnabled()) {
    return res.status(503).json({
      error: 'oauth_not_configured',
      hint: 'GOOGLE_CLIENT_ID/SECRET가 비어있음. 환경변수 설정 후 재시작하세요.',
    });
  }
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });

  // returnTo는 자체 origin path만 (open redirect 방지)
  const rt = typeof req.query.returnTo === 'string' && req.query.returnTo.startsWith('/') && !req.query.returnTo.startsWith('//')
    ? req.query.returnTo : null;
  if (rt) res.cookie('oauth_return_to', rt, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });

  const url = oauthClient().generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    hd: ALLOWED_EMAIL_DOMAIN(), // UX 힌트 — 서버측 검증이 진짜 게이트
  });
  res.redirect(url);
});

// 2) Google OAuth 콜백
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const cookieState = req.cookies?.oauth_state;

  if (!code || !state || state !== cookieState) {
    return res.redirect(`${FRONTEND_URL()}/login?error=invalid_state`);
  }
  res.clearCookie('oauth_state');

  try {
    const { tokens } = await oauthClient().getToken(code);
    const ticket = await oauthClient().verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID(),
    });
    const payload = ticket.getPayload();
    const { sub, email, email_verified, name, picture } = payload;

    // === 도메인 게이트 ===
    if (!email_verified || !isAllowedDomain(email)) {
      return res.redirect(`${FRONTEND_URL()}/login?error=domain_not_allowed`);
    }

    const user = await upsertUser({ google_sub: sub, email, email_verified, name, picture });
    setAuthCookie(res, issueJwt(user));

    const returnTo = req.cookies?.oauth_return_to;
    res.clearCookie('oauth_return_to');
    const safeRT = (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//'))
      ? returnTo : '/';
    return res.redirect(`${FRONTEND_URL()}${safeRT}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect(`${FRONTEND_URL()}/login?error=oauth_failed`);
  }
});

// 4) 현재 사용자
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// 5) 로그아웃
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(204).end();
});

// 6) 설정 노출 — 프론트에서 OAuth 사용 가능 여부 확인
router.get('/config', (req, res) => {
  res.json({
    oauthEnabled: oauthEnabled(),
    allowedDomain: ALLOWED_EMAIL_DOMAIN(),
  });
});

export default router;
