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

const _STATUS_STYLE = {
  pending:   { bg: 'rgba(251,191,36,.12)',  color: '#fbbf24',          border: 'rgba(251,191,36,.25)' },
  running:   { bg: 'rgba(96,165,250,.12)',  color: '#60a5fa',          border: 'rgba(96,165,250,.25)' },
  sent:      { bg: 'rgba(74,222,128,.12)',  color: 'var(--success)',    border: 'rgba(74,222,128,.25)' },
  failed:    { bg: 'rgba(239,68,68,.12)',   color: 'var(--danger)',     border: 'rgba(239,68,68,.25)'  },
  cancelled: { bg: 'rgba(156,163,175,.1)',  color: 'var(--text-muted)', border: 'rgba(156,163,175,.2)' },
};

async function loadScheduled() {
  const btn       = document.querySelector('#agent-3 .btn-outline');
  const container = document.getElementById('scheduled-result');
  setLoading(btn, true);
  container.style.display = 'flex';
  container.innerHTML     = '<p style="color:var(--text-muted);font-size:13px;margin:0">Loading…</p>';

  try {
    const [campaigns, templates] = await Promise.all([
      api.get('/agents/schedule'),
      api.get('/templates'),
    ]);

    const tmplMap = {};
    templates.forEach(t => { tmplMap[t.id] = t.title; });

    if (!campaigns.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;margin:0">No scheduled campaigns found.</p>';
      return;
    }

    // Pending first, then chronological
    campaigns.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(a.send_at) - new Date(b.send_at);
    });

    container.innerHTML = campaigns.map(c => {
      const title     = tmplMap[c.template_id] || 'Unknown template';
      const sendAt    = new Date(c.send_at).toLocaleString();
      const sc        = _STATUS_STYLE[c.status] || _STATUS_STYLE.cancelled;
      const isPending = c.status === 'pending';
      const summary   = c.result_summary;
      const subline   = summary
        ? (summary.error
            ? `Error: ${summary.error}`
            : `sent ${summary.sent ?? '?'} · failed ${summary.failed ?? '?'}`)
        : c.segment_rule;

      return `
        <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;
                    padding:10px 12px;display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;color:var(--text-primary);font-size:13px;margin-bottom:2px;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
            <div style="font-size:11px;color:var(--text-muted)">${subline} · ${sendAt}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;
                         text-transform:uppercase;letter-spacing:.05em;
                         background:${sc.bg};color:${sc.color};border:1px solid ${sc.border}">
              ${c.status}
            </span>
            ${isPending ? `
              <button onclick="cancelScheduledCampaign('${c.id}')"
                style="font-size:11px;padding:3px 9px;cursor:pointer;border-radius:6px;
                       color:var(--danger);background:rgba(239,68,68,.1);
                       border:1px solid rgba(239,68,68,.25)">
                Cancel
              </button>` : ''}
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);font-size:13px;margin:0">
      ${err?.response?.data?.detail || 'Failed to load scheduled campaigns.'}</p>`;
  } finally {
    setLoading(btn, false);
  }
}

async function cancelScheduledCampaign(jobId) {
  if (!confirm('Cancel this scheduled campaign? This cannot be undone.')) return;
  try {
    await api.del(`/agents/schedule/${jobId}`);
    Toast.success('Campaign cancelled.');
    await loadScheduled();
  } catch (err) {
    Toast.error(err?.response?.data?.detail || 'Could not cancel campaign.');
  }
}

// ── Agent 4: Drip Sequences ───────────────────────────────────────────────────

// State for the drip sequence manager
let _dripSeqMap  = {};   // id → sequence object, populated on list load
let _dripTemplates = []; // cached template list
let _editingSeqId = null; // null = new sequence
let _editSteps    = [];   // [{template_id, delay_days}, ...]

// ── Manager: open / close ─────────────────────────────────────────────────────

async function openDripManager() {
  const modal = document.getElementById('drip-modal');
  modal.style.display = 'flex';
  document.getElementById('drip-list-view').style.display = 'flex';
  document.getElementById('drip-editor-view').style.display = 'none';
  await refreshDripList();
}

function closeDripModal() {
  document.getElementById('drip-modal').style.display = 'none';
  _editingSeqId = null;
  _editSteps    = [];
}

// ── List view ─────────────────────────────────────────────────────────────────

