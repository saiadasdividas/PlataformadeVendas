// Configuração do Firebase em arquivo externo config.js

// Inicializar Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Estado da aplicação
const adminRoles = ['SUPER_ADMIN', 'ADMIN_OPERACIONAL', 'ADMIN_CONTEUDO', 'ADMIN_GAMIFICACAO'];
const mrRoles = ['MR_RESPONSAVEL'];

let currentUser = null;
let userRole = null;
let currentPage = 'dashboard';

function isAdmin() {
    return adminRoles.includes(userRole);
}

// 1. Mapeamento de quais abas cada role vê
const navConfig = {
    SUPER_ADMIN: ['dashboard','academia','gamificacao','crm','mr-representacoes','perfil','admin'],
    ADMIN_OPERACIONAL: ['dashboard','academia','gamificacao','crm','perfil','admin'],
    ADMIN_CONTEUDO: ['dashboard','academia','perfil','admin'],
    ADMIN_GAMIFICACAO: ['dashboard','academia','gamificacao','perfil','admin'],
    USER_SDR: ['dashboard','academia','crm','perfil'],
    USER_VENDEDOR: ['dashboard','crm','perfil'],
    MR_RESPONSAVEL: ['dashboard','academia','perfil'],
    USER: ['dashboard','perfil']
};

// 2. Função que gera o menu no DOM
function renderMenuForRole(role) {
    const meta = {
        dashboard: { icon: 'fas fa-home', label: 'Dashboard' },
        academia: { icon: 'fas fa-graduation-cap', label: 'Academia' },
        gamificacao: { icon: 'fas fa-gamepad', label: 'Gamificação' },
        crm: { icon: 'fas fa-briefcase', label: 'CRM & Vendas' },
        'mr-representacoes': { icon: 'fas fa-user-tie', label: 'MR Representações' },
        perfil: { icon: 'fas fa-user', label: 'Perfil' },
        admin: { icon: 'fas fa-cog', label: 'Admin' }
    };

    const menu = document.getElementById('navMenu');
    menu.innerHTML = '';

    (navConfig[role] || navConfig.USER).forEach(page => {
        const conf = meta[page];
        if (!conf) return;

        const a = document.createElement('a');
        a.href = '#';
        a.className = 'nav-item';
        a.dataset.page = page;
        a.innerHTML = `<i class="${conf.icon}"></i><span>${conf.label}</span>`;
        
        a.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(page);
        });
        
        menu.appendChild(a);
    });
}

// Elementos DOM
const loginPage = document.getElementById('loginPage');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const contentArea = document.getElementById('contentArea');
const pageTitle = document.getElementById('pageTitle');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');

// 3. Único onAuthStateChanged, já capturando claims e montando menu
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        showLoginPage();
        return;
    }

    try {
        // Pega o token completo, incluindo claims customizadas
        const idTokenResult = await user.getIdTokenResult();
        // Extrair o role
        userRole = idTokenResult.claims.role || 'USER';
        currentUser = user;

        await loadUserData();    // já existente: carrega dados do Firestore
        renderMenuForRole(userRole); // monta o menu de acordo com a role
        showMainApp();
        loadPage(currentPage);
    } catch (error) {
        console.error('Erro ao processar usuário:', error);
        showLoginPage();
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading(true);
    hideAlert();
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        showAlert('Erro ao fazer login: ' + error.message, 'error');
        showLoading(false);
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
});

// Toggle Sidebar
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const icon = sidebarToggle.querySelector('i');
    if (sidebar.classList.contains('collapsed')) {
        icon.className = 'fas fa-chevron-right';
        document.getElementById('logoText').style.display = 'none';
    } else {
        icon.className = 'fas fa-chevron-left';
        document.getElementById('logoText').style.display = 'block';
    }
});

// Funções auxiliares
function showLoginPage() {
    loginPage.classList.remove('hidden');
    mainApp.classList.add('hidden');
}

function showMainApp() {
    loginPage.classList.add('hidden');
    mainApp.classList.remove('hidden');
}

function showLoading(show) {
    const btnText = document.getElementById('loginBtnText');
    const loading = document.getElementById('loginLoading');
    if (show) {
        btnText.style.display = 'none';
        loading.classList.remove('hidden');
    } else {
        btnText.style.display = 'block';
        loading.classList.add('hidden');
    }
}

function showAlert(message, type = 'error') {
    loginAlert.textContent = message;
    loginAlert.className = `alert alert-${type}`;
    loginAlert.classList.remove('hidden');
}

function hideAlert() {
    loginAlert.classList.add('hidden');
}

function navigateTo(page) {
    currentPage = page;
    
    // Atualizar navegação ativa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNavItem = document.querySelector(`[data-page="${page}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    loadPage(page);
}

