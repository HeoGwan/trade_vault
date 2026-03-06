/**
 * 거래 데이터 & 다운로드 라우터 — /api/trades
 */
const express = require('express');
const router = express.Router();
const { generateTrades } = require('../data/users');

/* ─── 인증 미들웨어 ─── */
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });
    }
    next();
}

/* ─── 서버 시작 시 한 번 데이터 생성 (요청마다 같은 데이터 반환) ─── */
let _cachedTrades = null;
function getTrades() {
    if (!_cachedTrades) _cachedTrades = generateTrades(300);
    return _cachedTrades;
}

/* ─────────────────────────────────────────────
   GET /api/trades
   거래 내역 조회 (페이지네이션 + 필터)
───────────────────────────────────────────── */
router.get('/', requireAuth, (req, res) => {
    let data = getTrades();

    const { q, status, type, page = 1, limit = 15 } = req.query;

    // 검색
    if (q) {
        const lower = q.toLowerCase();
        data = data.filter(r =>
            r.trade_id.toLowerCase().includes(lower) ||
            r.stock_name.toLowerCase().includes(lower) ||
            r.counterparty.toLowerCase().includes(lower)
        );
    }
    // 상태 필터
    if (status && status !== 'all') {
        data = data.filter(r => r.status === status);
    }
    // 유형 필터
    if (type && type !== 'all') {
        data = data.filter(r => r.trade_type === type);
    }

    const totalCount = data.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const start = (pageNum - 1) * limitNum;
    const slice = data.slice(start, start + limitNum);

    // 통계 (필터 전 전체 기준)
    const all = getTrades();
    const stats = {
        totalTrades: all.length,
        totalAmount: all.reduce((s, r) => s + r.trade_amount, 0),
        completedCount: all.filter(r => r.status === '완료').length,
        pendingCount: all.filter(r => r.status === '처리중').length,
    };

    res.json({
        ok: true,
        stats,
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        data: slice,
    });
});

/* ─────────────────────────────────────────────
   GET /api/trades/download/csv
   CSV 파일 다운로드
───────────────────────────────────────────── */
router.get('/download/csv', requireAuth, (req, res) => {
    const { status, type, q } = req.query;
    let data = getTrades();

    if (q) {
        const lower = q.toLowerCase();
        data = data.filter(r =>
            r.trade_id.toLowerCase().includes(lower) ||
            r.stock_name.toLowerCase().includes(lower) ||
            r.counterparty.toLowerCase().includes(lower)
        );
    }
    if (status && status !== 'all') data = data.filter(r => r.status === status);
    if (type && type !== 'all') data = data.filter(r => r.trade_type === type);

    const headers = [
        '거래번호', '거래일자', '거래일시', '종목코드', '종목명', '섹터',
        '거래유형', '수량(주)', '단가(원)', '거래금액(원)', '거래처', '상태', '비고'
    ];

    const rows = data.map(r => [
        r.trade_id, r.trade_date, r.trade_time, r.stock_code,
        r.stock_name, r.sector, r.trade_type, r.quantity,
        r.unit_price, r.trade_amount, r.counterparty, r.status, r.note
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    const ts = getTimestamp();
    const label = status && status !== 'all' ? `_${status}` : '';
    const filename = encodeURIComponent(`TradeVault_거래내역${label}_${ts}.csv`);

    console.log(`📥 CSV 다운로드: ${req.session.user.name} — ${data.length}건`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
    res.send(csv);
});

/* ─────────────────────────────────────────────
   GET /api/trades/download/json
   JSON 파일 다운로드
───────────────────────────────────────────── */
router.get('/download/json', requireAuth, (req, res) => {
    const { status, type, q } = req.query;
    let data = getTrades();

    if (q) {
        const lower = q.toLowerCase();
        data = data.filter(r =>
            r.trade_id.toLowerCase().includes(lower) ||
            r.stock_name.toLowerCase().includes(lower) ||
            r.counterparty.toLowerCase().includes(lower)
        );
    }
    if (status && status !== 'all') data = data.filter(r => r.status === status);
    if (type && type !== 'all') data = data.filter(r => r.trade_type === type);

    const payload = JSON.stringify({
        exportedAt: new Date().toISOString(),
        exportedBy: req.session.user.name,
        totalRecords: data.length,
        filters: { q, status, type },
        data,
    }, null, 2);

    const ts = getTimestamp();
    const label = status && status !== 'all' ? `_${status}` : '';
    const filename = encodeURIComponent(`TradeVault_거래내역${label}_${ts}.json`);

    console.log(`📥 JSON 다운로드: ${req.session.user.name} — ${data.length}건`);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Length', Buffer.byteLength(payload, 'utf8'));
    res.send(payload);
});

/* ─── 헬퍼 ─── */
function getTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

module.exports = router;