async function refreshDripList() {
  const container = document.getElementById('drip-seq-list');
  container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;margin:0">Loading…</p>';
  try {
    const seqs = await api.get('/agents/drip/sequences');
    _dripSeqMap = {};
    seqs.forEach(s => { _dripSeqMap[s.id] = s; });

    if (!seqs.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;margin:0">No sequences yet. Click <strong>+ New</strong> to create one.</p>';
      return;
    }

    container.innerHTML = seqs.map(s => {
      const stepCount = (s.steps || []).length;
      const totalDays = (s.steps || []).reduce((sum, st) => sum + (st.delay_days || 0), 0);
      const activeColor = s.is_active ? 'var(--success)' : 'var(--text-muted)';
      const activeLabel = s.is_active ? 'active' : 'inactive';
      return `
        <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;color:var(--text-primary);font-size:14px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">
              ${stepCount} step${stepCount !== 1 ? 's' : ''} · ${totalDays} day${totalDays !== 1 ? 's' : ''} total ·
              <span style="color:${activeColor}">${activeLabel}</span>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" style="flex-shrink:0" onclick="openDripEditor('${s.id}')">Edit Timeline</button>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);font-size:13px;margin:0">${err?.response?.data?.detail || 'Failed to load sequences.'}</p>`;
  }
}

// ── Editor view ───────────────────────────────────────────────────────────────

async function openDripEditor(seqId) {
  // Load templates once
  if (!_dripTemplates.length) {
    try {
      _dripTemplates = await api.get('/templates');
    } catch (e) {
      Toast.error('Could not load templates — check your connection.');
      return;
    }
  }

  const seq = seqId ? _dripSeqMap[seqId] : null;
  _editingSeqId = seq ? seq.id : null;
  _editSteps    = seq ? JSON.parse(JSON.stringify(seq.steps || [])) : [{ template_id: '', delay_days: 0 }];

  document.getElementById('drip-editor-title').textContent = seq ? `Edit: ${seq.name}` : 'New Sequence';
  document.getElementById('drip-seq-name').value           = seq ? seq.name : '';
  document.getElementById('drip-seq-active').checked       = seq ? seq.is_active : true;
  document.getElementById('drip-delete-btn').style.display = seq ? 'inline-block' : 'none';

  document.getElementById('drip-list-view').style.display   = 'none';
  document.getElementById('drip-editor-view').style.display = 'flex';

  renderDripSteps();
}

async function backToDripList() {
  _editingSeqId = null;
  _editSteps    = [];
  document.getElementById('drip-list-view').style.display   = 'flex';
  document.getElementById('drip-editor-view').style.display = 'none';
  await refreshDripList();
}

// ── Step rendering ────────────────────────────────────────────────────────────

function renderDripSteps() {
  const container = document.getElementById('drip-steps-list');

  if (!_editSteps.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px 0;margin:0">No steps yet. Click <strong>+ Add Step</strong> below.</p>';
    return;
  }

  const tmplOptions = _dripTemplates.map(t =>
    `<option value="${t.id}">${t.title}</option>`
  ).join('');

  container.innerHTML = _editSteps.map((step, i) => {
    const isFirst   = i === 0;
    const delayNote = isFirst ? 'days after enrollment' : 'days after previous step';
    const connector = i > 0 ? `
      <div style="display:flex;align-items:center;gap:8px;padding:3px 0 3px 18px">
        <div style="width:2px;height:22px;background:var(--border);border-radius:2px;margin-left:8px"></div>
        <span style="font-size:11px;color:var(--text-muted)">wait ${step.delay_days || 0} day${step.delay_days !== 1 ? 's' : ''}</span>
      </div>` : '';

    return `
      ${connector}
      <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:12px 14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-size:10px;font-weight:800;color:var(--gold);background:var(--gold-dim);border-radius:5px;padding:2px 8px;letter-spacing:.05em">
            STEP ${i + 1}
          </span>
          ${_editSteps.length > 1
            ? `<button onclick="removeDripStep(${i})" title="Remove step"
                 style="margin-left:auto;background:none;border:none;cursor:pointer;
                        color:var(--text-muted);font-size:18px;line-height:1;padding:0;
                        transition:color .15s" onmouseover="this.style.color='var(--danger)'"
                        onmouseout="this.style.color='var(--text-muted)'">×</button>`
            : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select class="form-control" style="flex:2;min-width:160px"
            onchange="_editSteps[${i}].template_id=this.value">
            <option value="">— Select template —</option>
            ${_dripTemplates.map(t =>
              `<option value="${t.id}"${t.id === step.template_id ? ' selected' : ''}>${t.title}</option>`
            ).join('')}
          </select>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <input type="number" min="0" max="365" value="${step.delay_days ?? 0}"
              class="form-control" style="width:68px;text-align:center;padding:9px 8px"
              oninput="_editSteps[${i}].delay_days=Math.max(0,parseInt(this.value)||0);_updateConnectors()">
            <span style="font-size:12px;color:var(--text-muted);white-space:nowrap">${delayNote}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function _updateConnectors() {
  // Re-render to refresh the "wait X days" connector labels without losing focus
  // We do a lightweight pass — only update connector text nodes
  renderDripSteps();
}

function addDripStep() {
  _editSteps.push({ template_id: '', delay_days: 1 });
  renderDripSteps();
}

function removeDripStep(i) {
  _editSteps.splice(i, 1);
  renderDripSteps();
}

// ── Save / Delete ─────────────────────────────────────────────────────────────

async function saveDripSequence() {
  const name = document.getElementById('drip-seq-name').value.trim();
  if (!name) { Toast.error('Sequence name is required.'); return; }

  for (let i = 0; i < _editSteps.length; i++) {
    if (!_editSteps[i].template_id) {
      Toast.error(`Step ${i + 1} needs a template selected.`);
      return;
    }
  }
  if (!_editSteps.length) { Toast.error('Add at least one step.'); return; }

  const payload = {
    name,
    is_active: document.getElementById('drip-seq-active').checked,
    steps: _editSteps,
  };

  const btn = document.getElementById('drip-save-btn');
  setLoading(btn, true);
  try {
    if (_editingSeqId) {
      await api.patch(`/agents/drip/sequences/${_editingSeqId}`, payload);
      Toast.success('Sequence updated.');
    } else {
      await api.post('/agents/drip/sequences', payload);
      Toast.success('Sequence created.');
    }
    await backToDripList();
  } catch (err) {
    Toast.error(err?.response?.data?.detail || 'Save failed.');
  } finally {
    setLoading(btn, false);
  }
}

async function deleteDripSequence() {
  if (!_editingSeqId) return;
  if (!confirm('Delete this sequence? Active enrollments will block deletion.')) return;
  try {
    await api.del(`/agents/drip/sequences/${_editingSeqId}`);
    Toast.success('Sequence deleted.');
    await backToDripList();
  } catch (err) {
    Toast.error(err?.response?.data?.detail || 'Cannot delete — sequence may have active enrollments.');
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

// ── Agent 5: Welcome Sequence Config ─────────────────────────────────────────

async function loadWelcomeConfig() {
  const loading = document.getElementById('welcome-config-loading');
  const form    = document.getElementById('welcome-config-form');

  try {
    const [config, sequences] = await Promise.all([
      api.get('/agents/welcome/config'),
      api.get('/agents/drip/sequences'),
    ]);

    const picker = document.getElementById('welcome-seq-picker');
    picker.innerHTML = '<option value="">— Select a drip sequence —</option>' +
      sequences.map(s =>
        `<option value="${s.id}"${s.id === config.sequence_id ? ' selected' : ''}>
          ${s.name}${s.is_active ? '' : ' (inactive)'}
        </option>`
      ).join('');

    document.getElementById('welcome-enabled').checked = config.enabled !== false;

    loading.style.display = 'none';
    form.style.display    = 'flex';
  } catch (err) {
    loading.textContent   = 'Failed to load config.';
    loading.style.color   = 'var(--danger)';
  }
}

async function saveWelcomeConfig() {
  const enabled     = document.getElementById('welcome-enabled').checked;
  const sequence_id = document.getElementById('welcome-seq-picker').value || null;

  const btn = document.querySelector('#agent-5 .btn-primary');
  setLoading(btn, true);
  try {
    await api.patch('/agents/welcome/config', { enabled, sequence_id });
    Toast.success('Welcome sequence config saved.');
  } catch (err) {
    Toast.error(err?.response?.data?.detail || 'Save failed.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Agent 6: Re-engagement ────────────────────────────────────────────────────

async function loadReengagementConfig() {
  const loading = document.getElementById('reeng-config-loading');
  const form    = document.getElementById('reeng-config-form');

  try {
    const [config, templates, sequences] = await Promise.all([
      api.get('/agents/reengagement/config'),
      api.get('/templates'),
      api.get('/agents/drip/sequences'),
    ]);

    // Populate dropdowns
    document.getElementById('reeng-template').innerHTML =
      '<option value="">— Select a template —</option>' +
      templates.map(t =>
        `<option value="${t.id}"${t.id === config.template_id ? ' selected' : ''}>${t.title}</option>`
      ).join('');

    document.getElementById('reeng-sequence').innerHTML =
      '<option value="">— Select a drip sequence —</option>' +
      sequences.map(s =>
        `<option value="${s.id}"${s.id === config.drip_sequence_id ? ' selected' : ''}>
          ${s.name}${s.is_active ? '' : ' (inactive)'}
        </option>`
      ).join('');

    // Set field values
    document.getElementById('reeng-threshold').value = config.threshold_days ?? 30;
    document.getElementById('reeng-hour').value       = config.run_hour_utc   ?? 9;
    document.getElementById('reeng-mode').value       = config.mode           ?? 'single';
    toggleReengMode();

    loading.style.display = 'none';
    form.style.display    = 'flex';
  } catch (err) {
    loading.textContent = 'Failed to load config.';
    loading.style.color = 'var(--danger)';
  }
}

function toggleReengMode() {
  const mode = document.getElementById('reeng-mode').value;
  document.getElementById('reeng-tmpl-row').style.display  = mode === 'single' ? 'block' : 'none';
  document.getElementById('reeng-drip-row').style.display  = mode === 'drip'   ? 'block' : 'none';
}

async function saveReengagementConfig() {
  const mode = document.getElementById('reeng-mode').value;
  const payload = {
    threshold_days:   parseInt(document.getElementById('reeng-threshold').value) || 30,
    mode,
    template_id:      mode === 'single' ? (document.getElementById('reeng-template').value  || null) : null,
    drip_sequence_id: mode === 'drip'   ? (document.getElementById('reeng-sequence').value  || null) : null,
    run_hour_utc:     parseInt(document.getElementById('reeng-hour').value) ?? 9,
  };

  const btn = document.querySelector('#agent-6 .btn-primary');
  setLoading(btn, true);
  try {
    await api.patch('/agents/reengagement/config', payload);
    Toast.success('Re-engagement config saved. Schedule updated live.');
  } catch (err) {
    Toast.error(err?.response?.data?.detail || 'Save failed.');
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
      `Inactive users targeted: ${data.targeted ?? data.inactive_users_found ?? 0}`,
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

async function loadFailureRecoveryConfig() {
  const loading = document.getElementById('fr-config-loading');
  const form    = document.getElementById('fr-config-form');

  try {
    const config = await api.get('/agents/failure-recovery/config');
    document.getElementById('fr-max-retries').value = config.max_retries    ?? 3;
    document.getElementById('fr-retry1').value      = config.retry1_minutes ?? 15;
    document.getElementById('fr-retry2').value      = config.retry2_minutes ?? 120;
    document.getElementById('fr-retry3').value      = config.retry3_minutes ?? 1440;
    loading.style.display = 'none';
    form.style.display    = 'flex';
  } catch (err) {
    loading.textContent = 'Failed to load config.';
    loading.style.color = 'var(--danger)';
  }
}

async function saveFailureRecoveryConfig() {
  const payload = {
    max_retries:    parseInt(document.getElementById('fr-max-retries').value) || 3,
    retry1_minutes: parseInt(document.getElementById('fr-retry1').value) || 15,
    retry2_minutes: parseInt(document.getElementById('fr-retry2').value) || 120,
    retry3_minutes: parseInt(document.getElementById('fr-retry3').value) || 1440,
  };

  const btn = document.querySelector('#agent-7 .btn-primary');
  setLoading(btn, true);
  try {
    await api.patch('/agents/failure-recovery/config', payload);
    Toast.success('Failure recovery config saved.');
  } catch (err) {
    Toast.error(err?.response?.data?.detail || 'Save failed.');
  } finally {
    setLoading(btn, false);
  }
}

async function runFailureRecovery() {
  const btn = document.getElementById('fr-run-btn');
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

// ── Auto-load config panels on page open ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadWelcomeConfig();
  loadReengagementConfig();
  loadFailureRecoveryConfig();
});
