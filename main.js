'use strict';

// ── 화면 전환 ──────────────────────────────────────
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  window.scrollTo(0, 0);
}

// ── 글자 수 카운터 ──────────────────────────────────
const meetingInput = document.getElementById('meetingInput');
const charCount    = document.getElementById('charCount');

meetingInput.addEventListener('input', () => {
  charCount.textContent = meetingInput.value.length.toLocaleString();
});

// ── 템플릿 선택 ─────────────────────────────────────
let selectedTemplate = 'standard';

document.getElementById('templateGrid').addEventListener('click', e => {
  const card = e.target.closest('.template-card');
  if (!card) return;

  document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedTemplate = card.dataset.template;
});

// ── 변환 로직 ────────────────────────────────────────
const TEMPLATES = {
  standard: {
    name: '표준형',
    build: (text) => buildStandard(text),
  },
  action: {
    name: '액션 중심형',
    build: (text) => buildAction(text),
  },
  decision: {
    name: '의사결정형',
    build: (text) => buildDecision(text),
  },
  brief: {
    name: '간결형',
    build: (text) => buildBrief(text),
  },
};

function convertMeeting() {
  const text = meetingInput.value.trim();
  if (!text) {
    alert('회의 내용을 입력해 주세요.');
    return;
  }

  // 로딩 상태
  const btn = document.getElementById('convertBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-indicator"><span class="spinner"></span> 변환 중...</span>`;

  // AI 연결 전 mock 딜레이 (나중에 실제 API 호출로 교체)
  setTimeout(() => {
    const result = TEMPLATES[selectedTemplate].build(text);
    renderResult(result, text);
    btn.disabled = false;
    btn.innerHTML = `<span id="convertBtnText">회의록 변환하기</span><span class="btn-arrow">→</span>`;
    goTo('screen-result');
  }, 1200);
}

// ── 렌더링 ───────────────────────────────────────────
function renderResult(sections, originalText) {
  const meta = document.getElementById('resultMeta');
  const box  = document.getElementById('resultBox');

  const now = new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  meta.textContent = `${now} · ${TEMPLATES[selectedTemplate].name} · 원문 ${originalText.length}자`;

  box.innerHTML = sections.map(sec => {
    if (sec.type === 'heading') {
      return `<div class="section-heading">${esc(sec.text)}</div>`;
    }
    if (sec.type === 'text') {
      return `<div class="section-content">${esc(sec.text)}</div>`;
    }
    if (sec.type === 'list') {
      return sec.items.map(item =>
        `<div class="section-content">• ${esc(item)}</div>`
      ).join('');
    }
    if (sec.type === 'actions') {
      return sec.items.map(item =>
        `<div class="action-item">
          <span class="action-badge">${esc(item.who)}</span>
          <span>${esc(item.what)}${item.when ? ' — <strong>' + esc(item.when) + '</strong>' : ''}</span>
        </div>`
      ).join('');
    }
    return '';
  }).join('');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── 복사하기 ─────────────────────────────────────────
function copyResult() {
  const box = document.getElementById('resultBox');
  const btn = document.getElementById('copyBtn');

  // innerHTML → plain text 변환
  const plain = box.innerText;

  navigator.clipboard.writeText(plain).then(() => {
    btn.classList.add('copied');
    btn.textContent = '✓ 복사됨!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '📋 복사하기';
    }, 2000);
  }).catch(() => {
    // 구형 브라우저 fallback
    const ta = document.createElement('textarea');
    ta.value = plain;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.classList.add('copied');
    btn.textContent = '✓ 복사됨!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '📋 복사하기';
    }, 2000);
  });
}

// ────────────────────────────────────────────────────
// 템플릿별 파싱 & 구조화
// (현재는 규칙 기반. 추후 AI API 호출로 교체 예정)
// ────────────────────────────────────────────────────

function parseBase(text) {
  const lines  = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const joined = text;

  // 참석자 추출: "참석자" 키워드 또는 이름 패턴
  let attendees = [];
  const attendeeLine = lines.find(l => /참석|멤버|구성원|참가/.test(l));
  if (attendeeLine) {
    const names = attendeeLine.replace(/참석자?[:：]?|멤버[:：]?|구성원[:：]?/, '').trim();
    attendees = names.split(/[,，、\s]+/).filter(n => n.length >= 2 && n.length <= 4);
  }

  // 날짜 추출
  const dateMatch = joined.match(/(\d{4}[-./]\d{1,2}[-./]\d{1,2})|오늘|yesterday/);
  const date = dateMatch ? dateMatch[0] : new Date().toLocaleDateString('ko-KR');

  // 주제 추출: 첫 줄 또는 "미팅/회의" 언급 문장
  const topicLine = lines.find(l => /미팅|회의|논의|주제/.test(l)) || lines[0];

  return { lines, joined, attendees, date, topicLine };
}

