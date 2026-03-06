/**
 * TradeVault — Express 백엔드 서버
 * =====================================
 * PORT: 3001
 */
'use strict';

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const authRouter = require('./routes/auth');
const tradesRouter = require('./routes/trades');

const app = express();
const PORT = process.env.PORT || 4000;

/* ─── CORS ─── */
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:4000',
        'http://127.0.0.1:4000',
        'null',              // file:// 로컬 파일 열 때
    ],
    credentials: true,   // 쿠키(세션) 전송 허용
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));

/* ─── JSON 파서 ─── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ─── 세션 ─── */
app.use(session({
    name: 'tv_session',
    secret: 'tradevault-super-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000,   // 1시간
    },
}));

/* ─── 정적 파일 (프론트엔드) ─── */
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ─── API 라우터 ─── */
app.use('/api/auth', authRouter);
app.use('/api/trades', tradesRouter);

/* ─── 헬스체크 ─── */
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'TradeVault API',
        time: new Date().toISOString(),
        session: req.session.user ? req.session.user.username : null,
    });
});

/* ─── SPA fallback — 모든 다른 경로는 index.html ─── */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

/* ─── 에러 핸들러 ─── */
app.use((err, req, res, next) => {
    console.error('❌ 서버 오류:', err.message);
    res.status(500).json({ ok: false, message: '서버 내부 오류가 발생했습니다.' });
});

/* ─── 서버 시작 ─── */
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║        TradeVault API Server             ║');
    console.log(`║  🚀  http://localhost:${PORT}                ║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('📋 계정 목록:');
    console.log('  admin    / Admin@1234   (최고관리자)');
    console.log('  trader1  / Trader#2024  (선임트레이더)');
    console.log('  manager  / Mgr$5678     (팀장)');
    console.log('  analyst  / Analyst!9900 (데이터분석가)');
    console.log('  guest    / Guest@0000   (조회전용)');
    console.log('');
    console.log('📡 API 엔드포인트:');
    console.log('  POST /api/auth/login');
    console.log('  POST /api/auth/logout');
    console.log('  GET  /api/auth/me');
    console.log('  GET  /api/trades');
    console.log('  GET  /api/trades/download/csv');
    console.log('  GET  /api/trades/download/json');
    console.log('');
});
