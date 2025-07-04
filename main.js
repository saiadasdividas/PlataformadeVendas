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
    USER_SDR: ['dashboard','academia','crm','perfil','gamificacao'],
    USER_VENDEDOR: ['dashboard','crm','perfil','gamificacao'],
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
    if (!menu) {
        console.error('Elemento navMenu não encontrado no DOM');
        return;
    }

    // Limpa itens existentes para evitar duplicações quando a função é chamada
    // múltiplas vezes (ex.: após novo login ou atualização de permissões)
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

        await loadUserData();    // carrega dados do Firestore
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
            console.log('Dados do usuário carregados:', userData);
                filterMenuByRole(userData.role);
            
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

// Função loadPage (adicione se não existir)
function loadPage(page) {
    console.log('Carregando página:', page);
    
    // Atualizar título da página
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
    }
    
    // Aqui você pode adicionar a lógica específica para carregar cada página
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'academia':
            loadAcademia();
            break;
        case 'gamificacao':
            loadGamificacao();
            break;
        case 'crm':
            loadCRM();
            break;
        case 'mr-representacoes':
            loadMRRepresentacoes();
            break;
        case 'perfil':
            loadPerfil();
            break;
        case 'admin':
            loadAdmin();
            break;
        default:
            loadDashboard();
    }
}

// Placeholder functions para as páginas (substitua pela sua lógica real)
function loadDashboard() {
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
        contentArea.innerHTML = `
        <section id="dashboard-cards" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="glass-card">
            <div class="flex items-center mb-4">
              <i class="fas fa-users text-2xl mr-3 text-purple-500"></i>
              <span class="text-xl font-semibold">47</span>
            </div>
            <p class="text-gray-600">Usuários Ativos</p>
          </div>
          <div class="glass-card">
            <div class="flex items-center mb-4">
              <i class="fas fa-layer-group text-2xl mr-3 text-purple-500"></i>
              <span class="text-xl font-semibold">12</span>
            </div>
            <p class="text-gray-600">Módulos Criados</p>
          </div>
          <div class="glass-card">
            <div class="flex items-center mb-4">
              <i class="fas fa-bullhorn text-2xl mr-3 text-purple-500"></i>
              <span class="text-xl font-semibold">5</span>
            </div>
            <p class="text-gray-600">Campanhas Ativas</p>
          </div>
        </section>
        <div class="tabs flex space-x-4 mb-4 mt-8">
          <button data-tab="users" class="btn-tab active">Gerenciar Usuários</button>
          <button data-tab="perms" class="btn-tab">Permissões</button>
          <button data-tab="teams" class="btn-tab">Equipes</button>
        </div>
        <div id="tab-users" class="tab-content">
          <!-- tabela + botão modal de Novo Usuário -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Usuários</h3>
            <button class="btn-primary px-4 py-2">Novo Usuário</button>
          </div>
          <table class="min-w-full text-left">
            <thead>
              <tr>
                <th class="py-2 px-4">Nome</th>
                <th class="py-2 px-4">Status</th>
                <th class="py-2 px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="py-2 px-4">João Silva</td>
                <td class="py-2 px-4">Ativo</td>
                <td class="py-2 px-4"><button class="btn-outline px-2 py-1">Editar</button></td>
              </tr>
              <tr>
                <td class="py-2 px-4">Maria Souza</td>
                <td class="py-2 px-4">Inativo</td>
                <td class="py-2 px-4"><button class="btn-outline px-2 py-1">Editar</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div id="tab-perms" class="tab-content hidden">
          <div class="glass-card">Conteúdo de permissões</div>
        </div>
        <div id="tab-teams" class="tab-content hidden">
          <div class="glass-card">Conteúdo de equipes</div>
        </div>
        `;
        // Ativa o JS das tabs
        setupTabs();
    }
}

function setupTabs() {
    document.querySelectorAll('.btn-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
        });
    });
}

