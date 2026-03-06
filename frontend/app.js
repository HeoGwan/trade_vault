/**
 * TradeVault — Frontend App
 * =============================================
 * 백엔드 API 서버(localhost:3001)와 통신
 * - 로그인 / 로그아웃 (서버 세션)
 * - 거래 데이터 조회
 * - 서버 파일 다운로드 (CSV / JSON)
 */
'use strict';

const API = '/api';
const PAGE_SIZE = 15;

/* ── 상태 ── */
const state = {
    user: null,
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    search: '',
    status: 'all',
    type: 'all',
};

/* ══════════════════════════════════════════════
   API 헬퍼
══════════════════════════════════════════════ */
async function api(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
        credentials: 'include',          // 세션 쿠키 자동 전송
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        ...opts,
    });
    const data = await res.json().catch(() => ({ ok: false, message: '응답 파싱 오류' }));
    if (!res.ok || !data.ok) throw new Error(data.message || '서버 오류');
    return data;
}

/* ══════════════════════════════════════════════
   서버 파일 다운로드 (window.location 방식)
   — 쿠키 세션이 자동으로 붙어 인증됨
══════════════════════════════════════════════ */
function buildDownloadUrl(path, extraParams = {}) {
    const params = new URLSearchParams({
        q: state.search,
        status: state.status,
        type: state.type,
        ...extraParams,
    });
    return `${API}${path}?${params.toString()}`;
}

async function triggerDownload(url, btnEl) {
    /* 서버가 Content-Disposition: attachment 헤더를 보내므로
       <a> 태그 클릭 방식으로 브라우저가 파일을 저장함 */
    setButtonLoading(btnEl, true);
    try {
        // fetch로 응답 헤더만 먼저 확인 (인증 실패 감지)
        const res = await fetch(url, { credentials: 'include', method: 'HEAD' }).catch(() => null);
        if (res && res.status === 401) throw new Error('로그인이 필요합니다.');

        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        await sleep(600); // 다운로드 시작 대기
        showToast('✅', '파일 다운로드가 시작되었습니다.');
    } catch (err) {
        showToast('❌', err.message);
    } finally {
        setButtonLoading(btnEl, false);
    }
}

/* ══════════════════════════════════════════════
   테이블 & 통계 렌더링
══════════════════════════════════════════════ */
function fmtKRW(n) { return '₩' + Number(n).toLocaleString('ko-KR'); }

function renderStats(stats) {
    document.getElementById('stat-amount').textContent = fmtKRW(stats.totalAmount);
    document.getElementById('stat-count').textContent = `${Number(stats.totalTrades).toLocaleString()}건`;
    document.getElementById('stat-complete').textContent = `${Number(stats.completedCount).toLocaleString()}건`;
    document.getElementById('stat-pending').textContent = `${Number(stats.pendingCount).toLocaleString()}건`;
}

