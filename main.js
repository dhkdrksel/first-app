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

// ── 템플릿 이름 매핑 ────────────────────────────────
const TEMPLATES = {
  standard: { name: '표준형' },
  action:   { name: '액션 중심형' },
  decision: { name: '의사결정형' },
  brief:    { name: '간결형' },
};

// ── 변환 로직 (Claude API 호출) ──────────────────────
async function convertMeeting() {
  const text = meetingInput.value.trim();
  if (!text) {
    alert('회의 내용을 입력해 주세요.');
    return;
  }

  const btn = document.getElementById('convertBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-indicator"><span class="spinner"></span> AI가 분석 중...</span>`;

  try {
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, template: selectedTemplate }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '변환 중 오류가 발생했습니다.');
    }

    renderResult(data.result, text);
    goTo('screen-result');
  } catch (err) {
    alert(err.message || '변환 중 오류가 발생했습니다. 다시 시도해 주세요.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span id="convertBtnText">회의록 변환하기</span><span class="btn-arrow">→</span>`;
  }
}

// ── 렌더링 ───────────────────────────────────────────
function renderResult(markdownText, originalText) {
  const meta = document.getElementById('resultMeta');
  const box  = document.getElementById('resultBox');

  const now = new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  meta.textContent = `${now} · ${TEMPLATES[selectedTemplate].name} · 원문 ${originalText.length}자`;
  box.innerHTML = markdownToHtml(markdownText);
}

// 간단한 마크다운 → HTML 변환 (서버 응답 렌더링용)
function markdownToHtml(text) {
  return text
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      if (trimmed.startsWith('## ')) {
        return `<div class="section-heading">${esc(trimmed.slice(3))}</div>`;
      }
      if (trimmed.startsWith('# ')) {
        return `<div class="section-heading">${esc(trimmed.slice(2))}</div>`;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return `<div class="section-content">• ${applyBold(trimmed.slice(2))}</div>`;
      }
      return `<div class="section-content">${applyBold(trimmed)}</div>`;
    })
    .filter(Boolean)
    .join('');
}

// **굵게** 처리 (HTML 이스케이프 후 적용)
function applyBold(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
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
  const plain = box.innerText;

  navigator.clipboard.writeText(plain).then(() => {
    btn.classList.add('copied');
    btn.textContent = '✓ 복사됨!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '📋 복사하기';
    }, 2000);
  }).catch(() => {
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
