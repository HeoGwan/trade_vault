/**
 * 인증 라우터 — /api/auth
 */
const express = require('express');
const router = express.Router();
const { USERS } = require('../data/users');

/* ─── POST /api/auth/login ─── */
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ ok: false, message: '아이디와 비밀번호를 입력해주세요.' });
    }

    const user = USERS.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 세션에 사용자 정보 저장
    req.session.user = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
        email: user.email,
        loginAt: new Date().toISOString(),
    };

    console.log(`✅ 로그인: ${user.name} (${user.username}) — ${new Date().toLocaleString('ko-KR')}`);

    return res.json({
        ok: true,
        message: '로그인 성공',
        user: req.session.user,
    });
});

/* ─── POST /api/auth/logout ─── */
router.post('/logout', (req, res) => {
    const name = req.session.user?.name || '알 수 없음';
    req.session.destroy(err => {
        if (err) return res.status(500).json({ ok: false, message: '로그아웃 오류' });
        res.clearCookie('tv_session');
        console.log(`👋 로그아웃: ${name}`);
        res.json({ ok: true, message: '로그아웃 성공' });
    });
});

/* ─── GET /api/auth/me ─── */
router.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });
    }
    res.json({ ok: true, user: req.session.user });
});

module.exports = router;