function renderTable(data, total, page, totalPages) {
    const tbody = document.getElementById('trade-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted)">검색 결과가 없습니다</td></tr>`;
    } else {
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${row.trade_id}</td>
        <td>${row.trade_time}</td>
        <td style="color:var(--text-primary);font-weight:500">${row.stock_name}</td>
        <td><span style="font-size:11px;color:var(--text-muted)">${row.sector}</span></td>
        <td><span class="type-tag type-tag--${row.trade_type}">${row.trade_type === '매수' ? '▲' : row.trade_type === '매도' ? '▼' : '↔'
                } ${row.trade_type}</span></td>
        <td>${Number(row.quantity).toLocaleString()}주</td>
        <td>${fmtKRW(row.unit_price)}</td>
        <td class="amount">${fmtKRW(row.trade_amount)}</td>
        <td>${row.counterparty}</td>
        <td><span class="badge badge--${row.status}">${row.status}</span></td>
      `;
            tbody.appendChild(tr);
        });
    }

    // 페이지 정보
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    document.getElementById('pagination-info').textContent = `${start}–${end} / ${Number(total).toLocaleString()}건`;
    document.getElementById('page-indicator').textContent = `${page} / ${totalPages}`;
    document.getElementById('record-count').textContent = `${Number(total).toLocaleString()} 건`;
    document.getElementById('page-prev').disabled = page <= 1;
    document.getElementById('page-next').disabled = page >= totalPages;

    state.currentPage = page;
    state.totalPages = totalPages;
    state.totalCount = total;

    updateDownloadMeta();
}

function updateDownloadMeta() {
    const hasFilter = state.search || state.status !== 'all' || state.type !== 'all';
    document.getElementById('csv-meta').textContent = `전체 ${state.totalCount.toLocaleString()}건`;
    document.getElementById('json-meta').textContent = `전체 ${state.totalCount.toLocaleString()}건`;
    document.getElementById('filtered-meta').textContent = hasFilter
        ? `현재 필터: ${state.totalCount.toLocaleString()}건`
        : '필터 미적용 (전체)';
}

/* ══════════════════════════════════════════════
   데이터 로드
══════════════════════════════════════════════ */
async function loadTrades(page = 1) {
    setTableLoading(true);
    try {
        const params = new URLSearchParams({
            page,
            limit: PAGE_SIZE,
            q: state.search,
            status: state.status,
            type: state.type,
        });
        const res = await api(`/trades?${params}`);
        renderStats(res.stats);
        renderTable(res.data, res.total, res.page, res.totalPages);
    } catch (err) {
        if (err.message.includes('로그인')) { doLogout(); return; }
        showToast('❌', `데이터 로드 실패: ${err.message}`);
    } finally {
        setTableLoading(false);
    }
}

/* ══════════════════════════════════════════════
   인증
══════════════════════════════════════════════ */
async function doLogin(username, password) {
    const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    return res.user;
}

async function doLogout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch (_) { /* ignore */ }
    state.user = null;
    showPage('login-page');
    showToast('👋', '로그아웃되었습니다.');
}

async function checkSession() {
    try {
        const res = await api('/auth/me');
        return res.user;
    } catch (_) {
        return null;
    }
}

/* ══════════════════════════════════════════════
   서버 상태 표시
══════════════════════════════════════════════ */
async function pingServer() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    try {
        const res = await fetch(`${API}/health`, { credentials: 'include' });
        if (res.ok) {
            dot.className = 'status-dot online';
            text.textContent = '서버 연결됨';
        } else throw new Error();
    } catch (_) {
        dot.className = 'status-dot offline';
        text.textContent = '서버 오프라인';
    }
}

/* ══════════════════════════════════════════════
   UI 헬퍼
══════════════════════════════════════════════ */
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function setUserUI(user) {
    document.getElementById('user-name-display').textContent = user.name;
    document.getElementById('user-role-display').textContent = user.role;
    document.getElementById('user-avatar').textContent = user.name.charAt(0);

    const now = new Date();
    document.getElementById('current-date').textContent =
        now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function setTableLoading(on) {
    document.getElementById('table-loading').classList.toggle('visible', on);
}

function setButtonLoading(btn, on) {
    if (!btn) return;
    if (on) {
        btn._origHtml = btn.innerHTML;
        btn.innerHTML = `<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> 준비 중...`;
        btn.disabled = true;
    } else {
        btn.innerHTML = btn._origHtml || btn.innerHTML;
        btn.disabled = false;
    }
}

let toastTimer;
function showToast(icon, msg) {
    const el = document.getElementById('toast');
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-msg').textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ══════════════════════════════════════════════
   다크 / 라이트 모드 토글
══════════════════════════════════════════════ */
const THEME_KEY = 'tradevault_theme';

function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
    const current = getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(
        next === 'light' ? '☀️' : '🌙',
        next === 'light' ? '라이트 모드로 전환되었습니다.' : '다크 모드로 전환되었습니다.'
    );
}

/* ══════════════════════════════════════════════
   이벤트 초기화
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

    /* ── 테마 초기화 (localStorage에서 복원) ── */
    applyTheme(getTheme());

    /* 세션 재확인 */
    const existing = await checkSession();
    if (existing) {
        state.user = existing;
        setUserUI(existing);
        showPage('dashboard-page');
        pingServer();
        loadTrades();
    }

    /* ── 로그인 폼 ── */
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errBox = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        btn.querySelector('.btn-text').style.display = 'none';
        btn.querySelector('.btn-spinner').style.display = 'block';
        btn.disabled = true;
        errBox.style.display = 'none';

        try {
            const user = await doLogin(username, password);
            state.user = user;
            setUserUI(user);
            showPage('dashboard-page');
            pingServer();
            loadTrades();
            document.getElementById('login-form').reset();
        } catch (err) {
            errBox.style.display = 'flex';
            document.getElementById('login-error-msg').textContent = err.message;
            // 흔들림 재트리거
            errBox.classList.remove('shake');
            void errBox.offsetWidth;
            errBox.classList.add('shake');
        } finally {
            btn.querySelector('.btn-text').style.display = 'block';
            btn.querySelector('.btn-spinner').style.display = 'none';
            btn.disabled = false;
        }
    });

    /* ── 비밀번호 토글 ── */
    document.getElementById('toggle-pw').addEventListener('click', () => {
        const input = document.getElementById('password');
        const show = document.getElementById('eye-show');
        const hide = document.getElementById('eye-hide');
        const isText = input.type === 'text';
        input.type = isText ? 'password' : 'text';
        show.style.display = isText ? 'block' : 'none';
        hide.style.display = isText ? 'none' : 'block';
    });

    /* ── 로그아웃 ── */
    document.getElementById('logout-btn').addEventListener('click', doLogout);

    /* ── CSV 전체 다운로드 ── */
    document.getElementById('btn-download-csv').addEventListener('click', function () {
        triggerDownload(buildDownloadUrl('/trades/download/csv', { status: 'all', type: 'all', q: '' }), this);
    });

    /* ── JSON 전체 다운로드 ── */
    document.getElementById('btn-download-json').addEventListener('click', function () {
        triggerDownload(buildDownloadUrl('/trades/download/json', { status: 'all', type: 'all', q: '' }), this);
    });

    /* ── 필터 적용 CSV 다운로드 ── */
    document.getElementById('btn-download-filtered').addEventListener('click', function () {
        triggerDownload(buildDownloadUrl('/trades/download/csv'), this);
    });

    /* ── 검색 ── */
    let debounceTimer;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.search = e.target.value;
            loadTrades(1);
        }, 300);
    });

    /* ── 필터 ── */
    document.getElementById('status-filter').addEventListener('change', (e) => {
        state.status = e.target.value;
        loadTrades(1);
    });
    document.getElementById('type-filter').addEventListener('change', (e) => {
        state.type = e.target.value;
        loadTrades(1);
    });

    /* ── 새로고침 ── */
    document.getElementById('btn-refresh').addEventListener('click', () => loadTrades(state.currentPage));

    /* ── 페이지네이션 ── */
    document.getElementById('page-prev').addEventListener('click', () => {
        if (state.currentPage > 1) loadTrades(state.currentPage - 1);
    });
    document.getElementById('page-next').addEventListener('click', () => {
        if (state.currentPage < state.totalPages) loadTrades(state.currentPage + 1);
    });

    /* ── 사이드바 네비게이션 (UI만) ── */
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });

    /* ── 테마 토글 버튼 이벤트 ── */
    document.getElementById('theme-toggle-float')
        ?.addEventListener('click', toggleTheme);
    document.getElementById('theme-toggle-sidebar')
        ?.addEventListener('click', toggleTheme);

});