function loadAcademia() {
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
        contentArea.innerHTML = '<h2>Academia</h2><p>Área de treinamento e aprendizado.</p>';
    }
}

function loadGamificacao() {
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
        contentArea.innerHTML = '<h2>Gamificação</h2><p>Sistema de pontuação e recompensas.</p>';
    }
}

function loadCRM() {
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
        contentArea.innerHTML = '<h2>CRM & Vendas</h2><p>Gerenciamento de relacionamento com clientes.</p>';
    }
}

function loadMRRepresentacoes() {
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
        contentArea.innerHTML = '<h2>MR Representações</h2><p>Área específica para representantes.</p>';
    }
}

function loadPerfil() {
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
        contentArea.innerHTML = '<h2>Perfil</h2><p>Informações do seu perfil.</p>';
    }
}

function loadAdmin() {
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
        contentArea.innerHTML = '<h2>Administração</h2><p>Área administrativa do sistema.</p>';
    }
}

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

<form id="academia-form" style="margin:16px 0;">
    <input type="hidden" id="academia-id">
    <input id="academia-title" class="input" placeholder="Título" required>
    <input id="academia-order" class="input" type="number" placeholder="Ordem" required>
    <label style="display:block;margin:8px 0;">
        <input type="checkbox" id="academia-active"> Ativo
    </label>
    <button type="submit" class="btn btn-primary">Salvar</button>
</form>
<ul id="academia-list" class="modules-list"></ul>
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

<form id="academia-form" style="margin:16px 0;">
    <input type="hidden" id="academia-id">
    <input id="academia-title" class="input" placeholder="Título" required>
    <input id="academia-order" class="input" type="number" placeholder="Ordem" required>
    <label style="display:block;margin:8px 0;">
        <input type="checkbox" id="academia-active"> Ativo
    </label>
    <button type="submit" class="btn btn-primary">Salvar</button>
</form>
<ul id="academia-list" class="modules-list"></ul>
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

<form id="academia-form" style="margin:16px 0;">
    <input type="hidden" id="academia-id">
    <input id="academia-title" class="input" placeholder="Título" required>
    <input id="academia-order" class="input" type="number" placeholder="Ordem" required>
    <label style="display:block;margin:8px 0;">
        <input type="checkbox" id="academia-active"> Ativo
    </label>
    <button type="submit" class="btn btn-primary">Salvar</button>
</form>
<ul id="academia-list" class="modules-list"></ul>
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

<form id="academia-form" style="margin:16px 0;">
    <input type="hidden" id="academia-id">
    <input id="academia-title" class="input" placeholder="Título" required>
    <input id="academia-order" class="input" type="number" placeholder="Ordem" required>
    <label style="display:block;margin:8px 0;">
        <input type="checkbox" id="academia-active"> Ativo
    </label>
    <button type="submit" class="btn btn-primary">Salvar</button>
</form>
<ul id="academia-list" class="modules-list"></ul>
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

<form id="academia-form" style="margin:16px 0;">
    <input type="hidden" id="academia-id">
    <input id="academia-title" class="input" placeholder="Título" required>
    <input id="academia-order" class="input" type="number" placeholder="Ordem" required>
    <label style="display:block;margin:8px 0;">
        <input type="checkbox" id="academia-active"> Ativo
    </label>
    <button type="submit" class="btn btn-primary">Salvar</button>
</form>
<ul id="academia-list" class="modules-list"></ul>
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

<form id="academia-form" style="margin:16px 0;">
    <input type="hidden" id="academia-id">
    <input id="academia-title" class="input" placeholder="Título" required>
    <input id="academia-order" class="input" type="number" placeholder="Ordem" required>
    <label style="display:block;margin:8px 0;">
        <input type="checkbox" id="academia-active"> Ativo
    </label>
    <button type="submit" class="btn btn-primary">Salvar</button>
</form>
<ul id="academia-list" class="modules-list"></ul>
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

