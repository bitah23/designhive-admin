// ── helpers ──────────────────────────────────────────────────────────────────

function showResult(id, content, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  el.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
  el.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
}

function setLoading(btnEl, loading) {
  if (!btnEl) return;
  btnEl.disabled = loading;
  if (loading) {
    btnEl._orig = btnEl.textContent;
    btnEl.textContent = 'Loading…';
  } else if (btnEl._orig) {
    btnEl.textContent = btnEl._orig;
  }
}

// ── Agent 1: Segmentation ─────────────────────────────────────────────────────

async function testSegment() {
  const rule = document.getElementById('seg-rule').value;
  const btn  = document.querySelector('#agent-1 .btn-outline');
  setLoading(btn, true);
  try {
    const data = await api.post('/agents/segment', { rule, preview_only: true });
    showResult('seg-result', `Rule: ${data.rule}\nMatched users: ${data.count}`);
  } catch (err) {
    showResult('seg-result', err?.response?.data?.detail || 'Request failed.', true);
  } finally {
    setLoading(btn, false);
  }
}

// ── Agent 2: Content Generation ───────────────────────────────────────────────

async function testContentGen() {
  const brief = document.getElementById('content-brief').value.trim();
  if (!brief) { Toast.error('Enter a brief first.'); return; }
  const tone  = document.getElementById('content-tone').value;
  const btn   = document.querySelector('#agent-2 .btn-outline');
  setLoading(btn, true);
  showResult('content-result', 'Generating…');
  try {
    const data = await api.post('/agents/generate-content', {
      brief, tone, include_cta: true, cta_text: 'Learn More'
    });
    showResult('content-result', `Subject:\n${data.subject}\n\n--- Body (truncated) ---\n${(data.body || '').slice(0, 400)}…`);
  } catch (err) {
    showResult('content-result', err?.response?.data?.detail || 'Generation failed.', true);
  } finally {
    setLoading(btn, false);
  }
}

// ── Agent 3: Campaign Scheduler ───────────────────────────────────────────────

async function loadScheduled() {
  const btn = document.querySelector('#agent-3 .btn-outline');
  setLoading(btn, true);
  try {
    const data = await api.get('/agents/schedule');
    if (!data.length) {
      showResult('scheduled-result', 'No scheduled campaigns found.');
      return;
    }
    const lines = data.map(c =>
      `[${c.status.toUpperCase()}] ${c.segment_rule} · ${new Date(c.send_at).toLocaleString()}`
    );
    showResult('scheduled-result', lines.join('\n'));
  } catch (err) {
    showResult('scheduled-result', err?.response?.data?.detail || 'Failed to load.', true);
  } finally {
    setLoading(btn, false);
  }
}

// ── Agent 4: Drip Sequences ───────────────────────────────────────────────────

async function loadDrip() {
  const btn = document.querySelectorAll('#agent-4 .btn-outline')[0];
  setLoading(btn, true);
  try {
    const data = await api.get('/agents/drip/sequences');
    if (!data.length) {
      showResult('drip-result', 'No drip sequences found. Create one via the API or Chat agent.');
      return;
    }
    const lines = data.map(s =>
      `[${s.is_active ? 'active' : 'inactive'}] ${s.name} — ${(s.steps || []).length} step(s) (id: ${s.id.slice(0,8)}…)`
    );
    showResult('drip-result', lines.join('\n'));
  } catch (err) {
    showResult('drip-result', err?.response?.data?.detail || 'Failed to load.', true);
  } finally {
    setLoading(btn, false);
  }
}

async function loadEnrollments(context = '') {
  const targetResult = context === 'welcome' ? 'welcome-result' : 'drip-result';
  const btn = context === 'welcome'
    ? document.querySelector('#agent-5 .btn-outline')
    : document.querySelectorAll('#agent-4 .btn-outline')[1];
  setLoading(btn, true);
  try {
    const data = await api.get('/agents/drip/enrollments');
    if (!data.length) {
      showResult(targetResult, 'No enrollments found yet.');
      return;
    }
    const recent = data.slice(0, 10);
    const lines = recent.map(e =>
      `[${e.status}] user ${e.user_id.slice(0,8)}… · step ${e.current_step} · next: ${e.next_send_at ? new Date(e.next_send_at).toLocaleString() : 'N/A'}`
    );
    showResult(targetResult, `${data.length} total enrollment(s)\n\n${lines.join('\n')}`);
  } catch (err) {
    showResult(targetResult, err?.response?.data?.detail || 'Failed to load.', true);
  } finally {
    setLoading(btn, false);
  }
}

// ── Agent 6: Re-engagement ────────────────────────────────────────────────────

async function loadReengagementConfig() {
  const btn = document.querySelectorAll('#agent-6 .btn-outline')[0];
  setLoading(btn, true);
  try {
    const data = await api.get('/agents/reengagement/config');
    showResult('reengagement-result',
      `Mode: ${data.mode}\nThreshold: ${data.threshold_days} days inactive\n` +
      `Template ID: ${data.template_id || 'not set'}\n` +
      `Drip Sequence: ${data.drip_sequence_id || 'not set'}\n` +
      `Runs daily at: ${data.hour_utc}:00 UTC`
    );
  } catch (err) {
    showResult('reengagement-result', err?.response?.data?.detail || 'Failed to load config.', true);
  } finally {
    setLoading(btn, false);
  }
}