function buildStandard(text) {
  const { lines, attendees, date, topicLine } = parseBase(text);
  const sections = [];

  sections.push({ type: 'heading', text: '회의 정보' });
  sections.push({ type: 'text', text: `일시: ${date}` });
  if (attendees.length) sections.push({ type: 'text', text: `참석자: ${attendees.join(', ')}` });
  sections.push({ type: 'text', text: `주제: ${cleanLine(topicLine)}` });

  sections.push({ type: 'heading', text: '논의 내용' });
  const discussionLines = lines.filter(l =>
    !/참석|멤버|구성원/.test(l) && l !== topicLine
  );
  sections.push({ type: 'list', items: discussionLines.map(cleanLine).filter(Boolean) });

  const actions = extractActions(lines);
  if (actions.length) {
    sections.push({ type: 'heading', text: '액션 아이템' });
    sections.push({ type: 'actions', items: actions });
  }

  return sections;
}

function buildAction(text) {
  const { lines, attendees, date, topicLine } = parseBase(text);
  const sections = [];

  sections.push({ type: 'heading', text: '회의 개요' });
  sections.push({ type: 'text', text: `일시: ${date}` });
  if (attendees.length) sections.push({ type: 'text', text: `참석자: ${attendees.join(', ')}` });

  const actions = extractActions(lines);
  sections.push({ type: 'heading', text: '액션 아이템' });
  if (actions.length) {
    sections.push({ type: 'actions', items: actions });
  } else {
    sections.push({ type: 'text', text: '— 명시된 액션 아이템이 없습니다.' });
  }

  sections.push({ type: 'heading', text: '전체 논의 요약' });
  sections.push({ type: 'list', items: lines.map(cleanLine).filter(Boolean) });

  return sections;
}

function buildDecision(text) {
  const { lines, attendees, date } = parseBase(text);
  const sections = [];

  sections.push({ type: 'heading', text: '회의 정보' });
  sections.push({ type: 'text', text: `일시: ${date}` });
  if (attendees.length) sections.push({ type: 'text', text: `참석자: ${attendees.join(', ')}` });

  const decisions = lines.filter(l =>
    /결정|확정|하기로|으로 가기로|승인|채택|선택/.test(l)
  );
  sections.push({ type: 'heading', text: '결정 사항' });
  if (decisions.length) {
    sections.push({ type: 'list', items: decisions.map(cleanLine) });
  } else {
    sections.push({ type: 'text', text: '— 명시적 결정 사항이 감지되지 않았습니다.' });
  }

  const pending = lines.filter(l =>
    /검토|논의 필요|미정|추후|확인 필요/.test(l)
  );
  if (pending.length) {
    sections.push({ type: 'heading', text: '추후 검토 사항' });
    sections.push({ type: 'list', items: pending.map(cleanLine) });
  }

  const actions = extractActions(lines);
  if (actions.length) {
    sections.push({ type: 'heading', text: '후속 조치' });
    sections.push({ type: 'actions', items: actions });
  }

  return sections;
}

function buildBrief(text) {
  const { lines, attendees, date } = parseBase(text);
  const sections = [];

  sections.push({ type: 'heading', text: '요약' });

  // 핵심 문장만 (길이 10자 이상이고 첫 5줄)
  const keyLines = lines.filter(l => l.length >= 10).slice(0, 5);
  sections.push({ type: 'list', items: keyLines.map(cleanLine) });

  const actions = extractActions(lines);
  if (actions.length) {
    sections.push({ type: 'heading', text: '할 일' });
    sections.push({ type: 'actions', items: actions });
  }

  if (attendees.length) {
    sections.push({ type: 'heading', text: '참석' });
    sections.push({ type: 'text', text: attendees.join(', ') });
  }

  return sections;
}

// ── 헬퍼 ─────────────────────────────────────────────

function extractActions(lines) {
  return lines
    .filter(l => /기로|예정|담당|까지|마감|해야|할 것/.test(l))
    .map(l => {
      const nameMatch = l.match(/^([가-힣]{2,4})(?:이|가|씨|님)?/);
      const dateMatch = l.match(/(\d+월\s*\d+일|\d{1,2}\/\d{1,2}|이번\s*주|다음\s*주)/);
      return {
        who:  nameMatch ? nameMatch[1] : '담당자',
        what: cleanLine(l),
        when: dateMatch ? dateMatch[0] : '',
      };
    });
}

function cleanLine(line) {
  return line
    .replace(/^[-•*·]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
