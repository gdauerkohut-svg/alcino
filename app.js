(function () {
  'use strict';

  const state = {
    user: null,
    config: { appName: 'Hábitos', logoUrl: '', footerImageUrl: '' },
    weeksList: [],
    dashboard: null,
    activeTab: 'dashboard',
    idToken: null
  };

  const DIAS_ABREV = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  /* ---------- ícones do quintal (SVG) ---------- */

  const GARDEN_ASSET_DEFS = {
    tree: () => '<svg viewBox="0 0 40 40"><rect x="17" y="24" width="6" height="14" rx="2" fill="#8a5a34"/><circle cx="20" cy="16" r="13" fill="#5fb84a"/><circle cx="11" cy="20" r="9" fill="#4da33d"/><circle cx="29" cy="20" r="9" fill="#4da33d"/></svg>',
    pine: () => '<svg viewBox="0 0 40 40"><rect x="17" y="30" width="6" height="8" fill="#8a5a34"/><path d="M20 2 L32 22 H8 Z" fill="#2f8f4e"/><path d="M20 12 L30 32 H10 Z" fill="#3aa85c"/></svg>',
    bench: () => '<svg viewBox="0 0 40 40"><rect x="4" y="16" width="32" height="4" rx="1" fill="#a9703f"/><rect x="4" y="8" width="32" height="4" rx="1" fill="#a9703f"/><rect x="6" y="20" width="3" height="12" fill="#7a4d28"/><rect x="31" y="20" width="3" height="12" fill="#7a4d28"/></svg>',
    bush: () => '<svg viewBox="0 0 40 40"><circle cx="13" cy="26" r="9" fill="#4da33d"/><circle cx="27" cy="26" r="9" fill="#5fb84a"/><circle cx="20" cy="19" r="10" fill="#4fae42"/></svg>',
    pond: () => '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="26" rx="17" ry="7" fill="#5fb0e0"/><ellipse cx="20" cy="24" rx="12" ry="4.5" fill="#7cc3ea"/></svg>',
    lamp: () => '<svg viewBox="0 0 40 40"><rect x="18" y="14" width="4" height="22" fill="#5a5a5a"/><circle cx="20" cy="10" r="7" fill="#ffe9a8"/><circle cx="20" cy="10" r="7" fill="none" stroke="#8a8a8a" stroke-width="2"/></svg>',
    fence: () => '<svg viewBox="0 0 40 40"><rect x="4" y="12" width="4" height="22" fill="#d8b088"/><rect x="18" y="12" width="4" height="22" fill="#d8b088"/><rect x="32" y="12" width="4" height="22" fill="#d8b088"/><rect x="2" y="16" width="36" height="3" fill="#c39a6f"/><rect x="2" y="26" width="36" height="3" fill="#c39a6f"/></svg>',
    rock: () => '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="27" rx="14" ry="8" fill="#9aa0a6"/><ellipse cx="14" cy="24" rx="7" ry="5" fill="#b5bac0"/></svg>',
    mushroom: () => '<svg viewBox="0 0 40 40"><rect x="17" y="20" width="6" height="14" rx="2" fill="#f3e6d3"/><path d="M5 19 Q20 1 35 19 Q20 26 5 19Z" fill="#e2493c"/><circle cx="14" cy="13" r="1.7" fill="#fff"/><circle cx="25" cy="11" r="1.9" fill="#fff"/><circle cx="20" cy="17" r="1.4" fill="#fff"/></svg>',
    flower: (c) => `<svg viewBox="0 0 40 40"><rect x="19" y="20" width="2" height="16" fill="#4da33d"/><circle cx="14" cy="15" r="4.2" fill="${c}"/><circle cx="26" cy="15" r="4.2" fill="${c}"/><circle cx="20" cy="9" r="4.2" fill="${c}"/><circle cx="20" cy="21" r="4.2" fill="${c}"/><circle cx="20" cy="15" r="3.2" fill="#ffd452"/></svg>`,
    tulip: (c) => `<svg viewBox="0 0 40 40"><rect x="19" y="18" width="2" height="18" fill="#4da33d"/><path d="M13 18 Q20 3 27 18 Q20 11 13 18Z" fill="${c}"/></svg>`
  };
  const GARDEN_DEFAULT_COLOR = '#ff8ba7';

  function renderGardenIcon(rawType) {
    // aceita "tipo" ou "tipo:#corHex"; se vier um emoji antigo (instalações anteriores), cai no fallback.
    const [type, color] = String(rawType).split(':');
    const def = GARDEN_ASSET_DEFS[type];
    if (!def) return `<span style="font-size:20px;line-height:1;">${escapeHtml(rawType)}</span>`; // fallback legado
    return def(color || GARDEN_DEFAULT_COLOR);
  }

  // hash determinístico simples -> número estável entre 0 e 1 (mesma data = mesma posição sempre)
  function seeded01(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return (h % 10000) / 10000;
  }

  const UPRIGHT_TYPES = { tree: 1, pine: 1, bench: 1, lamp: 1, fence: 1, pond: 1 };

  /**
   * Calcula posição/escala/rotação pseudo-aleatórias (mas fixas) para um item,
   * distribuídas ao longo de toda a área (xMinPct–100, yMinPct–yMaxPct).
   */
  function computeScatterStyle(item, opts) {
    const seed = item.date;
    const x = opts.xPad + seeded01(seed + 'x') * (100 - opts.xPad * 2);
    const y = opts.yMin + seeded01(seed + 'y') * (opts.yMax - opts.yMin);
    const type = String(item.emoji).split(':')[0];
    const upright = !!UPRIGHT_TYPES[type];
    const scale = (opts.scaleMin + seeded01(seed + 's') * (opts.scaleMax - opts.scaleMin)).toFixed(2);
    const rotate = upright ? 0 : Math.round((seeded01(seed + 'r') - 0.5) * 20);
    const z = Math.round(y * 10);
    return `left:${x.toFixed(2)}%; top:${y.toFixed(2)}%; width:${opts.size}px; height:${opts.size}px; z-index:${z}; transform: translate(-50%,-92%) scale(${scale}) rotate(${rotate}deg);`;
  }

  function renderScatterItems(items, opts) {
    return items.map(g => `
      <div class="garden-scatter-item" data-date="${g.date}" style="${computeScatterStyle(g, opts)}">
        ${renderGardenIcon(g.emoji)}
      </div>
    `).join('');
  }

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $all = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function show(id) {
    $all('.screen').forEach(s => s.classList.add('hidden'));
    $('#' + id).classList.remove('hidden');
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function applyBranding() {
    $('#headerAppName').textContent = state.config.appName || 'Hábitos';
    $('#loginAppName').textContent = state.config.appName || 'Hábitos';
    document.title = state.config.appName || 'Hábitos';
    if (state.config.logoUrl) {
      $('#headerLogo').src = state.config.logoUrl;
      $('#headerLogo').classList.remove('hidden');
      $('#loginLogo').src = state.config.logoUrl;
      $('#loginLogo').classList.remove('hidden');
      // Aqui (fora do Apps Script) a página é o documento de verdade, então
      // atualizar o <link rel="icon"> por JS funciona normalmente.
      let link = document.querySelector('link[rel="icon"]');
      if (link) link.href = state.config.logoUrl;
    }
  }

  /* ---------- comunicação com o backend (Apps Script via JSONP) ---------- */
  /*
   * Não usamos fetch() aqui de propósito: o Apps Script não consegue
   * devolver o cabeçalho Access-Control-Allow-Origin, então fetch()
   * cross-origin é sempre bloqueado pelo navegador. Tags <script> não
   * sofrem essa restrição — é a técnica clássica "JSONP".
   */

  let jsonpCounter = 0;

  function apiCall(action, ...args) {
    return new Promise((resolve, reject) => {
      const cbName = '__habitosCb' + (jsonpCounter++) + '_' + Date.now();
      const script = document.createElement('script');

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Tempo esgotado ao contatar o servidor. Verifique sua conexão.'));
      }, 20000);

      function cleanup() {
        clearTimeout(timeoutId);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = (res) => {
        cleanup();
        if (!res.ok) {
          const err = new Error(res.error || 'Erro desconhecido');
          err.isAuthError = /não autenticado|sessão expirada|token/i.test(res.error || '');
          reject(err);
        } else {
          resolve(res.data);
        }
      };

      const url = new URL(window.APP_CONFIG.APPS_SCRIPT_URL);
      url.searchParams.set('action', action);
      url.searchParams.set('idToken', state.idToken || '');
      url.searchParams.set('args', JSON.stringify(args));
      url.searchParams.set('callback', cbName);

      script.src = url.toString();
      script.onerror = () => { cleanup(); reject(new Error('Falha ao conectar com o servidor.')); };
      document.body.appendChild(script);
    });
  }

  // Mantido com o mesmo nome usado no resto do arquivo (dashboards, planner, admin...)
  function runServer(fnName, ...args) {
    return apiCall(fnName, ...args).catch(err => {
      if (!err.isAuthError) throw err;
      // Antes de desistir e mandar pra tela de login, tenta uma renovação
      // silenciosa (funciona se a conta Google ainda está ativa no navegador).
      return trySilentRenewal().then(renewed => {
        if (renewed) return apiCall(fnName, ...args); // token novo: tenta de novo
        toast('Sessão expirada. Faça login novamente.');
        logout();
        throw err;
      });
    });
  }

  /* ---------- login com Google (Google Identity Services) ---------- */

  let gisInitialized = false;

  function decodeJwt(token) {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(json);
  }

  function saveToken(idToken) {
    state.idToken = idToken;
    localStorage.setItem('habitos_id_token', idToken);
  }

  function loadStoredToken() {
    const token = localStorage.getItem('habitos_id_token');
    if (!token) return null;
    try {
      const payload = decodeJwt(token);
      if (payload.exp * 1000 < Date.now()) return null; // expirado
      return token;
    } catch (e) {
      return null;
    }
  }

  function logout() {
    state.idToken = null;
    localStorage.removeItem('habitos_id_token');
    // impede que a renovação automática logue de volta assim que a pessoa
    // acabou de escolher "Sair" de propósito.
    if (window.google && google.accounts && google.accounts.id) {
      try { google.accounts.id.disableAutoSelect(); } catch (e) {}
    }
    show('loginScreen');
    renderGoogleButton();
  }

  /** Garante que google.accounts.id.initialize() rodou uma única vez (precisa
   *  rodar cedo, mesmo fora da tela de login, pra renovação em segundo plano funcionar). */
  function initGoogleIdentity() {
    if (gisInitialized) return true;
    if (!window.google || !google.accounts || !google.accounts.id) return false;
    google.accounts.id.initialize({
      client_id: window.APP_CONFIG.GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: true,
      cancel_on_tap_outside: false
    });
    gisInitialized = true;
    return true;
  }

  function renderGoogleButton() {
    if (!initGoogleIdentity()) {
      setTimeout(renderGoogleButton, 300);
      return;
    }
    $('#googleSignInDiv').innerHTML = '';
    google.accounts.id.renderButton($('#googleSignInDiv'), {
      theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with'
    });
  }

  function handleGoogleCredential(response) {
    saveToken(response.credential);
    if (state.user) return; // renovação em segundo plano: já estava logado, nada a mudar na tela
    boot();
  }

  /**
   * Tenta obter um token novo sem interromper o usuário (usa a sessão Google
   * que já está ativa no navegador, se houver). Resolve true se conseguiu
   * um token novo dentro do tempo de espera, false se não.
   */
  function trySilentRenewal() {
    return new Promise(resolve => {
      if (!initGoogleIdentity()) return resolve(false);
      const tokenBefore = state.idToken;
      try {
        google.accounts.id.prompt();
      } catch (e) {
        return resolve(false);
      }
      setTimeout(() => resolve(state.idToken !== tokenBefore), 2000);
    });
  }

  // Confere a cada 5 minutos se o token está perto de expirar e já renova
  // sozinho antes disso acontecer — assim, na maior parte do tempo, a pessoa
  // nem percebe que o login "vencia" de hora em hora.
  let tokenWatcherStarted = false;
  function startTokenWatcher() {
    if (tokenWatcherStarted) return;
    tokenWatcherStarted = true;
    setInterval(() => {
      if (!state.idToken) return;
      try {
        const payload = decodeJwt(state.idToken);
        const msLeft = payload.exp * 1000 - Date.now();
        if (msLeft < 10 * 60 * 1000) trySilentRenewal();
      } catch (e) {}
    }, 5 * 60 * 1000);
  }

  /* ---------- boot ---------- */
  function boot() {
    if (!state.idToken) {
      show('loginScreen');
      renderGoogleButton();
      return;
    }
    runServer('getBootstrapData').then(data => {
      state.user = data;
      state.config = data.config || state.config;
      applyBranding();
      if (!data.registered) {
        show('registerScreen');
      } else {
        enterApp();
      }
    }).catch(err => {
      if (!err.isAuthError) toast('Erro ao carregar: ' + (err.message || err));
      show('loginScreen');
      renderGoogleButton();
    });
  }

  function enterApp() {
    if (state.user.isAdmin) {
      $all('.admin-only').forEach(el => el.classList.remove('hidden'));
    }
    show('appScreen');
    switchTab('dashboard');
    startTokenWatcher();
  }

  /* ---------- navegação ---------- */
  function switchTab(tab) {
    state.activeTab = tab;
    $all('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const main = $('#mainContent');
    main.innerHTML = renderSkeleton();

    if (tab === 'dashboard') loadDashboard();
    else if (tab === 'planner') loadPlanner();
    else if (tab === 'adminUsers') loadAdminUsers();
    else if (tab === 'adminBrand') loadAdminBrand();
  }

  function renderSkeleton() {
    return '<div class="dash-grid">' +
      Array(4).fill('<div class="dash-card skeleton" style="min-height:168px"></div>').join('') +
      '</div>';
  }

  /* ================= DASHBOARD (Aba 1) ================= */

  function loadDashboard() {
    runServer('getDashboardData').then(data => {
      state.dashboard = data;
      renderDashboard();
    }).catch(err => toast('Erro: ' + err.message));
  }

  function renderDashboard() {
    const d = state.dashboard;
    const main = $('#mainContent');

    const weekDots = d.weekFire.map(day =>
      `<div class="week-mini-day"><span class="week-mini-dot">${day.fire ? '🔥' : '⚪'}</span>${day.label}</div>`
    ).join('');

    const perfText = d.perf.text.replace('{n}', d.perf.fireCount);
    const perfEmoji = getPerformanceEmoji(d.perf.fireCount);

    const gardenSceneHtml = renderGardenScene(d.garden);

    main.innerHTML = `
      <div class="dash-grid">
        <div class="dash-card fire-card" id="fireCardOpen">
          <div class="dash-card-title">Sequência</div>
          <div class="fire-emoji">🔥</div>
          <div class="fire-count">${d.streak}</div>
          <div class="fire-label">${d.streak === 1 ? 'dia seguido' : 'dias seguidos'}</div>
          <div class="week-mini">${weekDots}</div>
          <div class="card-tap-hint">Toque para ver o mês 📅</div>
        </div>

        <div class="dash-card perf-card">
          <div class="dash-card-title">Como você está</div>
          <div class="perf-emoji-badge">${perfEmoji}</div>
          <div class="perf-text">${escapeHtml(perfText)}</div>
        </div>

        <div class="dash-card quote-card">
          <div class="dash-card-title">Inspiração</div>
          <div class="quote-text">"${escapeHtml(d.quote.text)}"</div>
          <div class="quote-author">— ${escapeHtml(d.quote.author)}</div>
        </div>

        <div class="dash-card garden-card" id="gardenCardOpen">
          <div class="dash-card-title">Seu quintal</div>
          ${gardenSceneHtml}
          <div class="card-tap-hint">${d.garden.length ? 'Toque para ver tudo 🔎' : ''}</div>
        </div>
      </div>
    `;
  }

  /** Escolhe um emoji de emoção de acordo com o desempenho da semana (estável por dia, não fica trocando a cada re-render). */
  function getPerformanceEmoji(fireCount) {
    let pool;
    if (fireCount >= 6) pool = ['😄','🤩','🚀','💪','🎉'];
    else if (fireCount >= 3) pool = ['🙂','😌','👍','🌤️'];
    else pool = ['😕','🥺','💤','🌱'];
    const seed = new Date().toISOString().slice(0, 10) + '_' + fireCount;
    return pool[Math.floor(seeded01(seed) * pool.length)];
  }

  /**
   * Cena mini do card do dashboard: céu+grama fixos, mostra os itens mais
   * recentes espalhados aleatoriamente (posição estável por item).
   */
  function renderGardenScene(garden) {
    const shown = garden.slice(-16); // mini: evita poluir o cartão pequeno
    const itemsHtml = renderScatterItems(shown, { xPad: 8, yMin: 50, yMax: 88, scaleMin: 0.55, scaleMax: 0.95, size: 26 });
    const emptyHint = garden.length ? '' : '<div class="garden-empty-hint">Ainda vazio 🌱</div>';

    return `
      <div class="garden-scene">
        <div class="garden-sun"></div>
        <div class="garden-cloud c1"></div>
        <div class="garden-cloud c2"></div>
        <div class="garden-scatter">${itemsHtml}</div>
        ${emptyHint}
      </div>
    `;
  }

  function openGardenModal() {
    const garden = (state.dashboard && state.dashboard.garden) || [];
    const canvasHeight = Math.max(260, 50 + garden.length * 46);
    const itemsHtml = renderScatterItems(garden, { xPad: 6, yMin: 2, yMax: 96, scaleMin: 0.8, scaleMax: 1.3, size: 40 });
    const emptyHint = garden.length ? '' : '<div class="garden-empty-hint">Conclua 2+ atividades num dia pra plantar a primeira flor 🌱</div>';

    $('#gardenModalContent').innerHTML = `
      <div class="garden-scene garden-scene--full">
        <div class="garden-sky-fixed">
          <div class="garden-sun"></div>
          <div class="garden-cloud c1"></div>
          <div class="garden-cloud c2"></div>
        </div>
        <div class="garden-grass-scroll">
          <div class="garden-scatter" style="height:${canvasHeight}px;">${itemsHtml}</div>
          ${emptyHint}
        </div>
      </div>
      <div class="garden-modal-count">${garden.length} conquista${garden.length === 1 ? '' : 's'} no total — cada uma é um dia com 2+ atividades concluídas 🔥</div>
    `;
    $('#gardenModal').classList.remove('hidden');
  }

  function closeGardenModal() {
    $('#gardenModal').classList.add('hidden');
  }

  /* ================= CALENDÁRIO MENSAL (modal do foguinho) ================= */

  const monthModalState = { year: null, month: null };
  const MES_LABEL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function toISODateClient_(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function openMonthModal() {
    const now = new Date();
    monthModalState.year = now.getFullYear();
    monthModalState.month = now.getMonth() + 1;
    $('#monthModal').classList.remove('hidden');
    loadMonthModal();
  }

  function closeMonthModal() {
    $('#monthModal').classList.add('hidden');
  }

  function loadMonthModal() {
    $('#monthModalLabel').textContent = MES_LABEL[monthModalState.month - 1] + ' de ' + monthModalState.year + '...';
    runServer('getMonthFireData', monthModalState.year, monthModalState.month)
      .then(renderMonthModal)
      .catch(err => toast('Erro: ' + err.message));
  }

  function renderMonthModal(data) {
    $('#monthModalLabel').textContent = data.label;

    const now = new Date();
    const isAtOrAfterCurrentMonth = data.year > now.getFullYear() ||
      (data.year === now.getFullYear() && data.month >= now.getMonth() + 1);
    $('#btnNextMonth').disabled = isAtOrAfterCurrentMonth;

    const weekdayHeaders = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
      .map(w => `<div class="month-weekday">${w}</div>`).join('');
    const blanks = Array(data.firstWeekday).fill('<div class="month-day month-day-empty"></div>').join('');
    const todayISO = toISODateClient_(now);

    const cells = data.days.map(d => `
      <div class="month-day ${d.fire ? 'fire' : ''} ${d.date === todayISO ? 'today' : ''}">
        <span>${d.day}</span>
        ${d.fire ? '<span class="month-day-emoji">🔥</span>' : ''}
      </div>
    `).join('');

    $('#monthModalGrid').innerHTML = weekdayHeaders + blanks + cells;
    $('#monthModalSummary').textContent = `${data.fireCount} dia${data.fireCount === 1 ? '' : 's'} com foguinho em ${data.label}`;
  }

  function goToAdjacentMonth(delta) {
    monthModalState.month += delta;
    if (monthModalState.month > 12) { monthModalState.month = 1; monthModalState.year += 1; }
    if (monthModalState.month < 1) { monthModalState.month = 12; monthModalState.year -= 1; }
    loadMonthModal();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function handleDashboardClick(e) {
    if (state.activeTab !== 'dashboard') return;
    if (e.target.closest('#gardenCardOpen')) openGardenModal();
    if (e.target.closest('#fireCardOpen')) openMonthModal();
  }

  function formatDatePt_(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function handleGardenModalClick(e) {
    const item = e.target.closest('.garden-scatter-item[data-date]');
    if (item) toast('Conquistado em ' + formatDatePt_(item.dataset.date));
    if (e.target.id === 'gardenModal') closeGardenModal(); // clicou fora do card
  }

  /* ================= PLANNER SEMANAL (Aba 2) ================= */

  function loadPlanner() {
    runServer('getPlannerData').then(weeksList => {
      state.weeksList = weeksList;
      renderPlanner();
    }).catch(err => toast('Erro: ' + err.message));
  }

  function formatRange(week) {
    return `Semana de ${week.startDate.split('-').reverse().join('/')} a ${week.endDate.split('-').reverse().join('/')}`;
  }

  function renderPlanner() {
    const main = $('#mainContent');
    const weeks = state.weeksList || [];

    // Guarda a rolagem horizontal de cada semana ANTES de reconstruir o HTML
    // (senão, toda vez que marcamos uma atividade, a tela volta pro primeiro
    // dia da semana — porque innerHTML recria os elementos do zero).
    const scrollByWeek = {};
    $all('.week-block').forEach(block => {
      const board = block.querySelector('.planner-board');
      if (board) scrollByWeek[block.dataset.start] = board.scrollLeft;
    });

    const weeksHtml = weeks.map(week => `
      <div class="week-block" data-start="${week.startDate}">
        <div class="week-block-range">${formatRange(week)}</div>
        <div class="planner-board">${week.days.map(day => renderDayColumn(day)).join('')}</div>
      </div>
    `).join('');

    main.innerHTML = `
      <div class="planner-header">
        <h2 class="planner-title">Lista de tarefas semanal</h2>
      </div>
      <button class="new-week-btn" id="btnNewWeek">🗒️ Nova semana com lista de tarefas vazia</button>
      ${weeksHtml}
    `;

    // Restaura a rolagem de cada semana pra posição de antes.
    $all('.week-block').forEach(block => {
      const board = block.querySelector('.planner-board');
      const saved = scrollByWeek[block.dataset.start];
      if (board && saved !== undefined) board.scrollLeft = saved;
    });

    $('#btnNewWeek').addEventListener('click', () => {
      $('#btnNewWeek').textContent = 'Criando...';
      runServer('createNextWeek').then(weeksList => {
        state.weeksList = weeksList;
        renderPlanner();
        toast('Nova semana criada! A anterior continua logo abaixo.');
      }).catch(err => toast('Erro: ' + err.message));
    });
  }

  /** Encontra em qual semana (do histórico) está o dia com essa data, ou a atividade com esse id. */
  function findDayByDate_(dateISO) {
    for (const week of state.weeksList || []) {
      const day = week.days.find(d => d.date === dateISO);
      if (day) return day;
    }
    return null;
  }
  function findDayByActivityId_(id) {
    for (const week of state.weeksList || []) {
      const day = week.days.find(d => d.activities.some(a => a.id === id));
      if (day) return day;
    }
    return null;
  }
  function recalcDayTotals_(day) {
    day.total = day.activities.length;
    day.done = day.activities.filter(a => a.completed).length;
    day.pending = day.total - day.done;
  }

  function renderDayColumn(day) {
    const items = day.activities.map(a => `
      <div class="checklist-item" data-id="${a.id}">
        <div class="checklist-checkbox ${a.completed ? 'done' : ''}" data-action="toggle" data-id="${a.id}">${a.completed ? '✓' : ''}</div>
        <div class="checklist-label ${a.completed ? 'done' : ''}">${escapeHtml(a.title)}</div>
        <button class="checklist-menu-btn" data-action="menu" data-id="${a.id}">⋮</button>
      </div>
    `).join('');

    const subText = `${day.total} atividade${day.total === 1 ? '' : 's'} programada${day.total === 1 ? '' : 's'} para o dia — <b class="done-n">${day.done}</b> concluída${day.done === 1 ? '' : 's'} e <b class="pend-n">${day.pending}</b> pendente${day.pending === 1 ? '' : 's'}`;

    return `
      <div class="day-column" data-date="${day.date}">
        <div class="day-column-header">
          <span class="day-column-name">${day.label}</span>
        </div>
        <div class="day-column-sub">${subText} · <span style="opacity:.8">${day.shortDate}</span></div>
        <div class="checklist">${items || '<div class="checklist-empty">Nenhuma atividade ainda.</div>'}</div>
        <div class="add-activity-row">
          <input type="text" placeholder="Nova atividade..." data-add-input="${day.date}" maxlength="80">
          <button data-action="add" data-date="${day.date}">+</button>
        </div>
      </div>
    `;
  }

  function closeAnyPopover() {
    $all('.activity-popover').forEach(p => p.remove());
  }

  // Listener único e persistente para a área de planner (delegação de eventos).
  // Registrado apenas uma vez em initGlobalDelegation(); funciona para qualquer re-render.
  function handlePlannerClick(e) {
    if (state.activeTab !== 'planner') return;
    const main = $('#mainContent');
    const toggleEl = e.target.closest('[data-action="toggle"]');
    const menuEl = e.target.closest('[data-action="menu"]');
    const addEl = e.target.closest('[data-action="add"]');

    if (toggleEl) {
      closeAnyPopover();
      optimisticToggle(toggleEl.dataset.id);
      return;
    }
    if (menuEl) {
      e.stopPropagation();
      const already = menuEl.parentElement.querySelector('.activity-popover');
      closeAnyPopover();
      if (already) return; // era esse mesmo que estava aberto -> só fecha
      openPopover(menuEl);
      return;
    }
    if (addEl) {
      const date = addEl.dataset.date;
      const input = main.querySelector(`input[data-add-input="${date}"]`);
      submitAddActivity(date, input);
      return;
    }
    if (!e.target.closest('.activity-popover')) closeAnyPopover();
  }

  function handlePlannerKeydown(e) {
    if (state.activeTab !== 'planner') return;
    if (e.key === 'Enter' && e.target.matches('input[data-add-input]')) {
      const date = e.target.dataset.addInput;
      submitAddActivity(date, e.target);
    }
  }

  function submitAddActivity(date, input) {
    const title = input.value.trim();
    if (!title) return;
    input.value = '';

    // Otimista: mostra na lista IMEDIATAMENTE, antes mesmo da resposta do servidor.
    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const day = findDayByDate_(date);
    if (day) {
      day.activities.push({ id: tempId, title, completed: false });
      recalcDayTotals_(day);
    }
    renderPlanner();
    const freshInput = document.querySelector(`input[data-add-input="${date}"]`);
    if (freshInput) freshInput.focus();

    runServer('addActivity', date, title).then(weeksList => {
      state.weeksList = weeksList; // substitui pelo estado real do servidor (com o id definitivo)
      renderPlanner();
    }).catch(err => {
      // rollback: remove o item otimista se o servidor falhou
      const d = findDayByDate_(date);
      if (d) {
        d.activities = d.activities.filter(a => a.id !== tempId);
        recalcDayTotals_(d);
      }
      renderPlanner();
      toast('Não foi possível salvar: ' + err.message);
    });
  }

  function optimisticToggle(id) {
    // atualiza local imediatamente pra sensação de velocidade
    const day = findDayByActivityId_(id);
    if (day) {
      const act = day.activities.find(a => a.id === id);
      act.completed = !act.completed;
      recalcDayTotals_(day);
    }
    renderPlanner();
    runServer('toggleActivity', id).then(weeksList => {
      state.weeksList = weeksList;
      renderPlanner();
    }).catch(err => { toast('Erro ao sincronizar: ' + err.message); loadPlanner(); });
  }

  function openPopover(menuBtn) {
    const id = menuBtn.dataset.id;
    const row = menuBtn.closest('.checklist-item');
    const dayDate = menuBtn.closest('.day-column').dataset.date;

    // "Mover para" só entre os dias da MESMA semana em que a atividade está.
    const week = (state.weeksList || []).find(w => w.days.some(d => d.date === dayDate));
    const otherDays = week ? week.days.filter(d => d.date !== dayDate) : [];
    const moveButtons = otherDays.map(d =>
      `<button data-move="${d.date}">${DIAS_ABREV[new Date(d.date + 'T00:00:00').getDay()]} ${d.shortDate}</button>`
    ).join('');

    const pop = document.createElement('div');
    pop.className = 'activity-popover';
    pop.innerHTML = `
      <button data-act="rename">✏️ Renomear</button>
      <button data-act="delete" class="danger">🗑️ Excluir</button>
      <div class="muted" style="font-size:11px;padding:6px 10px 0 10px;">Mover para:</div>
      <div class="move-days">${moveButtons}</div>
    `;
    row.appendChild(pop);

    pop.addEventListener('click', e => {
      e.stopPropagation();
      const renameBtn = e.target.closest('[data-act="rename"]');
      const deleteBtn = e.target.closest('[data-act="delete"]');
      const moveBtn = e.target.closest('[data-move]');

      if (renameBtn) {
        const current = row.querySelector('.checklist-label').textContent;
        const novo = prompt('Renomear atividade:', current);
        closeAnyPopover();
        if (novo && novo.trim() && novo.trim() !== current) {
          runServer('renameActivity', id, novo.trim()).then(weeksList => {
            state.weeksList = weeksList; renderPlanner();
          }).catch(err => toast('Erro: ' + err.message));
        }
      } else if (deleteBtn) {
        closeAnyPopover();
        if (confirm('Excluir esta atividade?')) {
          runServer('deleteActivity', id).then(weeksList => {
            state.weeksList = weeksList; renderPlanner(); toast('Atividade excluída.');
          }).catch(err => toast('Erro: ' + err.message));
        }
      } else if (moveBtn) {
        closeAnyPopover();
        runServer('moveActivity', id, moveBtn.dataset.move).then(weeksList => {
          state.weeksList = weeksList; renderPlanner(); toast('Atividade movida.');
        }).catch(err => toast('Erro: ' + err.message));
      }
    });
  }

  /* ================= ADMIN: USUÁRIOS ================= */

  function loadAdminUsers() {
    runServer('adminListUsers').then(users => renderAdminUsers(users))
      .catch(err => toast('Erro: ' + err.message));
  }

  function renderAdminUsers(users) {
    const main = $('#mainContent');
    main.innerHTML = `
      <h2 class="section-title" style="margin-bottom:14px;">Usuários (${users.length})</h2>
      ${users.map(u => `
        <div class="admin-user-row" data-email="${u.email}">
          <div class="admin-user-info">
            <span class="admin-user-name">${escapeHtml(u.name || u.email)}</span>
            <span class="admin-user-email">${escapeHtml(u.email)}</span>
            <div class="admin-badges">
              ${u.isAdmin ? '<span class="badge badge-admin">Admin</span>' : ''}
              ${u.isMaster ? '<span class="badge badge-master">Master</span>' : ''}
            </div>
          </div>
          <div class="admin-user-actions">
            <button class="btn btn-small btn-outline" data-toggle="isMaster" data-value="${!u.isMaster}">${u.isMaster ? 'Remover master' : 'Dar master'}</button>
          </div>
        </div>
      `).join('')}
    `;
  }

  function handleAdminUsersClick(e) {
    if (state.activeTab !== 'adminUsers') return;
    const btn = e.target.closest('[data-toggle]');
    if (!btn) return;
    const row = btn.closest('.admin-user-row');
    const email = row.dataset.email;
    const flag = btn.dataset.toggle;
    const value = btn.dataset.value === 'true';
    btn.disabled = true;
    runServer('adminSetUserFlag', email, flag, value).then(users => {
      renderAdminUsers(users);
      toast('Atualizado!');
    }).catch(err => { btn.disabled = false; toast('Erro: ' + err.message); });
  }

  /* ================= ADMIN: MARCA (logo, nome, rodapé) ================= */

  function loadAdminBrand() {
    renderAdminBrand();
  }

  function renderAdminBrand() {
    const main = $('#mainContent');
    const cfg = state.config;
    main.innerHTML = `
      <h2 class="section-title" style="margin-bottom:14px;">Personalização</h2>

      <div class="admin-section">
        <h3>Nome do app</h3>
        <input class="text-input" style="max-width:none;" id="inputAppName" value="${escapeHtml(cfg.appName || '')}" maxlength="30">
        <button class="btn btn-primary" style="max-width:none;" id="btnSaveName">Salvar nome</button>
      </div>

      <div class="admin-section">
        <h3>Logo (topo)</h3>
        ${cfg.logoUrl ? `<img class="preview-image" src="${cfg.logoUrl}">` : ''}
        <form id="logoUploadForm" class="upload-form" target="uploadTargetFrame" method="POST" enctype="multipart/form-data">
          <input type="hidden" name="idToken" value="${state.idToken || ''}">
          <input type="hidden" name="configKey" value="logoUrl">
          <input type="file" name="file" id="inputLogo" accept="image/*">
        </form>
      </div>

      <div class="admin-section">
        <h3>Imagem de rodapé</h3>
        ${cfg.footerImageUrl ? `<img class="preview-image" src="${cfg.footerImageUrl}">` : ''}
        <form id="footerUploadForm" class="upload-form" target="uploadTargetFrame" method="POST" enctype="multipart/form-data">
          <input type="hidden" name="idToken" value="${state.idToken || ''}">
          <input type="hidden" name="configKey" value="footerImageUrl">
          <input type="file" name="file" id="inputFooter" accept="image/*">
        </form>
      </div>
    `;

    $('#logoUploadForm').action = window.APP_CONFIG.APPS_SCRIPT_URL;
    $('#footerUploadForm').action = window.APP_CONFIG.APPS_SCRIPT_URL;

    $('#btnSaveName').addEventListener('click', () => {
      const name = $('#inputAppName').value.trim();
      if (!name) return toast('Digite um nome.');
      runServer('adminUpdateConfig', { appName: name }).then(cfg => {
        state.config = cfg; applyBranding(); toast('Nome atualizado!');
      }).catch(err => toast('Erro: ' + err.message));
    });

    $('#inputLogo').addEventListener('change', () => submitUploadForm('logoUploadForm', 'logoUrl'));
    $('#inputFooter').addEventListener('change', () => submitUploadForm('footerUploadForm', 'footerImageUrl'));
  }

  /**
   * Envia a imagem via <form multipart> de verdade pra um iframe oculto —
   * não usa fetch() de propósito (mesma razão do apiCall: CORS não dá pra
   * contornar com fetch aqui, mas um envio de formulário não sofre CORS).
   * Como o iframe é de outra origem, não dá pra ler a resposta por JS — por
   * isso, depois de um tempinho, a gente só recarrega a configuração pra
   * conferir se a imagem nova já está lá.
   */
  function submitUploadForm(formId, configKey) {
    const form = $('#' + formId);
    const fileInput = form.querySelector('input[type="file"]');
    if (!fileInput.files || !fileInput.files[0]) return;

    toast('Enviando imagem...');
    form.querySelector('input[name="idToken"]').value = state.idToken || '';
    form.submit();

    setTimeout(() => {
      runServer('getBootstrapData').then(data => {
        state.config = data.config || state.config;
        applyBranding();
        if (state.activeTab === 'adminBrand') renderAdminBrand();
        toast('Imagem atualizada!');
      }).catch(() => toast('Envio concluído — recarregue a página se a imagem não aparecer.'));
    }, 3000);
  }

  /* ================= EVENTOS GERAIS ================= */

  document.addEventListener('DOMContentLoaded', () => {
    state.idToken = loadStoredToken();
    initGoogleIdentity();
    boot();

    $('#btnConfirmarCadastro').addEventListener('click', () => {
      const name = $('#registerNameInput').value.trim();
      if (!name) return toast('Digite seu nome.');
      $('#btnConfirmarCadastro').disabled = true;
      runServer('registerUser', name).then(data => {
        state.user = data;
        enterApp();
      }).catch(err => {
        $('#btnConfirmarCadastro').disabled = false;
        toast('Erro: ' + err.message);
      });
    });

    $('#btnLogout').addEventListener('click', () => {
      if (confirm('Sair da sua conta?')) logout();
    });

    $all('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Listeners delegados globais — registrados UMA única vez.
    // Cada handler checa state.activeTab internamente, então funcionam
    // corretamente mesmo com múltiplos re-renders do #mainContent.
    const main = $('#mainContent');
    main.addEventListener('click', handlePlannerClick);
    main.addEventListener('keydown', handlePlannerKeydown);
    main.addEventListener('click', handleAdminUsersClick);
    main.addEventListener('click', handleDashboardClick);

    $('#btnCloseGardenModal').addEventListener('click', closeGardenModal);
    $('#gardenModal').addEventListener('click', handleGardenModalClick);

    $('#btnCloseMonthModal').addEventListener('click', closeMonthModal);
    $('#monthModal').addEventListener('click', e => { if (e.target.id === 'monthModal') closeMonthModal(); });
    $('#btnPrevMonth').addEventListener('click', () => goToAdjacentMonth(-1));
    $('#btnNextMonth').addEventListener('click', () => { if (!$('#btnNextMonth').disabled) goToAdjacentMonth(1); });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {
        // instalação como PWA ainda funciona sem isso; só perde o cache offline do "shell"
      });
    }
  });
})();