async function runReengagement() {
  const btn = document.querySelector('#agent-6 .btn-primary');
  setLoading(btn, true);
  showResult('reengagement-result', 'Running…');
  try {
    const data = await api.post('/agents/reengagement/run', {});
    const lines = [
      `Mode: ${data.mode}`,
      `Inactive users found: ${data.inactive_users_found}`,
    ];
    if (data.sent !== undefined)   lines.push(`Sent: ${data.sent}`);
    if (data.failed !== undefined) lines.push(`Failed: ${data.failed}`);
    if (data.enrolled !== undefined) lines.push(`Enrolled in drip: ${data.enrolled}`);
    if (data.skipped !== undefined)  lines.push(`Skipped (already enrolled): ${data.skipped}`);
    if (data.note)                   lines.push(`Note: ${data.note}`);
    showResult('reengagement-result', lines.join('\n'));
    Toast.success('Re-engagement agent finished.');
  } catch (err) {
    showResult('reengagement-result', err?.response?.data?.detail || 'Run failed.', true);
    Toast.error('Re-engagement agent failed.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Agent 7: Failure Recovery ─────────────────────────────────────────────────

async function runFailureRecovery() {
  const btn = document.querySelector('#agent-7 .btn-primary');
  setLoading(btn, true);
  showResult('recovery-result', 'Scanning for failed sends…');
  try {
    const data = await api.post('/agents/failure-recovery/run', {});
    showResult('recovery-result',
      `Failed rows found: ${data.failed_rows_found}\n` +
      `Retried now: ${data.retried_now}\n` +
      `Not yet due: ${data.not_yet_due}`
    );
    Toast.success('Failure recovery complete.');
  } catch (err) {
    showResult('recovery-result', err?.response?.data?.detail || 'Run failed.', true);
    Toast.error('Failure recovery failed.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Agent 8: Campaign Reporter ────────────────────────────────────────────────

async function loadCampaignReport() {
  const btn = document.querySelector('#agent-8 .btn-outline');
  setLoading(btn, true);
  try {
    const data = await api.get('/agents/report?limit=5');
    if (!data.length) {
      showResult('reporter-result', 'No completed campaigns yet. Send a campaign first.');
      return;
    }
    const lines = data.map(c => {
      const summary = c.result_summary || {};
      return `[${c.status}] ${new Date(c.send_at).toLocaleDateString()} · ` +
             `sent ${summary.sent ?? '?'} / failed ${summary.failed ?? '?'}` +
             (summary.success_rate !== undefined ? ` · ${summary.success_rate}% success` : '');
    });
    showResult('reporter-result', lines.join('\n'));
  } catch (err) {
    showResult('reporter-result', err?.response?.data?.detail || 'Failed to load.', true);
  } finally {
    setLoading(btn, false);
  }
}

// ── Agent 9: Chat Interface ───────────────────────────────────────────────────

async function testChat() {
  const input = document.getElementById('chat-test-input');
  const msg   = input.value.trim();
  if (!msg) { Toast.error('Type a message first.'); return; }

  const btn = document.querySelector('#agent-9 .btn-primary');
  setLoading(btn, true);
  showResult('chat-result', 'Thinking…');

  try {
    const data = await api.post('/agents/chat', { message: msg });
    let output = `Reply:\n${data.reply}`;
    if (data.action_taken) {
      output += `\n\nAction taken: ${data.action_taken.tool}`;
    }
    showResult('chat-result', output);
    input.value = '';
  } catch (err) {
    showResult('chat-result', err?.response?.data?.detail || 'Chat failed.', true);
  } finally {
    setLoading(btn, false);
  }
}

// ── Agent 10: Suggestions ─────────────────────────────────────────────────────

async function loadSuggestions(forceRefresh) {
  const btn = forceRefresh
    ? document.querySelector('#agent-10 .btn-primary')
    : document.querySelector('#agent-10 .btn-outline');
  setLoading(btn, true);
  showResult('suggestions-result', 'Analysing…');

  try {
    const url  = forceRefresh ? '/agents/suggestions?refresh=true' : '/agents/suggestions';
    const data = await api.get(url);
    const suggestions = data.suggestions || [];

    if (!suggestions.length) {
      showResult('suggestions-result', 'No suggestions generated (not enough data yet).');
      return;
    }

    const lines = suggestions.map((s, i) =>
      `[${s.type.toUpperCase()}] (${Math.round((s.confidence || 0) * 100)}% confidence)\n${s.message}` +
      (s.suggested_action ? `\nAction: ${JSON.stringify(s.suggested_action)}` : '')
    );

    const prefix = data.cached ? `[CACHED — generated ${new Date(data.generated_at).toLocaleTimeString()}]\n\n` : '[FRESH]\n\n';
    showResult('suggestions-result', prefix + lines.join('\n\n'));
  } catch (err) {
    showResult('suggestions-result', err?.response?.data?.detail || 'Failed.', true);
  } finally {
    setLoading(btn, false);
  }
}