// Função loadUserData (adicione se não existir)
        async function loadUserData() {
            try {
                const userDoc = await db.collection('users').doc(currentUser.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    userRole = userData.profile?.role || 'USER';
                    // Atualizar UI com dados do usuário
                    document.getElementById('userName').textContent = userData.profile?.name || currentUser.email;
                    document.getElementById('userAvatar').textContent = (userData.profile?.name || currentUser.email).charAt(0).toUpperCase();
                    document.getElementById('userPoints').textContent = `${userData.stats?.totalPoints || 0} pts`;
                    renderMenuForRole(userRole);
                } else {
                    // Criar perfil padrão se não existir
                    await createDefaultUserProfile();
                }
            } catch (error) {
                console.error('Erro ao carregar dados do usuário:', error);
            }
        }

        async function createDefaultUserProfile() {
            const defaultProfile = {
                profile: {
                    name: currentUser.displayName || currentUser.email,
                    email: currentUser.email,
                    role: 'USER',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                stats: {
                    totalPoints: 0,
                    level: 1,
                    badges: [],
                    achievements: []
                }
            };

            await db.collection('users').doc(currentUser.uid).set(defaultProfile);
            userRole = 'USER';
        }

        async function updateUserProfile(uid, profileData) {
            if (!isAdmin()) {
                throw new Error('Permissão negada');
            }

            await fsUpdate('users', uid, {
                profile: {
                    ...profileData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            });
        }

        function loadPage(page) {
            pageTitle.textContent = getPageTitle(page);
            contentArea.innerHTML = getPageContent(page);
            contentArea.className = 'content-area fade-in';
            
            // Executar scripts específicos da página
            executePageScripts(page);
        }

        function getPageTitle(page) {
            const titles = {
                'dashboard': 'Dashboard Principal',
                'academia': 'Academia de Treinamentos',
                'gamificacao': 'Gamificação',
                'crm': 'CRM & Vendas',
                'mr-representacoes': 'MR Representações',
                'perfil': 'Meu Perfil',
                'admin': 'Painel Administrativo'
            };
            return titles[page] || 'Dashboard';
        }

        function getPageContent(page) {
            switch (page) {
                case 'dashboard':
                    return getDashboardContent();
                case 'academia':
                    return getAcademiaContent();
                case 'gamificacao':
                    return getGamificacaoContent();
                case 'crm':
                    return getCrmContent();
                case 'mr-representacoes':
                    return getMrRepresentacoesContent();
                case 'perfil':
                    return getPerfilContent();
                case 'admin':
                    return getAdminContent();
                default:
                    return getDashboardContent();
            }
        }

        function getDashboardContent() {
            if (isAdmin()) return getAdminDashboard();
            return getUserDashboard();
        }

        function getUserDashboard() {
            return `
                <div class="dashboard-grid">
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--success);">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="dashTotalPoints">1,234</h3>
                            <p>Pontos Totais</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--primary);">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="dashCompletedModules">8</h3>
                            <p>Módulos Concluídos</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--warning);">
                            <i class="fas fa-target"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="dashGoalsAchieved">5</h3>
                            <p>Metas Atingidas</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--secondary);">
                            <i class="fas fa-medal"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="dashRanking">#3</h3>
                            <p>Posição no Ranking</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-chart-line"></i>
                            Progresso Semanal
                        </h2>
                        <div class="chart-container">
                            <canvas id="weeklyProgressChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-tasks"></i>
                            Atividades Recentes
                        </h2>
                        <div id="recentActivities">
                            <div class="activity-item" style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                                <div class="activity-icon" style="width: 40px; height: 40px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-right: 12px;">
                                    <i class="fas fa-check"></i>
                                </div>
                                <div class="activity-content">
                                    <p style="font-weight: 600; margin-bottom: 4px;">Módulo "Técnicas de Qualificação BANT" concluído</p>
                                    <p style="font-size: 12px; color: var(--text-light);">Há 2 horas</p>
                                </div>
                            </div>
                            <div class="activity-item" style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                                <div class="activity-icon" style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-right: 12px;">
                                    <i class="fas fa-phone"></i>
                                </div>
                                <div class="activity-content">
                                    <p style="font-weight: 600; margin-bottom: 4px;">15 ligações realizadas hoje</p>
                                    <p style="font-size: 12px; color: var(--text-light);">Há 1 hora</p>
                                </div>
                            </div>
                            <div class="activity-item" style="display: flex; align-items: center; padding: 12px 0;">
                                <div class="activity-icon" style="width: 40px; height: 40px; background: var(--warning); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-right: 12px;">
                                    <i class="fas fa-trophy"></i>
                                </div>
                                <div class="activity-content">
                                    <p style="font-weight: 600; margin-bottom: 4px;">Badge "Prospect Hunter" conquistado</p>
                                    <p style="font-size: 12px; color: var(--text-light);">Ontem</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card section-card">
                    <h2 class="section-title">
                        <i class="fas fa-bullseye"></i>
                        Metas do Mês
                    </h2>
                    <div class="goals-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
                        <div class="goal-item">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 600;">Ligações Realizadas</span>
                                <span style="color: var(--text-light);">85/100</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 85%;"></div>
                            </div>
                        </div>
                        <div class="goal-item">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 600;">Prospects Qualificados</span>
                                <span style="color: var(--text-light);">12/15</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 80%;"></div>
                            </div>
                        </div>
                        <div class="goal-item">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 600;">Reuniões Agendadas</span>
                                <span style="color: var(--text-light);">8/10</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 80%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function getAdminDashboard() {
            return getUserDashboard();
        }

        function getAcademiaContent() {
            return `
                <div class="module-header">
                    <div>
                        <h1 class="module-title">Academia de Treinamentos</h1>
                        <p class="module-subtitle">Desenvolva suas habilidades com nossos módulos especializados</p>
                    </div>
                    ${isAdmin() ? `
                    <button class="btn btn-primary" onclick="openModal('addModuleModal')">
                        <i class="fas fa-plus"></i>
                        Novo Módulo
                    </button>` : ''}
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-user-tie"></i>
                            SDR Mastery
                        </h2>
                        <p style="color: var(--text-light); margin-bottom: 24px;">Módulos especializados para Sales Development Representatives</p>
                        
                        <div id="trainingModules" class="modules-list"></div>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-handshake"></i>
                            Vendas Internas
                        </h2>
                        <p style="color: var(--text-light); margin-bottom: 24px;">Módulos especializados para Vendedores Internos</p>
                        
                        <div class="modules-list">
                            <div class="module-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.3s ease;" onclick="openModule('vendas-1')">
                                <div class="module-icon" style="width: 50px; height: 50px; background: var(--primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; margin-right: 16px;">
                                    <i class="fas fa-play"></i>
                                </div>
                                <div class="module-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">1. Vendas Consultivas</h4>
                                    <p style="font-size: 14px; color: var(--text-light); margin-bottom: 8px;">Técnicas de venda baseadas em consultoria</p>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <span class="badge badge-primary">Disponível</span>
                                        <span style="font-size: 12px; color: var(--text-light);">+80 pontos</span>
                                    </div>
                                </div>
                                <div class="module-progress" style="text-align: right;">
                                    <div style="font-size: 24px; font-weight: 700; color: var(--text-light);">0%</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Não iniciado</div>
                                </div>
                            </div>

                            <div class="module-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.3s ease;" onclick="openModule('vendas-2')">
                                <div class="module-icon" style="width: 50px; height: 50px; background: var(--border); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--text-light); margin-right: 16px;">
                                    <i class="fas fa-lock"></i>
                                </div>
                                <div class="module-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">2. Atendimento Excepcional</h4>
                                    <p style="font-size: 14px; color: var(--text-light); margin-bottom: 8px;">Como proporcionar uma experiência única ao cliente</p>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <span class="badge" style="background: #f1f5f9; color: var(--text-light);">Bloqueado</span>
                                        <span style="font-size: 12px; color: var(--text-light);">+90 pontos</span>
                                    </div>
                                </div>
                                <div class="module-progress" style="text-align: right;">
                                    <div style="font-size: 24px; font-weight: 700; color: var(--text-light);">0%</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Bloqueado</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card section-card">
                    <h2 class="section-title">
                        <i class="fas fa-book"></i>
                        Biblioteca de Conteúdo
                    </h2>
                    <div class="library-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                        <div class="library-item card" style="padding: 20px; text-align: center; cursor: pointer;">
                            <i class="fas fa-file-alt" style="font-size: 32px; color: var(--primary); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Artigos Especializados</h4>
                            <p style="font-size: 14px; color: var(--text-light);">45 artigos disponíveis</p>
                        </div>
                        <div class="library-item card" style="padding: 20px; text-align: center; cursor: pointer;">
                            <i class="fas fa-video" style="font-size: 32px; color: var(--success); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Vídeos Educativos</h4>
                            <p style="font-size: 14px; color: var(--text-light);">23 vídeos disponíveis</p>
                        </div>
                        <div class="library-item card" style="padding: 20px; text-align: center; cursor: pointer;">
                            <i class="fas fa-chart-line" style="font-size: 32px; color: var(--warning); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Cases de Sucesso</h4>
                            <p style="font-size: 14px; color: var(--text-light);">12 cases disponíveis</p>
                        </div>
                        <div class="library-item card" style="padding: 20px; text-align: center; cursor: pointer;">
                            <i class="fas fa-file-download" style="font-size: 32px; color: var(--secondary); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Templates e Scripts</h4>
                            <p style="font-size: 14px; color: var(--text-light);">18 templates disponíveis</p>
                        </div>
                    </div>
                </div>

                <div class="card section-card">
                    <h2 class="section-title">
                        <i class="fas fa-comment"></i>
                        Envie seu Feedback
                    </h2>
                    <form id="feedbackForm">
                        <textarea id="feedbackText" class="input" placeholder="Escreva aqui" required style="margin-bottom:12px;"></textarea>
                        <button type="submit" class="btn btn-primary">Enviar</button>
                    </form>
                    <div id="myFeedbacks" style="margin-top:16px;"></div>
                </div>
            `;
        }

        function getGamificacaoContent() {
            return `
                <div class="module-header">
                    <div>
                        <h1 class="module-title">Gamificação</h1>
                        <p class="module-subtitle">Acompanhe seu progresso, conquistas e posição no ranking</p>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-trophy"></i>
                            Ranking Geral
                        </h2>
                        <ul class="ranking-list">
                            <li class="ranking-item">
                                <div class="ranking-position" style="background: #ffd700;">1</div>
                                <div class="ranking-info">
                                    <h4>João Silva</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">SDR</p>
                                </div>
                                <div class="ranking-points">2,450 pts</div>
                            </li>
                            <li class="ranking-item">
                                <div class="ranking-position" style="background: #c0c0c0;">2</div>
                                <div class="ranking-info">
                                    <h4>Maria Santos</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Vendedora</p>
                                </div>
                                <div class="ranking-points">2,180 pts</div>
                            </li>
                            <li class="ranking-item" style="background: #f0f9ff; border-color: var(--primary);">
                                <div class="ranking-position" style="background: #cd7f32;">3</div>
                                <div class="ranking-info">
                                    <h4>Você</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">SDR</p>
                                </div>
                                <div class="ranking-points">1,890 pts</div>
                            </li>
                            <li class="ranking-item">
                                <div class="ranking-position">4</div>
                                <div class="ranking-info">
                                    <h4>Carlos Oliveira</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Vendedor</p>
                                </div>
                                <div class="ranking-points">1,650 pts</div>
                            </li>
                            <li class="ranking-item">
                                <div class="ranking-position">5</div>
                                <div class="ranking-info">
                                    <h4>Ana Costa</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">SDR</p>
                                </div>
                                <div class="ranking-points">1,420 pts</div>
                            </li>
                        </ul>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-medal"></i>
                            Minhas Conquistas
                        </h2>
                        <div class="badges-grid">
                            <div class="badge-item">
                                <div class="badge-icon">
                                    <i class="fas fa-graduation-cap"></i>
                                </div>
                                <div class="badge-name">Estudioso</div>
                                <div class="badge-description">5 módulos concluídos</div>
                            </div>
                            <div class="badge-item">
                                <div class="badge-icon">
                                    <i class="fas fa-phone"></i>
                                </div>
                                <div class="badge-name">Comunicador</div>
                                <div class="badge-description">100 ligações realizadas</div>
                            </div>
                            <div class="badge-item">
                                <div class="badge-icon">
                                    <i class="fas fa-target"></i>
                                </div>
                                <div class="badge-name">Certeiro</div>
                                <div class="badge-description">Meta batida 3x seguidas</div>
                            </div>
                            <div class="badge-item" style="opacity: 0.5;">
                                <div class="badge-icon" style="background: #e2e8f0; color: var(--text-light);">
                                    <i class="fas fa-crown"></i>
                                </div>
                                <div class="badge-name">Lenda</div>
                                <div class="badge-description">Top 1 por 3 meses</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-chart-bar"></i>
                            Progresso por Categoria
                        </h2>
                        <div class="progress-categories">
                            <div class="category-item" style="margin-bottom: 24px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <span style="font-weight: 600;">📚 Aprendizado</span>
                                    <span style="color: var(--text-light);">450/500 pts</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 90%;"></div>
                                </div>
                            </div>
                            <div class="category-item" style="margin-bottom: 24px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <span style="font-weight: 600;">💼 Vendas</span>
                                    <span style="color: var(--text-light);">320/400 pts</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 80%;"></div>
                                </div>
                            </div>
                            <div class="category-item" style="margin-bottom: 24px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <span style="font-weight: 600;">🎯 Metas</span>
                                    <span style="color: var(--text-light);">280/350 pts</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 80%;"></div>
                                </div>
                            </div>
                            <div class="category-item">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <span style="font-weight: 600;">⚡ Atividade</span>
                                    <span style="color: var(--text-light);">190/300 pts</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 63%;"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-gift"></i>
                            Loja de Recompensas
                        </h2>
                        <div class="rewards-grid" style="display: grid; gap: 16px;">
                            <div class="reward-item" style="display: flex; align-items: center; padding: 16px; border: 1px solid var(--border); border-radius: 12px;">
                                <div class="reward-icon" style="width: 50px; height: 50px; background: var(--warning); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; margin-right: 16px;">
                                    <i class="fas fa-coffee"></i>
                                </div>
                                <div class="reward-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Vale Café</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">R$ 20 em cafeterias parceiras</p>
                                </div>
                                <div class="reward-cost" style="text-align: right;">
                                    <div style="font-weight: 700; color: var(--primary);">500 pts</div>
                                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; margin-top: 4px;">Resgatar</button>
                                </div>
                            </div>
                            <div class="reward-item" style="display: flex; align-items: center; padding: 16px; border: 1px solid var(--border); border-radius: 12px;">
                                <div class="reward-icon" style="width: 50px; height: 50px; background: var(--success); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; margin-right: 16px;">
                                    <i class="fas fa-home"></i>
                                </div>
                                <div class="reward-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Home Office</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">1 dia de trabalho remoto</p>
                                </div>
                                <div class="reward-cost" style="text-align: right;">
                                    <div style="font-weight: 700; color: var(--primary);">1000 pts</div>
                                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; margin-top: 4px;">Resgatar</button>
                                </div>
                            </div>
                            <div class="reward-item" style="display: flex; align-items: center; padding: 16px; border: 1px solid var(--border); border-radius: 12px; opacity: 0.5;">
                                <div class="reward-icon" style="width: 50px; height: 50px; background: var(--text-light); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; margin-right: 16px;">
                                    <i class="fas fa-car"></i>
                                </div>
                                <div class="reward-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Vaga Premium</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Vaga de estacionamento por 1 mês</p>
                                </div>
                                <div class="reward-cost" style="text-align: right;">
                                    <div style="font-weight: 700; color: var(--text-light);">2000 pts</div>
                                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px; margin-top: 4px;" disabled>Insuficiente</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card section-card">
                    <h2 class="section-title">
                        <i class="fas fa-calendar-check"></i>
                        Desafios Ativos
                    </h2>
                    <div class="challenges-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                        <div class="challenge-item card" style="padding: 20px;">
                            <div style="display: flex; align-items: center; margin-bottom: 16px;">
                                <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-right: 12px;">
                                    <i class="fas fa-phone"></i>
                                </div>
                                <div>
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Desafio Diário</h4>
                                    <p style="font-size: 12px; color: var(--text-light);">Expira em 8h</p>
                                </div>
                            </div>
                            <p style="margin-bottom: 16px;">Realize 20 ligações hoje</p>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 14px;">Progresso</span>
                                <span style="font-size: 14px; color: var(--text-light);">15/20</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 75%;"></div>
                            </div>
                            <div style="text-align: center; margin-top: 16px;">
                                <span style="font-weight: 600; color: var(--primary);">+100 pontos</span>
                            </div>
                        </div>

                        <div class="challenge-item card" style="padding: 20px;">
                            <div style="display: flex; align-items: center; margin-bottom: 16px;">
                                <div style="width: 40px; height: 40px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-right: 12px;">
                                    <i class="fas fa-graduation-cap"></i>
                                </div>
                                <div>
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Desafio Semanal</h4>
                                    <p style="font-size: 12px; color: var(--text-light);">Expira em 3 dias</p>
                                </div>
                            </div>
                            <p style="margin-bottom: 16px;">Complete 2 módulos de treinamento</p>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 14px;">Progresso</span>
                                <span style="font-size: 14px; color: var(--text-light);">1/2</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 50%;"></div>
                            </div>
                            <div style="text-align: center; margin-top: 16px;">
                                <span style="font-weight: 600; color: var(--success);">+250 pontos</span>
                            </div>
                        </div>

                        <div class="challenge-item card" style="padding: 20px;">
                            <div style="display: flex; align-items: center; margin-bottom: 16px;">
                                <div style="width: 40px; height: 40px; background: var(--warning); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-right: 12px;">
                                    <i class="fas fa-target"></i>
                                </div>
                                <div>
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Desafio Mensal</h4>
                                    <p style="font-size: 12px; color: var(--text-light);">Expira em 15 dias</p>
                                </div>
                            </div>
                            <p style="margin-bottom: 16px;">Bata todas as metas do mês</p>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 14px;">Progresso</span>
                                <span style="font-size: 14px; color: var(--text-light);">2/4</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 50%;"></div>
                            </div>
                            <div style="text-align: center; margin-top: 16px;">
                                <span style="font-weight: 600; color: var(--warning);">+500 pontos</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function getCrmContent() {
            return `
                <div class="module-header">
                    <div>
                        <h1 class="module-title">CRM & Vendas</h1>
                        <p class="module-subtitle">Gerencie seus prospects, pipeline e campanhas</p>
                    </div>
                    <button class="btn btn-primary" onclick="openModal('addProspectModal')">
                        <i class="fas fa-plus"></i>
                        Novo Prospect
                    </button>
                </div>

                <div class="dashboard-grid">
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--primary);">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <h3>127</h3>
                            <p>Prospects Ativos</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--success);">
                            <i class="fas fa-handshake"></i>
                        </div>
                        <div class="stat-content">
                            <h3>23</h3>
                            <p>Vendas no Mês</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--warning);">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="stat-content">
                            <h3>R$ 45.2K</h3>
                            <p>Faturamento</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--secondary);">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-content">
                            <h3>18%</h3>
                            <p>Taxa de Conversão</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-funnel-dollar"></i>
                            Pipeline de Vendas
                        </h2>
                        <div class="pipeline-stages" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                            <div class="pipeline-stage" style="background: #f8fafc; border-radius: 12px; padding: 16px;">
                                <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">Prospect Identificado</h4>
                                <div class="stage-count" style="font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">45</div>
                                <div class="stage-value" style="font-size: 14px; color: var(--text-light);">R$ 125.000</div>
                            </div>
                            <div class="pipeline-stage" style="background: #f0f9ff; border-radius: 12px; padding: 16px;">
                                <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">Primeiro Contato</h4>
                                <div class="stage-count" style="font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">32</div>
                                <div class="stage-value" style="font-size: 14px; color: var(--text-light);">R$ 89.500</div>
                            </div>
                            <div class="pipeline-stage" style="background: #f0fdf4; border-radius: 12px; padding: 16px;">
                                <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">Qualificado</h4>
                                <div class="stage-count" style="font-size: 24px; font-weight: 700; color: var(--success); margin-bottom: 8px;">18</div>
                                <div class="stage-value" style="font-size: 14px; color: var(--text-light);">R$ 67.200</div>
                            </div>
                            <div class="pipeline-stage" style="background: #fffbeb; border-radius: 12px; padding: 16px;">
                                <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">Proposta Enviada</h4>
                                <div class="stage-count" style="font-size: 24px; font-weight: 700; color: var(--warning); margin-bottom: 8px;">12</div>
                                <div class="stage-value" style="font-size: 14px; color: var(--text-light);">R$ 45.800</div>
                            </div>
                            <div class="pipeline-stage" style="background: #f0f9ff; border-radius: 12px; padding: 16px;">
                                <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">Negociação</h4>
                                <div class="stage-count" style="font-size: 24px; font-weight: 700; color: var(--secondary); margin-bottom: 8px;">8</div>
                                <div class="stage-value" style="font-size: 14px; color: var(--text-light);">R$ 32.100</div>
                            </div>
                        </div>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-chart-line"></i>
                            Performance de Vendas
                        </h2>
                        <div class="chart-container">
                            <canvas id="salesChart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="card section-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 class="section-title">
                            <i class="fas fa-list"></i>
                            Lista de Prospects
                        </h2>
                        <div style="display: flex; gap: 12px;">
                            <select class="input" style="width: auto;">
                                <option>Todos os Status</option>
                                <option>Novo</option>
                                <option>Contactado</option>
                                <option>Qualificado</option>
                                <option>Proposta</option>
                            </select>
                            <input type="text" class="input" placeholder="Buscar prospects..." style="width: 250px;">
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Empresa</th>
                                    <th>Status</th>
                                    <th>Valor Potencial</th>
                                    <th>Último Contato</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="prospectRows"></tbody>
                        </table>
                    </div>
                </div>

                <div class="card section-card">
                    <h2 class="section-title">
                        <i class="fas fa-bullhorn"></i>
                        Campanhas Ativas
                    </h2>
                    <div class="campaigns-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                        <div class="campaign-item card" style="padding: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                                <h4 style="font-weight: 600;">Campanha Natal 2024</h4>
                                <span class="badge badge-success">Ativa</span>
                            </div>
                            <p style="color: var(--text-light); margin-bottom: 16px;">Embalagens festivas com desconto especial para o período natalino</p>
                            <div style="margin-bottom: 16px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-size: 14px;">Meta: R$ 50.000</span>
                                    <span style="font-size: 14px; color: var(--text-light);">R$ 32.500</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 65%;"></div>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 12px; color: var(--text-light);">Termina em 15 dias</span>
                                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;">Ver Detalhes</button>
                            </div>
                        </div>

                        <div class="campaign-item card" style="padding: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                                <h4 style="font-weight: 600;">Black Friday</h4>
                                <span class="badge badge-warning">Planejada</span>
                            </div>
                            <p style="color: var(--text-light); margin-bottom: 16px;">Mega promoção com até 40% de desconto em produtos selecionados</p>
                            <div style="margin-bottom: 16px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-size: 14px;">Meta: R$ 80.000</span>
                                    <span style="font-size: 14px; color: var(--text-light);">R$ 0</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 0%;"></div>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 12px; color: var(--text-light);">Inicia em 30 dias</span>
                                <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">Configurar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function getMrRepresentacoesContent() {
            return `
                <div class="module-header">
                    <div>
                        <h1 class="module-title">MR Representações</h1>
                        <p class="module-subtitle">Gerencie suas tarefas diárias e acompanhe suas metas</p>
                    </div>
                    <button class="btn btn-primary" onclick="openModal('addTaskModal')">
                        <i class="fas fa-plus"></i>
                        Nova Tarefa
                    </button>
                </div>

                <div class="dashboard-grid">
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--success);">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <h3>12</h3>
                            <p>Tarefas Concluídas</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--warning);">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <h3>5</h3>
                            <p>Tarefas Pendentes</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--primary);">
                            <i class="fas fa-target"></i>
                        </div>
                        <div class="stat-content">
                            <h3>85%</h3>
                            <p>Meta do Mês</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--secondary);">
                            <i class="fas fa-calendar-week"></i>
                        </div>
                        <div class="stat-content">
                            <h3>7</h3>
                            <p>Dias Consecutivos</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-tasks"></i>
                            Tarefas Diárias
                        </h2>
                        <div class="tasks-list">
                            <div class="task-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px;">
                                <input type="checkbox" checked style="margin-right: 16px; transform: scale(1.2);">
                                <div class="task-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px; text-decoration: line-through; color: var(--text-light);">Comunicação com clientes (Segunda-feira)</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Enviar newsletter semanal e atualizações</p>
                                </div>
                                <span class="badge badge-success">Concluída</span>
                            </div>

                            <div class="task-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px;">
                                <input type="checkbox" checked style="margin-right: 16px; transform: scale(1.2);">
                                <div class="task-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px; text-decoration: line-through; color: var(--text-light);">Stories WhatsApp - Novidades</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Postar lançamentos das empresas representadas</p>
                                </div>
                                <span class="badge badge-success">Concluída</span>
                            </div>

                            <div class="task-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--primary); border-radius: 12px; background: rgba(102, 126, 234, 0.05);">
                                <input type="checkbox" style="margin-right: 16px; transform: scale(1.2);">
                                <div class="task-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Stories Instagram MR Representações</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Postar conteúdo diário no Instagram</p>
                                </div>
                                <span class="badge badge-warning">Pendente</span>
                            </div>

                            <div class="task-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px;">
                                <input type="checkbox" style="margin-right: 16px; transform: scale(1.2);">
                                <div class="task-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Mensagens para páginas seguidas</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Interagir com páginas parceiras</p>
                                </div>
                                <span class="badge badge-warning">Pendente</span>
                            </div>

                            <div class="task-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px;">
                                <input type="checkbox" style="margin-right: 16px; transform: scale(1.2);">
                                <div class="task-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Ligações para clientes pequenos</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Contato semanal com carteira de pequenos clientes</p>
                                </div>
                                <span class="badge badge-primary">Semanal</span>
                            </div>
                        </div>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-chart-pie"></i>
                            Progresso Semanal
                        </h2>
                        <div class="chart-container">
                            <canvas id="weeklyTasksChart"></canvas>
                        </div>
                        <div style="margin-top: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>Meta Semanal</span>
                                <span>28/35 tarefas</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 80%;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-clipboard-list"></i>
                            Processos e Procedimentos
                        </h2>
                        <div class="procedures-list">
                            <div class="procedure-item" style="padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px; cursor: pointer;" onclick="openProcedure('comunicacao-clientes')">
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <h4 style="font-weight: 600; margin-bottom: 4px;">📧 Comunicação com Clientes</h4>
                                        <p style="font-size: 14px; color: var(--text-light);">Processo para comunicação semanal</p>
                                    </div>
                                    <i class="fas fa-chevron-right" style="color: var(--text-light);"></i>
                                </div>
                            </div>

                            <div class="procedure-item" style="padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px; cursor: pointer;" onclick="openProcedure('stories-whatsapp')">
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <h4 style="font-weight: 600; margin-bottom: 4px;">📱 Stories WhatsApp</h4>
                                        <p style="font-size: 14px; color: var(--text-light);">Como criar e postar stories eficazes</p>
                                    </div>
                                    <i class="fas fa-chevron-right" style="color: var(--text-light);"></i>
                                </div>
                            </div>

                            <div class="procedure-item" style="padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px; cursor: pointer;" onclick="openProcedure('instagram-posts')">
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <h4 style="font-weight: 600; margin-bottom: 4px;">📸 Posts Instagram</h4>
                                        <p style="font-size: 14px; color: var(--text-light);">Diretrizes para posts no Instagram</p>
                                    </div>
                                    <i class="fas fa-chevron-right" style="color: var(--text-light);"></i>
                                </div>
                            </div>

                            <div class="procedure-item" style="padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px; cursor: pointer;" onclick="openProcedure('site-manutencao')">
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <h4 style="font-weight: 600; margin-bottom: 4px;">🌐 Manutenção do Site</h4>
                                        <p style="font-size: 14px; color: var(--text-light);">Checklist de manutenção semanal</p>
                                    </div>
                                    <i class="fas fa-chevron-right" style="color: var(--text-light);"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-lightbulb"></i>
                            Dicas e Informativos
                        </h2>
                        <div class="tips-list">
                            <div class="tip-item" style="padding: 16px; margin-bottom: 12px; background: #f0f9ff; border-radius: 12px; border-left: 4px solid var(--primary);">
                                <h4 style="font-weight: 600; margin-bottom: 8px; color: var(--primary);">💡 Dica do Dia</h4>
                                <p style="font-size: 14px;">Use hashtags relevantes nos stories do Instagram para aumentar o alcance. Máximo de 10 hashtags por story.</p>
                            </div>

                            <div class="tip-item" style="padding: 16px; margin-bottom: 12px; background: #f0fdf4; border-radius: 12px; border-left: 4px solid var(--success);">
                                <h4 style="font-weight: 600; margin-bottom: 8px; color: var(--success);">✅ Boas Práticas</h4>
                                <p style="font-size: 14px;">Sempre responda às mensagens dos clientes em até 2 horas durante o horário comercial.</p>
                            </div>

                            <div class="tip-item" style="padding: 16px; margin-bottom: 12px; background: #fffbeb; border-radius: 12px; border-left: 4px solid var(--warning);">
                                <h4 style="font-weight: 600; margin-bottom: 8px; color: var(--warning);">⚠️ Atenção</h4>
                                <p style="font-size: 14px;">Lembre-se de fazer backup do site antes de qualquer atualização ou manutenção.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card section-card">
                    <h2 class="section-title">
                        <i class="fas fa-calendar-alt"></i>
                        Agenda da Semana
                    </h2>
                    <div class="weekly-schedule" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px;">
                        <div class="day-column" style="text-align: center;">
                            <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">SEG</h4>
                            <div class="day-tasks">
                                <div style="background: var(--primary); color: white; padding: 8px; border-radius: 8px; font-size: 12px; margin-bottom: 8px;">
                                    Comunicação Clientes
                                </div>
                                <div style="background: var(--success); color: white; padding: 8px; border-radius: 8px; font-size: 12px;">
                                    Stories WhatsApp
                                </div>
                            </div>
                        </div>
                        <div class="day-column" style="text-align: center;">
                            <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">TER</h4>
                            <div class="day-tasks">
                                <div style="background: var(--warning); color: white; padding: 8px; border-radius: 8px; font-size: 12px; margin-bottom: 8px;">
                                    Stories Instagram
                                </div>
                                <div style="background: var(--secondary); color: white; padding: 8px; border-radius: 8px; font-size: 12px;">
                                    Ligações Clientes
                                </div>
                            </div>
                        </div>
                        <div class="day-column" style="text-align: center;">
                            <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">QUA</h4>
                            <div class="day-tasks">
                                <div style="background: var(--success); color: white; padding: 8px; border-radius: 8px; font-size: 12px; margin-bottom: 8px;">
                                    Stories WhatsApp
                                </div>
                                <div style="background: var(--primary); color: white; padding: 8px; border-radius: 8px; font-size: 12px;">
                                    Manutenção Site
                                </div>
                            </div>
                        </div>
                        <div class="day-column" style="text-align: center;">
                            <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">QUI</h4>
                            <div class="day-tasks">
                                <div style="background: var(--warning); color: white; padding: 8px; border-radius: 8px; font-size: 12px; margin-bottom: 8px;">
                                    Stories Instagram
                                </div>
                                <div style="background: var(--success); color: white; padding: 8px; border-radius: 8px; font-size: 12px;">
                                    Envio PDFs
                                </div>
                            </div>
                        </div>
                        <div class="day-column" style="text-align: center;">
                            <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">SEX</h4>
                            <div class="day-tasks">
                                <div style="background: var(--success); color: white; padding: 8px; border-radius: 8px; font-size: 12px; margin-bottom: 8px;">
                                    Stories WhatsApp
                                </div>
                                <div style="background: var(--secondary); color: white; padding: 8px; border-radius: 8px; font-size: 12px;">
                                    Relatório Semanal
                                </div>
                            </div>
                        </div>
                        <div class="day-column" style="text-align: center; opacity: 0.5;">
                            <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">SAB</h4>
                            <div class="day-tasks">
                                <div style="background: var(--border); color: var(--text-light); padding: 8px; border-radius: 8px; font-size: 12px;">
                                    Descanso
                                </div>
                            </div>
                        </div>
                        <div class="day-column" style="text-align: center; opacity: 0.5;">
                            <h4 style="font-weight: 600; margin-bottom: 12px; color: var(--text-light);">DOM</h4>
                            <div class="day-tasks">
                                <div style="background: var(--border); color: var(--text-light); padding: 8px; border-radius: 8px; font-size: 12px;">
                                    Descanso
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function getPerfilContent() {
            const isAdmin = ['SUPER_ADMIN', 'ADMIN_OPERACIONAL', 'ADMIN_CONTEUDO', 'ADMIN_GAMIFICACAO'].includes(userRole);
            return `
                <div class="module-header">
                    <div>
                        <h1 class="module-title">Meu Perfil</h1>
                        <p class="module-subtitle">Gerencie suas informações pessoais e configurações</p>
                    </div>
                    ${isAdmin ? `
                    <button class="btn btn-primary">
                        <i class="fas fa-edit"></i>
                        Editar Perfil
                    </button>` : ''}
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-user"></i>
                            Informações Pessoais
                        </h2>
                        <div class="profile-info">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Nome Completo</label>
                                    <input type="text" class="input" value="João Silva" readonly>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="input" value="joao@embalagenconceito.com" readonly>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Cargo</label>
                                    <input type="text" class="input" value="SDR" readonly>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Departamento</label>
                                    <input type="text" class="input" value="Vendas" readonly>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Data de Admissão</label>
                                    <input type="text" class="input" value="15/03/2024" readonly>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Telefone</label>
                                    <input type="text" class="input" value="(11) 99999-9999" readonly>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-chart-line"></i>
                            Estatísticas Pessoais
                        </h2>
                        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                            <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 12px;">
                                <div style="font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 4px;">1,890</div>
                                <div style="font-size: 14px; color: var(--text-light);">Pontos Totais</div>
                            </div>
                            <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 12px;">
                                <div style="font-size: 24px; font-weight: 700; color: var(--success); margin-bottom: 4px;">8</div>
                                <div style="font-size: 14px; color: var(--text-light);">Módulos Concluídos</div>
                            </div>
                            <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 12px;">
                                <div style="font-size: 24px; font-weight: 700; color: var(--warning); margin-bottom: 4px;">#3</div>
                                <div style="font-size: 14px; color: var(--text-light);">Posição Ranking</div>
                            </div>
                            <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 12px;">
                                <div style="font-size: 24px; font-weight: 700; color: var(--secondary); margin-bottom: 4px;">12</div>
                                <div style="font-size: 14px; color: var(--text-light);">Badges Conquistados</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-trophy"></i>
                            Minhas Conquistas
                        </h2>
                        <div class="achievements-list">
                            <div class="achievement-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px;">
                                <div class="achievement-icon" style="width: 50px; height: 50px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-right: 16px;">
                                    <i class="fas fa-graduation-cap"></i>
                                </div>
                                <div class="achievement-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Estudioso</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Concluiu 5 módulos de treinamento</p>
                                </div>
                                <div class="achievement-date" style="text-align: right;">
                                    <div style="font-size: 12px; color: var(--text-light);">Conquistado em</div>
                                    <div style="font-weight: 600;">15/11/2024</div>
                                </div>
                            </div>

                            <div class="achievement-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px;">
                                <div class="achievement-icon" style="width: 50px; height: 50px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-right: 16px;">
                                    <i class="fas fa-phone"></i>
                                </div>
                                <div class="achievement-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Comunicador</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Realizou 100 ligações</p>
                                </div>
                                <div class="achievement-date" style="text-align: right;">
                                    <div style="font-size: 12px; color: var(--text-light);">Conquistado em</div>
                                    <div style="font-weight: 600;">08/11/2024</div>
                                </div>
                            </div>

                            <div class="achievement-item" style="display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px;">
                                <div class="achievement-icon" style="width: 50px; height: 50px; background: var(--warning); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-right: 16px;">
                                    <i class="fas fa-target"></i>
                                </div>
                                <div class="achievement-content" style="flex: 1;">
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Certeiro</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Bateu a meta 3 vezes seguidas</p>
                                </div>
                                <div class="achievement-date" style="text-align: right;">
                                    <div style="font-size: 12px; color: var(--text-light);">Conquistado em</div>
                                    <div style="font-weight: 600;">01/11/2024</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-cog"></i>
                            Configurações
                        </h2>
                        <div class="settings-list">
                            <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--border);">
                                <div>
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Notificações por Email</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Receber atualizações por email</p>
                                </div>
                                <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                                    <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
                                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--primary); transition: .4s; border-radius: 24px; &:before { position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }"></span>
                                </label>
                            </div>

                            <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--border);">
                                <div>
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Notificações Push</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Notificações no navegador</p>
                                </div>
                                <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                                    <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
                                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--primary); transition: .4s; border-radius: 24px;"></span>
                                </label>
                            </div>

                            <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--border);">
                                <div>
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Modo Escuro</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Tema escuro da interface</p>
                                </div>
                                <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                                    <input type="checkbox" style="opacity: 0; width: 0; height: 0;">
                                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                                </label>
                            </div>

                            <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0;">
                                <div>
                                    <h4 style="font-weight: 600; margin-bottom: 4px;">Relatórios Semanais</h4>
                                    <p style="font-size: 14px; color: var(--text-light);">Receber resumo semanal</p>
                                </div>
                                <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                                    <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
                                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--primary); transition: .4s; border-radius: 24px;"></span>
                                </label>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button class="btn btn-primary">Salvar Configurações</button>
                            <button class="btn btn-secondary">Alterar Senha</button>
                        </div>
                    </div>
                </div>

                <div class="card section-card">
                    <h2 class="section-title">
                        <i class="fas fa-chart-area"></i>
                        Progresso ao Longo do Tempo
                    </h2>
                    <div class="chart-container">
                        <canvas id="progressChart"></canvas>
                    </div>
                </div>
            `;
        }

        function getAdminContent() {
            if (!['SUPER_ADMIN', 'ADMIN_OPERACIONAL', 'ADMIN_CONTEUDO', 'ADMIN_GAMIFICACAO'].includes(userRole)) {
                return `
                    <div class="card section-card text-center" style="padding: 64px;">
                        <i class="fas fa-lock" style="font-size: 64px; color: var(--text-light); margin-bottom: 24px;"></i>
                        <h2 style="margin-bottom: 16px;">Acesso Negado</h2>
                        <p style="color: var(--text-light);">Você não tem permissão para acessar esta área.</p>
                    </div>
                `;
            }

            return `
                <div class="module-header">
                    <div>
                        <h1 class="module-title">Painel Administrativo</h1>
                        <p class="module-subtitle">Controle total sobre a plataforma</p>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" onclick="openModal('addUserModal')">
                            <i class="fas fa-user-plus"></i>
                            Novo Usuário
                        </button>
                        <button class="btn btn-secondary" onclick="openModal('addCampaignModal')">
                            <i class="fas fa-bullhorn"></i>
                            Nova Campanha
                        </button>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--primary);">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <h3>47</h3>
                            <p>Usuários Ativos</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--success);">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                        <div class="stat-content">
                            <h3>16</h3>
                            <p>Módulos Criados</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--warning);">
                            <i class="fas fa-bullhorn"></i>
                        </div>
                        <div class="stat-content">
                            <h3>8</h3>
                            <p>Campanhas Ativas</p>
                        </div>
                    </div>
                    
                    <div class="card stat-card">
                        <div class="stat-icon" style="background: var(--secondary);">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <h3>92%</h3>
                            <p>Engajamento</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-users-cog"></i>
                            Gestão de Usuários
                        </h2>
                        <div class="admin-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <button class="btn btn-primary" onclick="loadAdminSection('users')">
                                <i class="fas fa-users"></i>
                                Gerenciar Usuários
                            </button>
                            <button class="btn btn-secondary" onclick="loadAdminSection('roles')">
                                <i class="fas fa-user-tag"></i>
                                Permissões
                            </button>
                            <button class="btn btn-secondary" onclick="loadAdminSection('teams')">
                                <i class="fas fa-users"></i>
                                Equipes
                            </button>
                        </div>
                        
                        <div class="recent-users">
                            <h4 style="margin-bottom: 16px;">Usuários Recentes</h4>
                            <div class="user-list">
                                <div class="user-item" style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; border: 1px solid var(--border); border-radius: 8px;">
                                    <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin-right: 12px;">JS</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600;">João Silva</div>
                                        <div style="font-size: 12px; color: var(--text-light);">SDR - Cadastrado hoje</div>
                                    </div>
                                    <span class="badge badge-success">Ativo</span>
                                </div>
                                <div class="user-item" style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; border: 1px solid var(--border); border-radius: 8px;">
                                    <div style="width: 40px; height: 40px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin-right: 12px;">MS</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600;">Maria Santos</div>
                                        <div style="font-size: 12px; color: var(--text-light);">Vendedora - Cadastrada ontem</div>
                                    </div>
                                    <span class="badge badge-success">Ativo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-book"></i>
                            Gestão de Conteúdo
                        </h2>
                        <div class="admin-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <button class="btn btn-primary" onclick="loadAdminSection('modules')">
                                <i class="fas fa-graduation-cap"></i>
                                Módulos
                            </button>
                            <button class="btn btn-secondary" onclick="loadAdminSection('content')">
                                <i class="fas fa-file-alt"></i>
                                Conteúdo
                            </button>
                            <button class="btn btn-secondary" onclick="loadAdminSection('library')">
                                <i class="fas fa-book"></i>
                                Biblioteca
                            </button>
                        </div>
                        
                        <div class="content-stats">
                            <h4 style="margin-bottom: 16px;">Estatísticas de Conteúdo</h4>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                                <div style="padding: 16px; background: #f0f9ff; border-radius: 8px;">
                                    <div style="font-size: 16px; font-weight: 600; color: var(--primary); margin-bottom: 4px;">16</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Módulos</div>
                                </div>
                                <div style="padding: 16px; background: #f0fdf4; border-radius: 8px;">
                                    <div style="font-size: 16px; font-weight: 600; color: var(--success); margin-bottom: 4px;">45</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Artigos</div>
                                </div>
                                <div style="padding: 16px; background: #f0fdf4; border-radius: 8px;">
                                    <div style="font-size: 16px; font-weight: 600; color: var(--warning); margin-bottom: 4px;">23</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Vídeos</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-gamepad"></i>
                            Gestão de Gamificação
                        </h2>
                        <div class="admin-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <button class="btn btn-primary" onclick="loadAdminSection('badges')">
                                <i class="fas fa-medal"></i>
                                Badges
                            </button>
                            <button class="btn btn-secondary" onclick="loadAdminSection('challenges')">
                                <i class="fas fa-trophy"></i>
                                Desafios
                            </button>
                            <button class="btn btn-secondary" onclick="loadAdminSection('rewards')">
                                <i class="fas fa-gift"></i>
                                Recompensas
                            </button>
                        </div>
                        
                        <div class="gamification-stats">
                            <h4 style="margin-bottom: 16px;">Estatísticas de Gamificação</h4>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                                <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                                    <div style="font-size: 20px; font-weight: 700; color: var(--primary);">12</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Badges Ativas</div>
                                </div>
                                <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                                    <div style="font-size: 20px; font-weight: 700; color: var(--success);">8</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Desafios Ativos</div>
                                </div>
                                <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                                    <div style="font-size: 20px; font-weight: 700; color: var(--warning);">15</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Recompensas</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card section-card">
                        <h2 class="section-title">
                            <i class="fas fa-chart-bar"></i>
                            Analytics e Relatórios
                        </h2>
                        <div class="admin-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <button class="btn btn-primary" onclick="loadAdminSection('analytics')">
                                <i class="fas fa-chart-line"></i>
                                Analytics
                            </button>
                            <button class="btn btn-secondary" onclick="loadAdminSection('reports')">
                                <i class="fas fa-file-alt"></i>
                                Relatórios
                            </button>
                            <button class="btn btn-secondary" onclick="loadAdminSection('exports')">
                                <i class="fas fa-download"></i>
                                Exportar Dados
                            </button>
                        </div>
                        
                        <div class="analytics-preview">
                            <h4 style="margin-bottom: 16px;">Resumo Semanal</h4>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                                <div style="padding: 16px; background: #f0f9ff; border-radius: 8px;">
                                    <div style="font-size: 16px; font-weight: 600; color: var(--primary); margin-bottom: 4px;">+15%</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Engajamento</div>
                                </div>
                                <div style="padding: 16px; background: #f0fdf4; border-radius: 8px;">
                                    <div style="font-size: 16px; font-weight: 600; color: var(--success); margin-bottom: 4px;">+8</div>
                                    <div style="font-size: 12px; color: var(--text-light);">Novos Usuários</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card section-card">
                    <h2 class="section-title">
                        <i class="fas fa-cogs"></i>
                        Configurações do Sistema
                    </h2>
                    <div class="system-settings" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                        <div class="setting-card card" style="padding: 20px; text-align: center; cursor: pointer;" onclick="loadAdminSection('general-settings')">
                            <i class="fas fa-cog" style="font-size: 32px; color: var(--primary); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Configurações Gerais</h4>
                            <p style="font-size: 14px; color: var(--text-light);">Configurações básicas da plataforma</p>
                        </div>
                        <div class="setting-card card" style="padding: 20px; text-align: center; cursor: pointer;" onclick="loadAdminSection('email-settings')">
                            <i class="fas fa-envelope" style="font-size: 32px; color: var(--success); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Configurações de Email</h4>
                            <p style="font-size: 14px; color: var(--text-light);">SMTP e templates de email</p>
                        </div>
                        <div class="setting-card card" style="padding: 20px; text-align: center; cursor: pointer;" onclick="loadAdminSection('security-settings')">
                            <i class="fas fa-shield-alt" style="font-size: 32px; color: var(--warning); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Segurança</h4>
                            <p style="font-size: 14px; color: var(--text-light);">Configurações de segurança</p>
                        </div>
                        <div class="setting-card card" style="padding: 20px; text-align: center; cursor: pointer;" onclick="loadAdminSection('backup-settings')">
                            <i class="fas fa-database" style="font-size: 32px; color: var(--secondary); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Backup</h4>
                            <p style="font-size: 14px; color: var(--text-light);">Backup e restauração</p>
                        </div>
                    </div>
                </div>
            `;
        }

        function executePageScripts(page) {
            switch (page) {
                case 'dashboard':
                    initDashboardCharts();
                    break;
                case 'academia':
                    initAcademiaScripts();
                    break;
                case 'gamificacao':
                    initGamificacaoScripts();
                    break;
                case 'crm':
                    initCrmCharts();
                    break;
                case 'mr-representacoes':
                    initMrRepresentacoesCharts();
                    break;
                case 'perfil':
                    initPerfilCharts();
                    break;
                case 'admin':
                    initAdminScripts();
                    break;
            }
        }

        function initDashboardCharts() {
            // Gráfico de progresso semanal
            const ctx = document.getElementById('weeklyProgressChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
                        datasets: [{
                            label: 'Pontos Ganhos',
                            data: [120, 190, 300, 500, 200, 300, 450],
                            borderColor: 'rgb(102, 126, 234)',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        }

        function initAcademiaScripts() {
            // Scripts específicos da academia
            showNotification('Academia pronta', 'info');
            loadTrainingModules();
        }

        function initGamificacaoScripts() {
            // Scripts específicos da gamificação
            showNotification('Gamificação pronta', 'info');
        }

        function initCrmCharts() {
            // Gráfico de vendas
            const ctx = document.getElementById('salesChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                        datasets: [{
                            label: 'Vendas (R$)',
                            data: [12000, 19000, 15000, 25000, 22000, 30000],
                            backgroundColor: 'rgba(102, 126, 234, 0.8)',
                            borderColor: 'rgb(102, 126, 234)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }

            loadProspects();
        }

        function initMrRepresentacoesCharts() {
            // Gráfico de tarefas semanais
            const ctx = document.getElementById('weeklyTasksChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Concluídas', 'Pendentes', 'Em Progresso'],
                        datasets: [{
                            data: [28, 5, 2],
                            backgroundColor: [
                                'rgb(16, 185, 129)',
                                'rgb(245, 158, 11)',
                                'rgb(102, 126, 234)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }
        }

        function initPerfilCharts() {
            // Gráfico de progresso ao longo do tempo
            const ctx = document.getElementById('progressChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                        datasets: [{
                            label: 'Pontos Acumulados',
                            data: [100, 250, 400, 650, 800, 1100, 1350, 1500, 1650, 1750, 1850, 1890],
                            borderColor: 'rgb(102, 126, 234)',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        }

        function initAdminScripts() {
            // Scripts específicos do admin
            showNotification('Admin pronto', 'info');
        }

        // Funções auxiliares para módulos específicos
       function openModule(moduleId) {
            // Abrir modal do módulo
            showNotification('Abrindo módulo: ' + moduleId, 'info');
            // Implementar lógica de abertura do módulo
        }

        function openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
            }
        }

        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        function loadProspects() {
            const tbody = document.getElementById('prospectRows');
            if (!tbody) return;
            db.collection('prospects').orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    tbody.innerHTML = '';
                    snapshot.forEach(doc => {
                        const p = doc.data();
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${p.name}</td>
                            <td>${p.company || ''}</td>
                            <td><span class="badge badge-primary">${p.status || 'Novo'}</span></td>
                            <td>${p.value ? formatCurrency(p.value) : '-'}</td>
                            <td>${p.lastContact ? formatDate(p.lastContact.toDate()) : '-'}</td>
                            <td><button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;"><i class="fas fa-edit"></i></button></td>`;
                        tbody.appendChild(tr);
                    });
                }, err => {
                    console.error('Erro ao carregar prospects:', err);
                    showNotification('Erro ao carregar prospects', 'error');
                });
        }

        function loadTrainingModules() {
            const container = document.getElementById('trainingModules');
            if (!container) return;
            db.collection('trainingModules').orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    container.innerHTML = '';
                    snapshot.forEach(doc => {
                        const m = doc.data();
                        const div = document.createElement('div');
                        div.className = 'module-item';
                        div.style.cssText = 'display:flex;align-items:center;padding:16px;margin-bottom:12px;border:1px solid var(--border);border-radius:12px;';
                        div.innerHTML = `
                            <div class="module-icon" style="width:50px;height:50px;background:var(--primary);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;margin-right:16px;">
                                <i class="fas fa-play"></i>
                            </div>
                            <div class="module-content" style="flex:1;">
                                <h4 style="font-weight:600;margin-bottom:4px;">${m.title}</h4>
                                <p style="font-size:14px;color:var(--text-light);margin-bottom:8px;">${m.description}</p>
                            </div>`;
                        container.appendChild(div);
                    });
                }, err => {
                    console.error('Erro ao carregar módulos:', err);
                    showNotification('Erro ao carregar módulos', 'error');
                });
        }

        function loadUserFeedbacks() {
            const container = document.getElementById('myFeedbacks');
            if (!container || !currentUser) return;
            db.collection('feedback')
                .where('userId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    container.innerHTML = '';
                    snapshot.forEach(doc => {
                        const d = doc.data();
                        const div = document.createElement('div');
                        div.className = 'feedback-item';
                        div.textContent = d.text;
                        container.appendChild(div);
                    });
                });
        }

        function openProcedure(procedureId) {
            // Abrir procedimento específico
            showNotification('Abrindo procedimento: ' + procedureId, 'info');
            // Implementar lógica de abertura do procedimento
        }

        function loadAdminSection(section) {
            // Carregar seção específica do admin
            showNotification('Carregando seção: ' + section, 'info');
            // Implementar lógica de carregamento da seção
        }

        // Inicialização da aplicação
        document.addEventListener('DOMContentLoaded', () => {
            showNotification('Aplicação iniciada', 'success');

            // Verificar se há usuário logado
            auth.onAuthStateChanged((user) => {
                if (user) {
                    showNotification('Usuário logado: ' + user.email, 'success');
                } else {
                    showNotification('Usuário não logado', 'info');
                }
            });

            const prospectForm = document.getElementById('addProspectForm');
            if (prospectForm) {
                prospectForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await db.collection('prospects').add({
                        name: document.getElementById('prospectName').value,
                        company: document.getElementById('prospectCompany').value,
                        email: document.getElementById('prospectEmail').value,
                        status: 'Novo',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    prospectForm.reset();
                    closeModal('addProspectModal');
                });
            }

            const moduleForm = document.getElementById('addModuleForm');
            if (moduleForm) {
                moduleForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await db.collection('trainingModules').add({
                        title: document.getElementById('moduleTitle').value,
                        description: document.getElementById('moduleDescription').value,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    moduleForm.reset();
                    closeModal('addModuleModal');
                });
            }

            const feedbackForm = document.getElementById('feedbackForm');
            if (feedbackForm) {
                feedbackForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await db.collection('feedback').add({
                        userId: currentUser.uid,
                        text: document.getElementById('feedbackText').value,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    feedbackForm.reset();
                    loadUserFeedbacks();
                    showNotification('Feedback enviado', 'success');
                });
                loadUserFeedbacks();
            }
        });

        // Captura o botão pelo ID
        const btnNewUser = document.getElementById('btnNewUser');
        const newUserModal = document.getElementById('newUserModal');

        if (!newUserModal) {
          console.error('Modal Novo Usuário não encontrado no DOM!');
        }

        if (!btnNewUser) {
          console.error('Botão Novo Usuário não encontrado no DOM!');
        } else {
          btnNewUser.addEventListener('click', () => {
            console.log('Clique em Novo Usuário detectado');
            newUserModal.classList.remove('hidden');
          });
        }

        // Funções de utilidade
        function formatCurrency(value) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        }

        function formatDate(date) {
            return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
        }

        function showNotification(message, type = 'info') {
            let container = document.getElementById('notification-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'notification-container';
                document.body.appendChild(container);
            }

            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            container.appendChild(notification);

            setTimeout(() => {
                notification.classList.add('hide');
                notification.addEventListener('transitionend', () => notification.remove());
            }, 4000);

            if ('Notification' in window && Notification.permission === 'granted') {
                navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg) {
                        reg.showNotification('Plataforma Embalagens Conceito', {
                            body: message,
                            icon: '/icon-192x192.png'
                        });
                    }
                });
            }
        }

        // Funções de gamificação
        async function awardPoints(userId, points, reason) {
            try {
                await fsUpdate('users', userId, {
                    'stats.totalPoints': firebase.firestore.FieldValue.increment(points),
                    'stats.lastActivity': firebase.firestore.FieldValue.serverTimestamp()
                });

                // Registrar atividade
                await fsAdd('activities', {
                    userId: userId,
                    type: 'points_awarded',
                    points: points,
                    reason: reason,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showNotification(`+${points} pontos ganhos! ${reason}`, 'success');
            } catch (error) {
                console.error('Erro ao conceder pontos:', error);
            }
        }

        async function checkBadges(userId) {
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.data();
                
                // Verificar badges baseadas em pontos
                const totalPoints = userData.stats?.totalPoints || 0;
                const badges = userData.stats?.badges || [];
                
                const badgeRules = [
                    { id: 'first_steps', name: 'Primeiros Passos', points: 100, icon: 'fas fa-baby' },
                    { id: 'getting_started', name: 'Começando Bem', points: 500, icon: 'fas fa-rocket' },
                    { id: 'on_fire', name: 'Pegando Fogo', points: 1000, icon: 'fas fa-fire' },
                    { id: 'expert', name: 'Especialista', points: 2000, icon: 'fas fa-star' },
                    { id: 'master', name: 'Mestre', points: 5000, icon: 'fas fa-crown' }
                ];
                
                for (const rule of badgeRules) {
                    if (totalPoints >= rule.points && !badges.includes(rule.id)) {
                        // Conceder badge
                        await db.collection('users').doc(userId).update({
                            'stats.badges': firebase.firestore.FieldValue.arrayUnion(rule.id)
                        });
                        
                        showNotification(`Badge "${rule.name}" conquistado!`, 'success');
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar badges:', error);
            }
        }

        // Funções de CRM
        async function addProspect(prospectData) {
            try {
                await fsAdd('prospects', {
                    ...prospectData,
                    createdBy: currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'new'
                });
                
                showNotification('Prospect adicionado com sucesso!', 'success');
                await awardPoints(currentUser.uid, 10, 'Novo prospect adicionado');
            } catch (error) {
                console.error('Erro ao adicionar prospect:', error);
                showNotification('Erro ao adicionar prospect', 'error');
            }
        }

        async function updateProspectStatus(prospectId, newStatus) {
            try {
                await fsUpdate('prospects', prospectId, {
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Conceder pontos baseado no status
                const pointsMap = {
                    'contacted': 20,
                    'qualified': 50,
                    'proposal': 75,
                    'won': 100,
                    'lost': 5
                };
                
                if (pointsMap[newStatus]) {
                    await awardPoints(currentUser.uid, pointsMap[newStatus], `Prospect ${newStatus}`);
                }
                
                showNotification('Status do prospect atualizado!', 'success');
            } catch (error) {
                console.error('Erro ao atualizar prospect:', error);
                showNotification('Erro ao atualizar prospect', 'error');
            }
        }

        // Funções de MR Representações
        async function completeTask(taskId) {
            try {
                await fsUpdate('tasks', taskId, {
                    completed: true,
                    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    completedBy: currentUser.uid
                });
                
                await awardPoints(currentUser.uid, 25, 'Tarefa concluída');
                showNotification('Tarefa concluída!', 'success');
                
                // Recarregar página para atualizar UI
                loadPage('mr-representacoes');
            } catch (error) {
                console.error('Erro ao completar tarefa:', error);
                showNotification('Erro ao completar tarefa', 'error');
            }
        }

        async function addTask(taskData) {
            try {
                await fsAdd('tasks', {
                    ...taskData,
                    createdBy: currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    completed: false
                });
                
                showNotification('Tarefa adicionada com sucesso!', 'success');
            } catch (error) {
                console.error('Erro ao adicionar tarefa:', error);
                showNotification('Erro ao adicionar tarefa', 'error');
            }
        }

        // Funções de Academia
        async function startModule(moduleId) {
            try {
                await fsSet('user_modules', `${currentUser.uid}_${moduleId}`, {
                    userId: currentUser.uid,
                    moduleId: moduleId,
                    startedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    progress: 0,
                    completed: false
                });
                
                showNotification('Módulo iniciado!', 'success');
            } catch (error) {
                console.error('Erro ao iniciar módulo:', error);
                showNotification('Erro ao iniciar módulo', 'error');
            }
        }

        async function completeModule(moduleId) {
            try {
                await fsUpdate('user_modules', `${currentUser.uid}_${moduleId}`, {
                    completed: true,
                    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    progress: 100
                });
                
                await awardPoints(currentUser.uid, 100, 'Módulo concluído');
                await checkBadges(currentUser.uid);
                
                showNotification('Módulo concluído! Parabéns!', 'success');
            } catch (error) {
                console.error('Erro ao completar módulo:', error);
                showNotification('Erro ao completar módulo', 'error');
            }
        }

        // Sistema de notificações em tempo real
        function initRealtimeNotifications() {
            if (!currentUser) return;
            
            db.collection('notifications')
                .where('userId', '==', currentUser.uid)
                .where('read', '==', false)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const notification = change.doc.data();
                            showNotification(notification.message, notification.type);
                        }
                    });
                }, err => {
                    console.error('Erro em notificações em tempo real:', err);
                });
        }

        // Inicializar notificações em tempo real quando o usuário fizer login
        auth.onAuthStateChanged((user) => {
            if (user) {
                setTimeout(() => {
                    initRealtimeNotifications();
                }, 1000);
            }
        });

        // ----- Fila offline utilizando IndexedDB -----
        let queueDbPromise;

        function getQueueDb() {
            if (queueDbPromise) return queueDbPromise;
            queueDbPromise = new Promise((resolve, reject) => {
                const req = indexedDB.open('offline-queue', 1);
                req.onupgradeneeded = () => {
                    req.result.createObjectStore('operations', { keyPath: 'id', autoIncrement: true });
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            return queueDbPromise;
        }

        async function queueOperation(op) {
            const dbInst = await getQueueDb();
            return new Promise((resolve, reject) => {
                const tx = dbInst.transaction('operations', 'readwrite');
                tx.objectStore('operations').add(op);
                tx.oncomplete = resolve;
                tx.onerror = tx.onabort = reject;
            });
        }

        async function getQueuedOperations() {
            const dbInst = await getQueueDb();
            return new Promise((resolve, reject) => {
                const tx = dbInst.transaction('operations', 'readonly');
                const req = tx.objectStore('operations').getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        async function clearQueuedOperations() {
            const dbInst = await getQueueDb();
            return new Promise((resolve, reject) => {
                const tx = dbInst.transaction('operations', 'readwrite');
                tx.objectStore('operations').clear();
                tx.oncomplete = resolve;
                tx.onerror = tx.onabort = reject;
            });
        }

        function registerBackgroundSync() {
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.sync.register('background-sync').catch(err => console.error('Erro ao registrar sync', err));
                });
            }
        }

        async function processOfflineQueue() {
            if (!navigator.onLine) return;
            try {
                const ops = await getQueuedOperations();
                for (const op of ops) {
                    try {
                        if (op.method === 'add') {
                            await db.collection(op.collection).add(op.data);
                        } else if (op.method === 'update') {
                            await db.collection(op.collection).doc(op.docId).update(op.data);
                        } else if (op.method === 'set') {
                            await db.collection(op.collection).doc(op.docId).set(op.data);
                        }
                    } catch (err) {
                        console.error('Erro ao reenviar operação offline', err);
                    }
                }
                await clearQueuedOperations();
                if (ops.length) showNotification('Dados offline sincronizados', 'success');
            } catch (err) {
                console.error('Erro ao processar fila offline', err);
            }
        }

        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'process-queue') {
                processOfflineQueue();
            }
        });

        async function fsAdd(collection, data) {
            if (!navigator.onLine) {
                await queueOperation({ method: 'add', collection, data });
                registerBackgroundSync();
                showNotification('Alteração salva offline', 'info');
                return Promise.resolve();
            }
            return db.collection(collection).add(data);
        }

        async function fsUpdate(collection, docId, data) {
            if (!navigator.onLine) {
                await queueOperation({ method: 'update', collection, docId, data });
                registerBackgroundSync();
                showNotification('Alteração salva offline', 'info');
                return Promise.resolve();
            }
            return db.collection(collection).doc(docId).update(data);
        }

        async function fsSet(collection, docId, data) {
            if (!navigator.onLine) {
                await queueOperation({ method: 'set', collection, docId, data });
                registerBackgroundSync();
                showNotification('Alteração salva offline', 'info');
                return Promise.resolve();
            }
            return db.collection(collection).doc(docId).set(data);
        }

        // Função para salvar dados localmente quando offline
        function saveOfflineData(key, data) {
            localStorage.setItem(`offline_${key}`, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
        }

        function getOfflineData(key) {
            const stored = localStorage.getItem(`offline_${key}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Dados válidos por 24 horas
                if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                    return parsed.data;
                }
            }
            return null;
        }

        // Sincronizar dados quando voltar online
        function syncOfflineData() {
            // Implementar sincronização de dados offline
            showNotification('Sincronizando dados offline...', 'info');
        }

        // Configurações de tema
        function toggleTheme() {
            const body = document.body;
            const isDark = body.classList.contains('dark-theme');
            
            if (isDark) {
                body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            } else {
                body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            }
        }

        // Carregar tema salvo
        function loadSavedTheme() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-theme');
            }
        }

        // Carregar tema na inicialização
        document.addEventListener('DOMContentLoaded', loadSavedTheme);

        // Função para busca global
        function globalSearch(query) {
            // Implementar busca global na plataforma
            showNotification('Buscando por: ' + query, 'info');
        }

        // Event listeners para busca
        document.addEventListener('DOMContentLoaded', () => {
            const searchInput = document.querySelector('.search-box input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value;
                    if (query.length > 2) {
                        globalSearch(query);
                    }
                });
            }
        });

        // Função para feedback do usuário
        function submitFeedback(feedback) {
            fsAdd('feedback', {
                userId: currentUser.uid,
                message: feedback.message,
                rating: feedback.rating,
                page: currentPage,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                showNotification('Obrigado pelo seu feedback!', 'success');
            }).catch((error) => {
                console.error('Erro ao enviar feedback:', error);
                showNotification('Erro ao enviar feedback', 'error');
            });
        }

        // Configurações de acessibilidade
        function initAccessibility() {
            // Implementar funcionalidades de acessibilidade
            document.addEventListener('keydown', (e) => {
                // Navegação por teclado
                if (e.altKey && e.key === 'm') {
                    // Focar no menu principal
                    document.querySelector('.nav-menu').focus();
                }
                if (e.altKey && e.key === 's') {
                    // Focar na busca
                    document.querySelector('.search-box input').focus();
                }
            });
        }

        // Inicializar acessibilidade
        document.addEventListener('DOMContentLoaded', initAccessibility);

        // Função para analytics
        function trackEvent(eventName, properties = {}) {
            // Implementar tracking de eventos
            showNotification('Evento: ' + eventName, 'info');
            
            // Salvar no Firebase Analytics (se configurado)
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, properties);
            }
        }

        // Configurações de performance
        function optimizePerformance() {
            // Lazy loading de imagens
            const images = document.querySelectorAll('img[data-src]');
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        }

        // Inicializar otimizações de performance
        document.addEventListener('DOMContentLoaded', optimizePerformance);

        showNotification('Plataforma Embalagens Conceito - Versão 1.0.0', 'info');
        showNotification('Desenvolvida com ❤️ para a equipe de vendas', 'info');