<form id="academia-form" style="margin:16px 0;">
    <input type="hidden" id="academia-id">
    <input id="academia-title" class="input" placeholder="Título" required>
    <input id="academia-order" class="input" type="number" placeholder="Ordem" required>
    <label style="display:block;margin:8px 0;">
        <input type="checkbox" id="academia-active"> Ativo
    </label>
    <button type="submit" class="btn btn-primary">Salvar</button>
</form>
<ul id="academia-list" class="modules-list"></ul>
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

            if (page === 'academia') initAcademiaModule();
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

        async function initAcademiaModule() {
            const form = document.getElementById('academia-form');
            const list = document.getElementById('academia-list');
            const col = db.collection('academyModules').orderBy('order');

            // 1) Render em tempo real
            col.onSnapshot(snap => {
                list.innerHTML = '';
                snap.forEach(doc => renderAcademiaItem(doc));
            });

            // 2) Submit (create/update)
            form.addEventListener('submit', async e => {
                e.preventDefault();
                await saveAcademia({
                    id: form.elements['academia-id'].value || null,
                    title: form.elements['academia-title'].value,
                    order: parseInt(form.elements['academia-order'].value, 10) || 0,
                    active: form.elements['academia-active'].checked
                });
                form.reset();
            });
        }

        function renderAcademiaItem(doc) {
            const data = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${data.title}</span>
                <div>
                    <button class="btn btn-secondary btn-edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-delete"><i class="fas fa-trash"></i></button>
                </div>`;
            li.querySelector('.btn-edit').addEventListener('click', () => {
                document.getElementById('academia-id').value = doc.id;
                document.getElementById('academia-title').value = data.title;
                document.getElementById('academia-order').value = data.order;
                document.getElementById('academia-active').checked = data.active;
            });
            li.querySelector('.btn-delete').addEventListener('click', async () => {
                if (confirm('Excluir módulo?')) {
                    await db.collection('academyModules').doc(doc.id).delete();
                }
            });
            const list = document.getElementById('academia-list');
            if (list) list.appendChild(li);
        }

        async function saveAcademia({ id, title, order, active }) {
            const data = { title, order, active };
            if (id) {
                await fsUpdate('academyModules', id, { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            } else {
                await fsAdd('academyModules', { ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            }
        }

        // Inicialização da aplicação
        document.addEventListener('DOMContentLoaded', () => {
            showNotification('Aplicação iniciada', 'success');


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

  try {
    db.collection('notifications')
      .where('userId', '==', currentUser.uid)
      .where('read', '==', false)
      .onSnapshot(snapshot => {
        // … seu código de notificação …
      });
  } catch (err) {
    console.warn(
      'Não foi possível iniciar notificações em tempo real:',
      err.message
    );
  }
}

        // Inicializar notificações em tempo real quando o usuário fizer login
        auth.onAuthStateChanged((user) => {
            if (user) {
                setTimeout(() => {
                    initRealtimeNotifications();
                }, 1000);
            }
        });

        // Funções de exportação de dados
        function exportToCSV(data, filename) {
            const csv = data.map(row => Object.values(row).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        }

        // Funções de relatórios
        async function generateReport(type, dateRange) {
            try {
                let query = db.collection('activities');
                
                if (dateRange.start) {
                    query = query.where('timestamp', '>=', dateRange.start);
                }
                if (dateRange.end) {
                    query = query.where('timestamp', '<=', dateRange.end);
                }
                
                const snapshot = await query.get();
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                return data;
            } catch (error) {
                console.error('Erro ao gerar relatório:', error);
                return [];
            }
        }

        // Configurações de PWA (Progressive Web App)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then((registration) => {
                        showNotification('PWA ativo', 'success');
                    })
                    .catch((registrationError) => {
                        showNotification('Falha ao registrar service worker', 'error');
                    });
            });
        }

        // Detectar modo offline/online
        window.addEventListener('online', () => {
            showNotification('Conexão restaurada!', 'success');
            processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            showNotification('Você está offline. Algumas funcionalidades podem não estar disponíveis.', 'warning');
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

