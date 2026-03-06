/**
 * TradeVault — 사용자 계정 및 데이터 정의
 * ============================================
 * 로그인 계정 목록 (아이디 / 비밀번호)
 */

const USERS = [
    {
        id: 'USR-001',
        username: 'admin',
        password: 'Admin@1234',
        name: '김관리자',
        role: '최고관리자',
        department: '경영지원팀',
        email: 'admin@tradevault.kr',
    },
    {
        id: 'USR-002',
        username: 'trader1',
        password: 'Trader#2024',
        name: '이트레이더',
        role: '선임트레이더',
        department: '주식운용팀',
        email: 'trader1@tradevault.kr',
    },
    {
        id: 'USR-003',
        username: 'manager',
        password: 'Mgr$5678',
        name: '박매니저',
        role: '팀장',
        department: '리스크관리팀',
        email: 'manager@tradevault.kr',
    },
    {
        id: 'USR-004',
        username: 'analyst',
        password: 'Analyst!9900',
        name: '최애널리스트',
        role: '데이터분석가',
        department: '리서치팀',
        email: 'analyst@tradevault.kr',
    },
    {
        id: 'USR-005',
        username: 'guest',
        password: 'Guest@0000',
        name: '홍길동',
        role: '조회전용',
        department: '외부열람',
        email: 'guest@tradevault.kr',
    },
];

/**
 * 거래 데이터 생성
 */
const STOCKS = [
    { code: '005930', name: '삼성전자', sector: '반도체' },
    { code: '000660', name: 'SK하이닉스', sector: '반도체' },
    { code: '373220', name: 'LG에너지솔루션', sector: '2차전지' },
    { code: '005380', name: '현대차', sector: '자동차' },
    { code: '035720', name: '카카오', sector: 'IT' },
    { code: '035420', name: 'NAVER', sector: 'IT' },
    { code: '068270', name: '셀트리온', sector: '바이오' },
    { code: '005490', name: 'POSCO홀딩스', sector: '철강' },
    { code: '000270', name: '기아', sector: '자동차' },
    { code: '051910', name: 'LG화학', sector: '화학' },
    { code: '006400', name: '삼성SDI', sector: '2차전지' },
    { code: '207940', name: '삼성바이오로직스', sector: '바이오' },
    { code: '012330', name: '현대모비스', sector: '자동차부품' },
    { code: '011170', name: '롯데케미칼', sector: '화학' },
    { code: '015760', name: '한국전력', sector: '에너지' },
    { code: '017670', name: 'SK텔레콤', sector: '통신' },
    { code: '030200', name: 'KT', sector: '통신' },
    { code: '034020', name: '두산에너빌리티', sector: '에너지' },
    { code: '003670', name: '포스코퓨처엠', sector: '2차전지' },
    { code: '096770', name: 'SK이노베이션', sector: '에너지' },
];

const COUNTERPARTIES = [
    'NH투자증권', '미래에셋증권', '삼성증권', 'KB증권', '한국투자증권',
    '키움증권', '대신증권', '신한투자증권', '하나증권', '메리츠증권',
];

const TYPES = ['매수', '매도', '이체'];
const STATUSES = ['완료', '완료', '완료', '처리중', '취소']; // weighted

function pad(n, w = 2) { return String(n).padStart(w, '0'); }

function formatDate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function generateTrades(count = 300) {
    const now = Date.now();
    const trades = [];

    for (let i = 0; i < count; i++) {
        const secAgo = Math.floor(Math.random() * 90 * 86400);
        const dt = new Date(now - secAgo * 1000);
        const stock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
        const type = TYPES[Math.floor(Math.random() * TYPES.length)];
        const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
        const qty = Math.floor(Math.random() * 990) + 10;
        const price = Math.floor(Math.random() * 490000) + 10000;

        trades.push({
            trade_id: `TV-${String(100000 + i + 1).slice(1)}`,
            trade_date: dt.toISOString().slice(0, 10),
            trade_time: formatDate(dt),
            stock_code: stock.code,
            stock_name: stock.name,
            sector: stock.sector,
            trade_type: type,
            quantity: qty,
            unit_price: price,
            trade_amount: qty * price,
            counterparty: COUNTERPARTIES[Math.floor(Math.random() * COUNTERPARTIES.length)],
            status,
            note: status === '취소' ? '고객 요청 취소' : '',
        });
    }

    return trades.sort((a, b) => b.trade_time.localeCompare(a.trade_time));
}

module.exports = { USERS, generateTrades };
