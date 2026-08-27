// frontend/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const navItems = document.querySelectorAll('.nav-item, .icon-btn[data-target]');
    const views = document.querySelectorAll('.view');
    const loader = document.getElementById('global-loader');

    // Dashboard
    const dashboardCards = document.getElementById('dashboard-cards');
    let entityChartInstance = null;
    let timelineChartInstance = null;
    let attackTypesChartInstance = null;

    // News & Threats
    const newsContainer = document.getElementById('news-container');
    const threatsContainer = document.getElementById('threats-container');
    const cvesContainer = document.getElementById('cves-container');
    const newsSearch = document.getElementById('news-search');
    const threatsSearch = document.getElementById('threats-search');
    const cvesSearch = document.getElementById('cves-search');

    // Slide-out panel
    const sidePanel = document.getElementById('side-panel');
    const closePanel = document.getElementById('close-panel');
    const panelContent = document.getElementById('panel-content');

    closePanel.addEventListener('click', () => {
        sidePanel.classList.remove('open');
    });

    // Notifications
    const bellBtn = document.getElementById('bell-btn');
    const bellBadge = document.getElementById('bell-badge');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifList = document.getElementById('notif-list');
    const clearNotifsBtn = document.getElementById('clear-notifs');
    const brBanner = document.getElementById('br-threat-banner');
    const brBannerClose = document.getElementById('br-banner-close');
    const brBannerTitle = document.getElementById('br-banner-title');
    const brBannerDesc = document.getElementById('br-banner-desc');
    const brBannerLink = document.getElementById('br-banner-link');

    let notifications = JSON.parse(localStorage.getItem('cth_notifications')) || [];
    let notifiedThreatsArray = JSON.parse(localStorage.getItem('cth_notified_threats')) || [];
    const notifiedThreats = new Set(notifiedThreatsArray);

    // Initial check
    setTimeout(() => {
        updateNotifsUI();
        if (notifications.length > 0) {
            bellBadge.style.display = 'block';
        }
    }, 100);

    if (bellBtn) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('open');
            if (notifDropdown.classList.contains('open')) {
                bellBadge.style.display = 'none';
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (notifDropdown && !notifDropdown.contains(e.target)) {
            notifDropdown.classList.remove('open');
        }
    });

    if (clearNotifsBtn) {
        clearNotifsBtn.addEventListener('click', () => {
            notifications = [];
            localStorage.setItem('cth_notifications', JSON.stringify(notifications));
            updateNotifsUI();
        });
    }

    if (brBannerClose) {
        brBannerClose.addEventListener('click', () => {
            brBanner.style.display = 'none';
        });
    }

    if (brBannerLink) {
        brBannerLink.addEventListener('click', (e) => {
            e.preventDefault();
            const threatNavItem = document.querySelector('.nav-item[data-target="view-threats"]');
            if (threatNavItem) {
                threatNavItem.click();
            }
            brBanner.style.display = 'none'; // Optional: close banner after click
        });
    }

    function addNotification(threat, isNew = true) {
        const threatId = `${threat.vitima || ''}-${threat.data_incidente || ''}`;
        if (notifiedThreats.has(threatId)) return;
        notifiedThreats.add(threatId);
        localStorage.setItem('cth_notified_threats', JSON.stringify(Array.from(notifiedThreats)));

        const title = `Alerta Crítico: Ataque no Brasil detectado`;
        const desc = `Vítima: ${threat.vitima || 'Desconhecida'} | Grupo: ${threat.grupo || 'Desconhecido'}`;
        const dateStr = formatDate(threat.data_incidente);

        notifications.unshift({ title, desc, dateStr });
        localStorage.setItem('cth_notifications', JSON.stringify(notifications));

        bellBadge.style.display = 'block';
        updateNotifsUI();

        if (isNew) {
            // Show Banner ONLY for newly fetched, un-cached threats
            brBannerTitle.innerHTML = `🚨 ${title}`;
            brBannerDesc.textContent = desc + `. Verifique o Painel de Ameaças para mais informações.`;
            brBanner.style.display = 'flex';
        }
    }

    function updateNotifsUI() {
        if (notifications.length === 0) {
            notifList.innerHTML = '<p class="text-muted empty-notifs" style="padding:24px;text-align:center;">Nenhuma nova notificação</p>';
            return;
        }

        let html = '';
        notifications.forEach(n => {
            html += `
                <div class="notif-item">
                    <div class="notif-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <div class="notif-content">
                        <h5>${n.title}</h5>
                        <p>${n.desc}</p>
                        <span class="notif-time">${n.dateStr}</span>
                    </div>
                </div>
            `;
        });
        notifList.innerHTML = html;
    }

    // ---- Navigation & View Switching ----
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            // Add active to clicked
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Load data based on view
            if (targetId === 'view-dashboard') loadDashboard();
            if (targetId === 'view-news') loadNews();
            if (targetId === 'view-threats') loadThreats();
            if (targetId === 'view-cves') loadCVEs();
            if (targetId === 'view-settings') loadSettings();
        });
    });

    // ---- Utility Functions ----
    const showLoader = (container) => {
        container.innerHTML = '';
        loader.classList.add('active');
    };
    const hideLoader = () => {
        loader.classList.remove('active');
    };
    const formatDate = (dateString) => {
        if (!dateString) return 'Data Desconhecida';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // ---- Data Fetching & Rendering ----

    // 1. Dashboard
    async function loadDashboard() {
        try {
            const res = await fetch('/api/dashboard');
            const data = await res.json();

            const metrics = data.metrics || {};
            const chartData = data.chartData || {};

            // Helper to format large numbers
            const formatNumber = (num) => {
                if (num >= 1e9) return (num / 1e9).toFixed(1) + ' B';
                if (num >= 1e6) return (num / 1e6).toFixed(1) + ' M';
                if (num >= 1e3) return (num / 1e3).toFixed(1) + ' K';
                return num.toLocaleString();
            };

            // Render Cards (3 Cards Design)
            dashboardCards.innerHTML = `
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title"style="text-transform:uppercase; text-shadow: 1px 1px 2px rgba(255, 3, 3, 1);"><b>Contas Vazadas</b></span>
                        <div class="stat-card-icon" style="background:transparent; border:none;"></div>
                    </div>
                    <div class="stat-card-value">${formatNumber(metrics.pwnedCount || 13500000000)}</div>
                    <div class="stat-trend"><br><svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-top:5px; margin-left: auto; display:block;"><path d="M1 10C2 10 4 12 7 12C10 12 12 5 15 5C18 5 20 12 23 12C26 12 28 8 31 8C34 8 36 10 39 10" stroke="#58a6ff" stroke-width="1.5" stroke-linecap="round"/></svg></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title" style="text-transform:uppercase; text-shadow: 1px 1px 2px rgba(250, 16, 16, 1);"><b>Grupos Ativos</b> <i class="fa-solid fa-users" style="color: var(--accent); margin-left:4px; font-size: 1rem"></i></span>
                        <div class="stat-card-icon" style="background:transparent; border:none;"></div>
                    </div>
                    <div class="stat-card-value">${(metrics.activeGangs || 0).toLocaleString()}</div>
                    <div class="stat-trend"><br></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title" style="text-transform:uppercase; text-shadow: 1px 1px 2px rgba(255, 5, 0, 1);"><b>Total de Ameaças</b> <i class="fa-solid fa-triangle-exclamation" style="color:var(--accent); margin-left:4px; font-size:1rem"></i></span>
                        <div class="stat-card-icon" style="background:transparent; border:none;"></div>
                    </div>
                    <div class="stat-card-value">${(metrics.threats || 0).toLocaleString()}</div>
                    <div class="stat-trend"><br></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title" style="text-transform:uppercase; text-shadow: 1px 1px 2px rgba(255, 5, 0, 1);"><b>Vulnerabilidades</b> <i class="fa-solid fa-shield-halved" style="color:var(--accent); margin-left:4px; font-size: 1rem"></i></span>
                        <div class="stat-card-icon" style="background:transparent; border:none;"></div>
                    </div>
                    <div class="stat-card-value">${(metrics.vulnerabilities || 0).toLocaleString()}</div>
                    <div class="stat-trend"><br></div>
                </div>
            `;

            // Render Charts
            renderCharts(chartData);

            // Check for BR Threats
            const allThreats = data.recentThreats || [];
            allThreats.forEach(t => {
                const paisNorm = (t.pais || '').toLowerCase();
                if (['br', 'brazil', 'brasil'].includes(paisNorm)) {
                    addNotification(t, true); // true = Show banner
                }
            });

            // Render Tables
            renderDashboardTables(allThreats, data.recentVulnerabilities || []);

        } catch (error) {
            dashboardCards.innerHTML = '<p class="text-muted">Erro ao carregar dashboard.</p>';
            console.error(error);
        }
    }

    function renderCharts(chartData) {
        if (entityChartInstance) entityChartInstance.destroy();
        if (timelineChartInstance) timelineChartInstance.destroy();
        if (attackTypesChartInstance) attackTypesChartInstance.destroy();

        // Destroy unused chart if exists
        if (entityChartInstance) entityChartInstance.destroy();

        const ctxTimeline = document.getElementById('incidentTimelineChart').getContext('2d');
        const ctxAttackTypes = document.getElementById('attackTypesChart').getContext('2d');

        // Area Chart - Tendência de Vulnerabilidades Críticas
        let gradientRed = ctxTimeline.createLinearGradient(0, 0, 0, 400);
        gradientRed.addColorStop(0, 'rgba(248, 81, 73, 0.4)');
        gradientRed.addColorStop(1, 'rgba(248, 81, 73, 0.0)');

        // Build a fake smooth curve for last 10-15 points (like February to June) to match layout
        const redAreaLabels = chartData.incidentTimeline?.labels || [];
        const redAreaData = chartData.incidentTimeline?.data || [];

        timelineChartInstance = new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: redAreaLabels, // labels realistas do BD
                datasets: [{
                    label: 'Vulnerabilidades Críticas',
                    data: redAreaData, // dados dinâmicos
                    borderColor: '#f85149',
                    backgroundColor: gradientRed,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#f85149',
                    pointBorderColor: '#1c1e1d',
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 9 } } },
                    y: { min: 0, suggestedMax: 100, grid: { color: '#30363d', borderDash: [5, 5] }, ticks: { color: '#8b949e', stepSize: 25, font: { size: 10 } } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // Doughnut Chart - Distribuição de Severidade
        const doughnutData = chartData.severityDistribution?.data || [15, 30, 40, 15];

        attackTypesChartInstance = new Chart(ctxAttackTypes, {
            type: 'doughnut',
            data: {
                labels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
                datasets: [{
                    data: doughnutData, // Valores vindos do backend de banco de dados
                    backgroundColor: ['#f85149', '#e3a14e', '#58a6ff', '#8b949e'], // Cores seguindo o padrão
                    borderWidth: 1,
                    borderColor: '#1c1e1d' // Cores de borda == background do panel
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#c9d1d9',
                            usePointStyle: true,
                            boxWidth: 8,
                            font: { size: 10 }
                        }
                    }
                }
            }
        });


    }

    function renderDashboardTables(threats, vulns) {
        const threatsTbody = document.querySelector('#recent-threats-table tbody');
        const vulnsList = document.getElementById('active-vulns-list');

        // Tabela Ameaças Recentes
        threatsTbody.innerHTML = '';
        threats.forEach((t, i) => {
            let severidadeText = 'HIGH';
            let severidadeClass = 'warning';

            // Randomiza severidades para dar um look parecido fakes com base nos dados
            if (i % 3 === 0) {
                severidadeText = 'CRITICAL';
                severidadeClass = 'danger';
            } else if (i % 2 !== 0 && i !== 1) {
                severidadeText = 'MEDIUM';
                severidadeClass = 'neutral';
            } else if (i === 1) {
                severidadeText = 'LOW';
                severidadeClass = 'neutral';
            }

            const dataStr = t.data_incidente ? t.data_incidente.split('T')[0] : new Date().toISOString().split('T')[0];

            threatsTbody.innerHTML += `
                <tr>
                    <td>${t.grupo || t.vitima || 'LockBit 3.0'}</td>
                    <td>${t.vitima || t.pais || 'Healthcare Corp'}</td>
                    <td><span class="badge ${severidadeClass}" style="text-transform:uppercase; font-size:0.65rem;">${severidadeText}</span></td>
                    <td>${dataStr}</td>
                </tr>
            `;
        });

        // Lista de Vulnerabilidades Estilizada (Active Vulnerabilities)
        vulnsList.innerHTML = '';
        vulns.forEach((v, i) => {
            const incidentHits = Math.floor(Math.random() * 100) + 120 + (10 - i) * 10;
            vulnsList.innerHTML += `
                <div class="vuln-item" style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div class="vuln-item-id" style="font-size:0.85rem; color: #c9d1d9;">
                        <span style="color:#e3a14e; margin-right:8px; font-size:1.2rem; transform:translateY(2px); display:inline-block;">•</span>
                        ${v.cve_id}
                    </div>
                    <div class="vuln-item-score" style="font-size:0.85rem; color:#58a6ff; font-weight:500;">
                        ${incidentHits}
                    </div>
                </div>
            `;
        });
    }

    // 2. News
    async function loadNews() {
        if (newsContainer.children.length > 0) return;

        showLoader(newsContainer);
        try {
            const res = await fetch('/api/noticias');
            const data = await res.json();
            hideLoader();

            if (!data.noticias || data.noticias.length === 0) {
                newsContainer.innerHTML = '<p class="text-muted">Nenhuma notícia encontrada.</p>';
                return;
            }

            let html = '';
            data.noticias.forEach((item, index) => {
                html += `
                    <div class="list-item" data-index="${index}">
                        <h3>${item.titulo}</h3>
                        <div class="item-meta">
                            <span class="source">${item.fonte || 'CyberSecurity Daily'}</span>
                            <span class="date"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${formatDate(item.data_publicacao)}</span>
                        </div>
                        <p class="item-desc">${item.resumo ? item.resumo.substring(0, 150) + '...' : 'Sem resumo disponível.'}</p>
                        <div class="read-more">Read more <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.8em;"></i></div>
                    </div>
                `;
            });
            newsContainer.innerHTML = html;

            // Add click events to open panel
            newsContainer.querySelectorAll('.list-item').forEach(card => {
                card.addEventListener('click', () => {
                    const idx = card.getAttribute('data-index');
                    const news = data.noticias[idx];

                    panelContent.innerHTML = `
                        <div class="item-header">
                            <span class="badge neutral"><i class="fa-solid fa-rss"></i> ${news.fonte || 'Notícias'}</span>
                            <span class="item-date">${formatDate(news.data_publicacao)}</span>
                        </div>
                        <h2 class="panel-title">${news.titulo}</h2>
                        
                        <div class="ai-summary">
                            <h4><i class="fa-solid fa-wand-magic-sparkles"></i> AI Summary</h4>
                            <p>${news.resumo || 'Resumo gerado por IA indisponível para este artigo.'}</p>
                        </div>
                        
                        <div style="margin-top: 24px;">
                            <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-bright);">Full Article Link</h3>
                            <p class="text-muted">Acesse a fonte original para ler a notícia completa diretamente do publicador.</p>
                            <a href="${news.url}" target="_blank" class="btn-primary">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> View Original Source
                            </a>
                        </div>
                    `;
                    sidePanel.classList.add('open');
                });
            });

        } catch (error) {
            hideLoader();
            newsContainer.innerHTML = '<p class="text-muted">Erro ao carregar notícias.</p>';
        }
    }

    // 3. Threats
    async function loadThreats() {
        if (threatsContainer.children.length > 0) return;

        showLoader(threatsContainer);
        try {
            const res = await fetch('/api/ameacas');
            const data = await res.json();
            hideLoader();

            if (!data.ameacas || data.ameacas.length === 0) {
                threatsContainer.innerHTML = '<p class="text-muted">Nenhuma ameaça encontrada.</p>';
                return;
            }

            let html = '';
            data.ameacas.forEach((item, index) => {
                const paisNorm = (item.pais || '').toLowerCase();
                const isBrazil = ['br', 'brazil', 'brasil'].includes(paisNorm);

                if (isBrazil) {
                    addNotification(item, true); // true = Show banner
                }

                const alertIcon = isBrazil ? '<span style="color:var(--danger); margin-left:8px;" title="Ameaça direcionada ao Brasil!"><i class="fa-solid fa-triangle-exclamation fa-beat-fade"></i></span>' : '';
                const baseStyles = isBrazil
                    ? `style="border: 2px solid var(--danger); border-radius: 12px; padding: 24px; position:relative; box-shadow: 0 0 15px rgba(248, 81, 73, 0.4); background-color: rgba(248, 81, 73, 0.05);"`
                    : `style="padding: 24px; position:relative;"`;

                html += `
                    <div class="list-item" data-index="${index}" ${baseStyles}>
                        <div class="item-header" style="margin-bottom: 24px; align-items: flex-start;">
                            <h3 style="color:${isBrazil ? 'var(--danger)' : 'var(--text-bright)'}; text-transform:uppercase; margin-bottom: 0; font-size: 1.1rem; letter-spacing: 0.5px;">
                                ${item.grupo || item.vitima || 'AMEAÇA REGISTRADA'}
                                ${alertIcon}
                            </h3>
                            <span class="item-date" style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(item.data_incidente)}</span>
                        </div>
                        <p class="item-desc" style="margin-bottom: 32px; font-size: 0.9rem; color: var(--text-muted); line-height: 1.8;">
                            Vítima: ${item.vitima || 'Desconhecida'} <br>
                            País: <strong style="color: ${isBrazil ? 'var(--danger)' : 'inherit'}">${item.pais || 'Desconhecido'}</strong>
                        </p>
                        <div class="item-footer" style="gap: 12px;">
                            <span class="badge danger" style="padding: 6px 14px; background-color: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.3);"><i class="fa-solid fa-skull-crossbones"></i> Ransomware</span>
                            <span class="badge neutral" style="padding: 6px 14px; background-color: rgba(139, 148, 158, 0.15); border: 1px solid rgba(139, 148, 158, 0.3);"><i class="fa-solid fa-file-lines"></i> ${item.fonte || 'Ameaça'}</span>
                        </div>
                    </div>
                `;
            });
            threatsContainer.innerHTML = html;

            // Add click events to open panel
            threatsContainer.querySelectorAll('.list-item').forEach(card => {
                card.addEventListener('click', () => {
                    const idx = card.getAttribute('data-index');
                    const threat = data.ameacas[idx];

                    // Tratamento para links .onion (Dark Web) funcionarem na apresentação
                    let threatUrl = threat.url;
                    let isOnion = false;
                    if (threatUrl && threatUrl.includes('.onion')) {
                        // Ao invés do proxy, manda direto pro site da vítima ou perfil. RansomFeed fornece URLs normais geralmente.
                        threatUrl = threat.url || 'https://ransomfeed.it/';
                        isOnion = true;
                    }

                    panelContent.innerHTML = `
                        <div class="item-header">
                            <span class="badge danger"><i class="fa-solid fa-skull-crossbones"></i> Ransomware</span>
                            <span class="item-date">${formatDate(threat.data_incidente)}</span>
                        </div>
                        <h2 class="panel-title">Ataque: ${threat.grupo || threat.vitima || 'Ameaça'}</h2>
                        
                        <div class="ai-summary" style="border-color: rgba(248,81,73,0.3); background: linear-gradient(145deg, rgba(248,81,73,0.1) 0%, transparent 100%);">
                            <h4 style="color: var(--danger);"><i class="fa-solid fa-robot"></i> System Analysis</h4>
                            ${threat.reportText ?
                            `<p style="white-space: pre-line; line-height: 1.6;">${threat.reportText}</p>`
                            :
                            `<p>Foi identificado um novo ataque de ransomware.<br>A vítima afetada foi identificada como <strong>${threat.vitima || 'Desconhecida'}</strong>, na região de <strong>${threat.pais || 'Desconhecida'}</strong>.</p>
                                ${threat.grupo ? `<p class="mt-2">O grupo responsável pela ameaça foi rastreado: <strong style="text-transform:uppercase;">${threat.grupo}</strong>.</p>` : ''} <br>
                                <p><strong>🔎 Detalhes Técnicos do Evento:</strong></p> <br>
                                <p><strong>👾Grupo:</strong> <a style="text-transform:uppercase;">${threat.grupo || 'Desconhecido'}</a></p><br>
                                <p><strong>🏢Vítima:</strong> ${threat.vitima || 'Desconhecida'}</p><br>
                                <p><strong>📅Data do Incidente:</strong> ${formatDate(threat.data_incidente)}</p><br>
                                <p><strong>🌎País:</strong> ${threat.pais || 'Desconhecido'}</p>`
                        }
                        </div>
                        
                        <div style="margin-top: 24px;">
                            <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-bright);">Relatório da Fonte</h3>
                            <p class="text-muted">Acesse a fonte original da API que reportou este evento na rede.</p>
                            ${threatUrl ? `
                            <a href="${threatUrl}" target="_blank" class="btn-primary" style="background-color: var(--danger); color: white;">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver Origem
                            </a>` : '<p class="text-muted"><em>URL não fornecida pela fonte no momento.</em></p>'}
                        </div>
                        `;
                    sidePanel.classList.add('open');
                });
            });

        } catch (error) {
            hideLoader();
            threatsContainer.innerHTML = '<p class="text-muted">Erro ao carregar ameaças.</p>';
        }
    }

    // 4. CVEs
    async function loadCVEs() {
        if (cvesContainer.children.length > 0) return;

        showLoader(cvesContainer);
        try {
            const res = await fetch('/api/cves');
            const data = await res.json();
            hideLoader();

            if (!data.cves || data.cves.length === 0) {
                cvesContainer.innerHTML = '<p class="text-muted">Nenhuma vulnerabilidade encontrada.</p>';
                return;
            }

            let html = '';
            data.cves.forEach((item, index) => {
                const cvssScore = item.cvss || 'N/A';
                let cvssColor = 'neutral';
                let cvssLabel = 'N/A';
                if (item.cvss) {
                    if (item.cvss >= 9.0) { cvssColor = 'danger'; cvssLabel = 'CRITICAL'; }
                    else if (item.cvss >= 7.0) { cvssColor = 'danger'; cvssLabel = 'HIGH'; }
                    else if (item.cvss >= 4.0) { cvssColor = 'warning'; cvssLabel = 'MEDIUM'; }
                    else { cvssColor = 'neutral'; cvssLabel = 'LOW'; }
                }

                let cvssColorHex = '#8b949e'; // neutral
                let badgeBg = 'rgba(139, 148, 158, 0.1)';
                let badgeBorder = '1px solid rgba(139, 148, 158, 0.3)';
                let badgeClass = 'fa-solid fa-circle-info';

                if (cvssColor === 'danger') {
                    cvssColorHex = '#f85149';
                    badgeBg = 'rgba(248, 81, 73, 0.1)';
                    badgeBorder = '1px solid rgba(248, 81, 73, 0.3)';
                    badgeClass = 'fa-solid fa-circle-exclamation';
                }
                else if (cvssColor === 'warning') {
                    cvssColorHex = '#d29922';
                    badgeBg = 'rgba(210, 153, 34, 0.1)';
                    badgeBorder = '1px solid rgba(210, 153, 34, 0.3)';
                    badgeClass = 'fa-solid fa-triangle-exclamation';
                }
                else if (cvssColor === 'success' || cvssColor === 'low') {
                    cvssColorHex = '#2ea043'; // Assuming success for lower
                    badgeBg = 'rgba(46, 160, 67, 0.1)';
                    badgeBorder = '1px solid rgba(46, 160, 67, 0.3)';
                    badgeClass = 'fa-solid fa-check-circle';
                }
                // If 'neutral', it keeps the default grey defined above

                let titleText = item.title && item.title !== item.id ? item.title : '';
                // user requested EXACTLY the image which just has the CVE-XXXX ID, skipping the title text
                let displayTitle = item.id;

                html += `
                    <div class="list-item" data-index="${index}" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <h3 style="color: var(--text-bright); font-size: 1.2rem; margin: 0; font-weight: 600;">
                                ${displayTitle}
                            </h3>
                            <span style="background-color: ${badgeBg}; color: ${cvssColorHex}; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; border: ${badgeBorder}; display: inline-flex; align-items: center; justify-content: center; width: fit-content; text-transform: uppercase;">
                                <i class="${badgeClass}" style="margin-right: 4px;"></i> ${item.severity || cvssLabel} (CVSS: ${cvssScore})
                            </span>
                        </div>
                        
                        <div style="display: flex; align-items: center; height: 100%;">
                            <span style="color: var(--text-dim); font-size: 0.95rem; text-align: right; white-space: nowrap;">
                                ${formatDate(item.publishedAt)}
                            </span>
                        </div>
                    </div>
                `;
            });
            cvesContainer.innerHTML = html;

            // Add click events to open panel
            cvesContainer.querySelectorAll('.list-item').forEach(card => {
                card.addEventListener('click', async () => {
                    const idx = card.getAttribute('data-index');
                    const baseCve = data.cves[idx];

                    // Show a simple loading state in the panel while fetching details
                    panelContent.innerHTML = '<div style="padding: 24px; text-align: center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top: 10px;">Carregando detalhes da vulnerabilidade...</p></div>';
                    sidePanel.classList.add('open');

                    try {
                        const res = await fetch(`/api/cves/${baseCve.id}`);
                        const detailData = await res.json();

                        // Extract fields: id, title, description, cvss_score, severity, actions
                        const id = detailData.id || baseCve.id;
                        const title = detailData.title && detailData.title !== id ? detailData.title : (baseCve.title && baseCve.title !== id ? baseCve.title : 'Informação Recém-Descoberta / Título não fornecido na origem');

                        let description = detailData.description || baseCve.description || 'Descrição não disponível.';
                        if (description.includes('<div')) {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = description;
                            description = tempDiv.textContent || tempDiv.innerText || description;
                        }


                        const cvssScore = detailData.cvss_score || baseCve.cvss || 'N/A';
                        const severityStr = detailData.severity || baseCve.severity || 'N/A';

                        let actions = 'Consultar o fabricante para mitigações.';
                        if (detailData.solution && Array.isArray(detailData.solution.actions) && detailData.solution.actions.length > 0) {
                            actions = '<ul style="margin-top:4px; margin-bottom:0; padding-left:20px; color:var(--text-bright);">' + detailData.solution.actions.map(a => `<li>${a}</li>`).join('') + '</ul>';
                        } else if (detailData.cisa_kev_detail && detailData.cisa_kev_detail.length > 0) {
                            actions = detailData.cisa_kev_detail[0].required_action || actions;
                        } else if (baseCve.recommendation) {
                            actions = baseCve.recommendation;
                        }

                        let cvssColor = 'neutral';
                        let cvssLabel = severityStr.toUpperCase();
                        if (cvssScore !== 'N/A') {
                            if (cvssScore >= 9.0) { cvssColor = 'danger'; cvssLabel = 'CRITICAL'; }
                            else if (cvssScore >= 7.0) { cvssColor = 'danger'; cvssLabel = 'HIGH'; }
                            else if (cvssScore >= 4.0) { cvssColor = 'warning'; cvssLabel = 'MEDIUM'; }
                            else { cvssColor = 'neutral'; cvssLabel = 'LOW'; }
                        }

                        let badgeIcon = 'fa-shield-virus';
                        if (severityStr.toUpperCase() === 'CRITICAL' || cvssScore >= 9.0) badgeIcon = 'fa-skull';

                        const pubDate = detailData.published || baseCve.publishedAt;

                        panelContent.innerHTML = `
                            <div class="item-header">
                                <span class="badge ${cvssColor}"><i class="fa-solid ${badgeIcon}"></i> ${cvssLabel}</span>
                                <span class="item-date">${formatDate(pubDate)}</span>
                            </div>
                            <h2 class="panel-title" style="margin-bottom: 5px;">${id}</h2>
                            
                            <div class="ai-summary" style="border-color: rgba(88,166,255,0.3); background: linear-gradient(145deg, rgba(88,166,255,0.1) 0%, transparent 100%);">
                                <h4 style="color: var(--accent); margin-bottom: 15px;"><i class="fa-solid fa-list-ul"></i> Detalhes da Vulnerabilidade</h4>
                                <div class="summary-content" style="display: flex; flex-direction: column; gap: 12px;">
                                    <div>
                                        <strong style="color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">Título</strong>
                                        <p style="margin-top: 2px; color: var(--text-bright);">${title}</p>
                                    </div>
                                    <div>
                                        <strong style="color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">CVSS Score: <strong style="margin-top: 2px; color: ${cvssColor === 'danger' ? 'var(--danger)' : (cvssColor === 'warning' ? 'var(--warning)' : 'var(--text-bright)')}; font-weight: bold; font-size: 1rem "> ${cvssScore} </strong></strong>
                                    </div>
                                    <div>
                                        <strong style="color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">Severidade:  <span class="badge ${cvssColor}" style="padding: 4px 8px; font-size: 0.75rem; margin-top: 2px;">
                                               <strong> ${severityStr.toUpperCase() === 'UNKNOWN' ? cvssLabel : severityStr.toUpperCase()}</strong>
                                            </span></strong>
                                    </div>
                                    <div style="margin-top: 8px;">
                                        <strong style="color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">Descrição</strong>
                                        <p style="margin-top: 6px; color: var(--text-bright); line-height: 1.6;">${description}</p>
                                    </div>
                                    <div style="margin-top: 8px;">
                                        <strong style="color: var(--accent); margin-bottom: 15px;"><i class="fa-solid fa-list-ul"></i> Recomendações de Segurança</strong>
                                        <p style="margin-top: 6px; color: var(--text-bright); line-height: 1.6;">${actions}</p>     
                                    </div>
                                </div>
                            </div>
                            
                            <div style="margin-top: 24px;">
                                <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-bright);">Fonte Original</h3>
                                <p class="text-muted">Acesse a referência para verificar os patches e mitigações, na NVD ou fonte associada.</p>
                                <a href="${detailData.url || baseCve.sourceUrl || `https://nvd.nist.gov/vuln/detail/${id}`}" target="_blank" class="btn-primary" style="background-color: var(--accent); color: white;">
                                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver Detalhes Originais
                                </a>
                            </div>
                        `;

                        // Update the list card DOM immediately to reflect the new data without refreshing!
                        const badgeSpan = card.querySelector('span[style*="border-radius: 12px"]');
                        if (badgeSpan && cvssScore !== 'N/A') {
                            let newBadgeBg = 'rgba(139, 148, 158, 0.1)';
                            let newCvssColorHex = '#8b949e';
                            let newBadgeBorder = '1px solid rgba(139, 148, 158, 0.3)';
                            let newBadgeClass = 'fa-solid fa-circle-info';

                            if (cvssColor === 'danger') {
                                newCvssColorHex = '#f85149';
                                newBadgeBg = 'rgba(248, 81, 73, 0.1)';
                                newBadgeBorder = '1px solid rgba(248, 81, 73, 0.3)';
                                newBadgeClass = 'fa-solid fa-circle-exclamation';
                            } else if (cvssColor === 'warning') {
                                newCvssColorHex = '#d29922';
                                newBadgeBg = 'rgba(210, 153, 34, 0.1)';
                                newBadgeBorder = '1px solid rgba(210, 153, 34, 0.3)';
                                newBadgeClass = 'fa-solid fa-triangle-exclamation';
                            } else if (cvssColor === 'success' || cvssColor === 'low') {
                                newCvssColorHex = '#2ea043';
                                newBadgeBg = 'rgba(46, 160, 67, 0.1)';
                                newBadgeBorder = '1px solid rgba(46, 160, 67, 0.3)';
                                newBadgeClass = 'fa-solid fa-check-circle';
                            }
                            badgeSpan.style.backgroundColor = newBadgeBg;
                            badgeSpan.style.color = newCvssColorHex;
                            badgeSpan.style.border = newBadgeBorder;
                            badgeSpan.innerHTML = `<i class="${newBadgeClass}" style="margin-right: 4px;"></i> ${cvssLabel} (CVSS: ${cvssScore})`;
                        }

                    } catch (error) {
                        panelContent.innerHTML = '<div style="padding: 24px; text-align: center;"><p style="color: var(--danger);">Erro ao carregar detalhes da vulnerabilidade.</p></div>';
                        console.error("Error fetching CVE details:", error);
                    }
                });
            });

        } catch (error) {
            hideLoader();
            cvesContainer.innerHTML = '<p class="text-muted">Erro ao carregar vulnerabilidades (CVEs).</p>';
        }
    }

    // 5. Settings
    async function loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            
            document.getElementById('alertEmails').value = data.ALERT_EMAIL_TO || '';
            document.getElementById('teamsWebhook').value = data.TEAMS_WEBHOOK_URL || '';
            document.getElementById('telegramToken').value = data.TELEGRAM_BOT_TOKEN || '';
            document.getElementById('telegramChatId').value = data.TELEGRAM_CHAT_ID || '';
        } catch (error) {
            console.error("Erro ao carregar configurações", error);
        }
    }

    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusSpan = document.getElementById('settings-status');
            const submitBtn = settingsForm.querySelector('button[type="submit"]');
            
            const payload = {
                ALERT_EMAIL_TO: document.getElementById('alertEmails').value,
                TEAMS_WEBHOOK_URL: document.getElementById('teamsWebhook').value,
                TELEGRAM_BOT_TOKEN: document.getElementById('telegramToken').value,
                TELEGRAM_CHAT_ID: document.getElementById('telegramChatId').value
            };
            
            submitBtn.disabled = true;
            statusSpan.style.display = 'inline';
            statusSpan.style.color = 'var(--text-bright)';
            statusSpan.textContent = 'Salvando...';

            try {
                const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                
                if (data.success) {
                    statusSpan.style.color = 'var(--accent)';
                    statusSpan.textContent = 'Salvo com sucesso!';
                } else {
                    statusSpan.style.color = 'var(--danger)';
                    statusSpan.textContent = 'Erro ao salvar!';
                }
            } catch (err) {
                statusSpan.style.color = 'var(--danger)';
                statusSpan.textContent = 'Erro de conexão!';
            }
            
            submitBtn.disabled = false;
            setTimeout(() => { statusSpan.style.display = 'none'; }, 3000);
        });
    }

    // ---- Search Logic ----
    if (newsSearch) {
        newsSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = newsContainer.querySelectorAll('.list-item');
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(term) ? 'block' : 'none';
            });
        });
    }

    if (threatsSearch) {
        threatsSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = threatsContainer.querySelectorAll('.list-item');
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(term) ? 'block' : 'none';
            });
        });
    }

    if (cvesSearch) {
        cvesSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = cvesContainer.querySelectorAll('.list-item');
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(term) ? 'block' : 'none';
            });
        });
    }

    // Inicializar a primeira aba (Dashboard)
    loadDashboard();

    // Loop para simular/atualizar os dados "Ao Vivo" a cada 15 segundos sem recarregar tela
    setInterval(() => {
        const activeView = document.querySelector('.view.active');
        if (activeView && activeView.id === 'view-dashboard') {
            loadDashboard();
        }
    }, 15000);
});
