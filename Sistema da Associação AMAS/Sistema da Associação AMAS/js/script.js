        // Lógica Principal da Aplicação encapsulada
        const app = {
            currentUser: null,
            chartInstance: null,

            // Dados Iniciais (Simulação de Banco de Dados local)
            seedData: function() {
                if(!localStorage.getItem('amas_users')) {
                    const defaultUsers = [
                        { id: 1, name: 'Administrador Geral', cpf: 'admin', password: 'admin123', role: 'admin', status: 'Ativo' },
                        { id: 2, name: 'João da Silva', cpf: '111.111.111-11', password: 'senha123', role: 'associado', status: 'Regular', matricula: 'AMAS-001', dataEntrada: '2023-01-15', email: 'joao@email.com', firstLogin: true },
                        { id: 3, name: 'Maria Oliveira', cpf: '333.333.333-33', password: 'senha123', role: 'associado', status: 'Inadimplente', matricula: 'AMAS-002', dataEntrada: '2023-05-20', email: 'maria@email.com', firstLogin: false },
                        { id: 4, name: 'Empresa Parceira S/A', cpf: '222.222.222-22', password: 'empresa123', role: 'empresario', status: 'Ativo' }
                    ];
                    localStorage.setItem('amas_users', JSON.stringify(defaultUsers));
                }
                if(!localStorage.getItem('amas_contributions')) {
                    const defaultContribs = [
                        { id: 1, userId: 2, month: '2026-02', value: 50.00, status: 'Aprovado', message: '' },
                        { id: 2, userId: 3, month: '2026-01', value: 50.00, status: 'Revisão solicitada', message: 'Comprovante ilegível.' }
                    ];
                    localStorage.setItem('amas_contributions', JSON.stringify(defaultContribs));
                }
                if(!localStorage.getItem('amas_join_requests')) {
                    localStorage.setItem('amas_join_requests', JSON.stringify([]));
                }
            },

            init: function() {
                this.seedData();
                this.checkSession();
                this.setupTheme();
            },

            // Navegação Single Page
            navigate: function(viewId) {
                document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
                
                // Controle de acesso básico
                if (['admin', 'associado', 'empresario'].includes(viewId)) {
                    if (!this.currentUser || this.currentUser.role !== viewId) {
                        this.navigate('home');
                        return;
                    }
                }

                document.getElementById(`view-${viewId}`).classList.add('active');
                window.scrollTo(0, 0);

                // Disparar lógica específica da view
                if (viewId === 'admin') this.loadAdminPanel();
                if (viewId === 'associado') this.loadAssocPanel();
                
                // Fechar modals
                this.closeLoginModal();
            },

            // --- UI & TEMA ---
            setupTheme: function() {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            },
            toggleTheme: function() {
                document.documentElement.classList.toggle('dark');
                if (document.documentElement.classList.contains('dark')) {
                    localStorage.theme = 'dark';
                } else {
                    localStorage.theme = 'light';
                }
                // Redesenhar gráfico se admin
                if(this.currentUser && this.currentUser.role === 'admin' && this.chartInstance) {
                    this.loadAdminPanel();
                }
            },
            showToast: function(msg, type='info') {
                const container = document.getElementById('toast-container');
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                let icon = type === 'success' ? 'check-circle' : type === 'error' ? 'circle-exclamation' : 'info-circle';
                toast.innerHTML = `<i class="fa-solid fa-${icon} mr-2"></i> ${msg}`;
                container.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
            },
            maskCPF: function(input) {
                let v = input.value.replace(/\D/g, "");
                if (v.length > 11) v = v.slice(0, 11);
                v = v.replace(/(\d{3})(\d)/, "$1.$2");
                v = v.replace(/(\d{3})(\d)/, "$1.$2");
                v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                input.value = v;
            },

            // --- PARTE 1: HOME & LOGIN ---
            submitJoinRequest: function(e) {
                e.preventDefault();
                const cpf = document.getElementById('join-cpf').value;
                if(cpf.length < 14) {
                    this.showToast('CPF inválido.', 'error');
                    return;
                }

                const users = JSON.parse(localStorage.getItem('amas_users'));
                if(users.some(u => u.cpf === cpf)) {
                    this.showToast('Este CPF já está cadastrado no sistema.', 'error');
                    return;
                }

                const request = {
                    nome: document.getElementById('join-nome').value,
                    cpf: cpf,
                    data: document.getElementById('join-data').value,
                    telefone: document.getElementById('join-telefone').value,
                    email: document.getElementById('join-email').value,
                    endereco: document.getElementById('join-endereco').value,
                    profissao: document.getElementById('join-profissao').value,
                    motivo: document.getElementById('join-motivo').value,
                    status: 'Pendente'
                };

                const requests = JSON.parse(localStorage.getItem('amas_join_requests'));
                requests.push(request);
                localStorage.setItem('amas_join_requests', JSON.stringify(requests));

                document.getElementById('join-form').reset();
                this.showToast('Sua solicitação foi enviada com sucesso. A equipe da AMAS analisará seu cadastro.', 'success');
            },
            
            openLoginModal: function() {
                document.getElementById('login-modal').classList.remove('hidden');
                document.getElementById('login-user').focus();
            },
            closeLoginModal: function() {
                document.getElementById('login-modal').classList.add('hidden');
                document.getElementById('login-form').reset();
            },
            setLoginRole: function(role) {
                document.getElementById('login-role').value = role;
                const tabs = ['admin', 'associado', 'empresario'];
                tabs.forEach(t => {
                    const el = document.getElementById(`tab-login-${t}`);
                    if(t === role) {
                        el.className = 'flex-1 py-2 text-sm font-medium rounded-md bg-white dark:bg-gray-600 shadow text-amas-blue-main dark:text-white transition';
                    } else {
                        el.className = 'flex-1 py-2 text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-amas-blue-main transition';
                    }
                });
                
                const label = document.getElementById('label-login-user');
                label.innerText = role === 'admin' ? 'Usuário / Login' : 'CPF';
                
                let input = document.getElementById('login-user');
                input.value = '';
                if(role !== 'admin') {
                    input.setAttribute('placeholder', '000.000.000-00');
                    input.setAttribute('oninput', 'app.maskCPF(this)');
                    input.setAttribute('maxlength', '14');
                } else {
                    input.removeAttribute('placeholder');
                    input.removeAttribute('oninput');
                    input.removeAttribute('maxlength');
                }
            },
            doLogin: function(e) {
                e.preventDefault();
                const userLogin = document.getElementById('login-user').value;
                const pass = document.getElementById('login-pass').value;
                const role = document.getElementById('login-role').value;

                const users = JSON.parse(localStorage.getItem('amas_users'));
                const user = users.find(u => u.cpf === userLogin && u.password === pass && u.role === role);

                if (user) {
                    this.currentUser = user;
                    localStorage.setItem('amas_session', JSON.stringify(user));
                    this.showToast(`Bem-vindo, ${user.name}!`, 'success');
                    this.updateNavState();
                    
                    if(user.role === 'associado' && user.firstLogin) {
                        document.getElementById('first-login-modal').classList.remove('hidden');
                    } else {
                        this.navigate(user.role);
                    }
                } else {
                    this.showToast('Credenciais inválidas ou perfil incorreto.', 'error');
                }
            },
            logout: function() {
                this.currentUser = null;
                localStorage.removeItem('amas_session');
                this.updateNavState();
                this.navigate('home');
                this.showToast('Logout realizado.', 'info');
            },
            checkSession: function() {
                const session = localStorage.getItem('amas_session');
                if (session) {
                    this.currentUser = JSON.parse(session);
                    this.updateNavState();
                    // Se estiver em modo associado e não mudou senha, forçar
                    if(this.currentUser.role === 'associado' && this.currentUser.firstLogin) {
                         document.getElementById('first-login-modal').classList.remove('hidden');
                    } else {
                        this.navigate(this.currentUser.role);
                    }
                } else {
                    this.navigate('home');
                }
            },
            updateNavState: function() {
                const isLogged = this.currentUser !== null;
                document.getElementById('btn-login-nav').classList.toggle('hidden', isLogged);
                document.getElementById('btn-logout-nav').classList.toggle('hidden', !isLogged);
                document.getElementById('btn-login-mobile').classList.toggle('hidden', isLogged);
                document.getElementById('btn-logout-mobile').classList.toggle('hidden', !isLogged);
                
                // Esconder links públicos se logado, ou mostrar atalho pro painel
                const publicLinks = document.querySelectorAll('.nav-public');
                publicLinks.forEach(l => l.style.display = isLogged ? 'none' : 'block');
                
                // Add painel link
                let painelLink = document.getElementById('nav-painel-link');
                if(isLogged) {
                    if(!painelLink) {
                        painelLink = document.createElement('a');
                        painelLink.id = 'nav-painel-link';
                        painelLink.href = '#';
                        painelLink.className = 'font-bold text-yellow-300 hover:text-white transition';
                        painelLink.onclick = () => this.navigate(this.currentUser.role);
                        document.getElementById('nav-links').insertBefore(painelLink, document.getElementById('btn-logout-nav'));
                    }
                    painelLink.innerText = 'Meu Painel';
                } else if(painelLink) {
                    painelLink.remove();
                }
            },

            // --- PARTE 2: ADMIN ---
            loadAdminPanel: function() {
                const users = JSON.parse(localStorage.getItem('amas_users')).filter(u => u.role === 'associado');
                const contribs = JSON.parse(localStorage.getItem('amas_contributions'));
                
                // Stats
                let regulares = 0; let inadimplentes = 0;
                users.forEach(u => {
                    if(u.status === 'Regular') regulares++;
                    if(u.status === 'Inadimplente') inadimplentes++;
                });
                let pendentes = contribs.filter(c => c.status === 'Em análise').length;

                document.getElementById('admin-total-assoc').innerText = users.length;
                document.getElementById('admin-regulares').innerText = regulares;
                document.getElementById('admin-inadimplentes').innerText = inadimplentes;
                document.getElementById('admin-pendentes').innerText = pendentes;

                // Tabela de Usuários
                this.renderAdminUsersTable(users);

                // Tabela de Aprovações
                const tableAprovacoes = document.getElementById('table-aprovacoes');
                tableAprovacoes.innerHTML = '';
                const emAnalise = contribs.filter(c => c.status === 'Em análise');
                
                if(emAnalise.length === 0) {
                    tableAprovacoes.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">Nenhuma contribuição pendente.</td></tr>`;
                } else {
                    emAnalise.forEach(c => {
                        const user = users.find(u => u.id === c.userId);
                        if(!user) return;
                        tableAprovacoes.innerHTML += `
                            <tr class="border-b dark:border-gray-700 text-sm">
                                <td class="py-3 text-gray-800 dark:text-gray-200">${user.name}<br><span class="text-xs text-gray-500">${c.month}</span></td>
                                <td class="py-3 font-bold text-green-600">R$ ${parseFloat(c.value).toFixed(2)}</td>
                                <td class="py-3"><a href="#" class="text-blue-500 hover:underline"><i class="fa-solid fa-file-pdf"></i> Ver</a></td>
                                <td class="py-3 flex gap-2">
                                    <button onclick="app.processarContrib(${c.id}, 'Aprovado')" class="bg-green-500 text-white p-1 rounded hover:bg-green-600" title="Aprovar"><i class="fa-solid fa-check"></i></button>
                                    <button onclick="app.abrirModalRevisao(${c.id})" class="bg-yellow-500 text-white p-1 rounded hover:bg-yellow-600" title="Pedir Revisão"><i class="fa-solid fa-rotate-left"></i></button>
                                </td>
                            </tr>
                        `;
                    });
                }

                // Gráfico Chart.js
                const ctx = document.getElementById('chartAssociados').getContext('2d');
                if(this.chartInstance) this.chartInstance.destroy();
                
                const isDark = document.documentElement.classList.contains('dark');
                const textColor = isDark ? '#e5e7eb' : '#374151';

                this.chartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Regular', 'Inadimplente', 'Em Análise'],
                        datasets: [{
                            data: [regulares, inadimplentes, users.filter(u=>u.status==='Pendente').length],
                            backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: textColor } }
                        }
                    }
                });
            },
            renderAdminUsersTable: function(users) {
                const tbody = document.getElementById('table-admin-users');
                tbody.innerHTML = '';
                users.forEach(u => {
                    let badgeClass = u.status === 'Regular' ? 'bg-green-100 text-green-800' : 
                                     (u.status === 'Inadimplente' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');
                    
                    tbody.innerHTML += `
                        <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td class="p-3 font-medium">${u.name}</td>
                            <td class="p-3 font-mono text-sm">${u.cpf}</td>
                            <td class="p-3 text-sm">${u.matricula || '-'}</td>
                            <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold ${badgeClass}">${u.status}</span></td>
                            <td class="p-3">
                                <button onclick="app.deleteUser(${u.id})" class="text-red-500 hover:text-red-700 ml-2" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                });
            },
            filterAdminUsers: function() {
                const q = document.getElementById('admin-search-cpf').value;
                const users = JSON.parse(localStorage.getItem('amas_users')).filter(u => u.role === 'associado');
                const filtered = q ? users.filter(u => u.cpf.includes(q)) : users;
                this.renderAdminUsersTable(filtered);
            },
            deleteUser: function(id) {
                if(confirm('Tem certeza que deseja excluir este associado?')) {
                    let users = JSON.parse(localStorage.getItem('amas_users'));
                    users = users.filter(u => u.id !== id);
                    localStorage.setItem('amas_users', JSON.stringify(users));
                    this.showToast('Usuário excluído.', 'success');
                    this.loadAdminPanel();
                }
            },
            processarContrib: function(id, status, message = '') {
                let contribs = JSON.parse(localStorage.getItem('amas_contributions'));
                let contrib = contribs.find(c => c.id === id);
                if(contrib) {
                    contrib.status = status;
                    contrib.message = message;
                    localStorage.setItem('amas_contributions', JSON.stringify(contribs));
                    
                    // Atualizar status do usuario se aprovou
                    if(status === 'Aprovado') {
                        let users = JSON.parse(localStorage.getItem('amas_users'));
                        let user = users.find(u => u.id === contrib.userId);
                        if(user) {
                            user.status = 'Regular';
                            localStorage.setItem('amas_users', JSON.stringify(users));
                        }
                    }

                    this.showToast(`Contribuição ${status}.`, 'success');
                    this.loadAdminPanel();
                }
            },
            abrirModalRevisao: function(id) {
                document.getElementById('rev-contrib-id').value = id;
                document.getElementById('rev-mensagem').value = '';
                document.getElementById('modal-revisao').classList.remove('hidden');
            },
            confirmRevisao: function() {
                const id = parseInt(document.getElementById('rev-contrib-id').value);
                const msg = document.getElementById('rev-mensagem').value;
                if(!msg) {
                    this.showToast('Digite a mensagem de revisão.', 'error');
                    return;
                }
                this.processarContrib(id, 'Revisão solicitada', msg);
                document.getElementById('modal-revisao').classList.add('hidden');
            },

            // --- PARTE 3: ASSOCIADO ---
            changeFirstPassword: function(e) {
                e.preventDefault();
                const p1 = document.getElementById('new-pass-1').value;
                const p2 = document.getElementById('new-pass-2').value;
                
                if(p1 !== p2) {
                    this.showToast('As senhas não coincidem.', 'error');
                    return;
                }

                let users = JSON.parse(localStorage.getItem('amas_users'));
                let uIndex = users.findIndex(u => u.id === this.currentUser.id);
                
                if(uIndex !== -1) {
                    users[uIndex].password = p1;
                    users[uIndex].firstLogin = false;
                    this.currentUser = users[uIndex];
                    localStorage.setItem('amas_users', JSON.stringify(users));
                    localStorage.setItem('amas_session', JSON.stringify(this.currentUser));
                    
                    document.getElementById('first-login-modal').classList.add('hidden');
                    this.showToast('Senha atualizada com sucesso!', 'success');
                    this.navigate('associado');
                }
            },
            loadAssocPanel: function() {
                const u = this.currentUser;
                // Obter dados frescos do banco
                const users = JSON.parse(localStorage.getItem('amas_users'));
                const freshUser = users.find(x => x.id === u.id);

                document.getElementById('assoc-nome-display').innerText = freshUser.name;
                document.getElementById('assoc-perfil-nome').innerText = freshUser.name;
                document.getElementById('assoc-perfil-mat').innerText = freshUser.matricula;
                document.getElementById('assoc-perfil-cpf').innerText = freshUser.cpf;
                document.getElementById('assoc-perfil-email').innerText = freshUser.email;
                document.getElementById('assoc-perfil-data').innerText = freshUser.dataEntrada;
                
                const badge = document.getElementById('assoc-status-badge');
                badge.innerText = `Status: ${freshUser.status}`;
                badge.className = `px-4 py-2 rounded-full font-bold text-white shadow-md ${freshUser.status === 'Regular' ? 'bg-green-500' : 'bg-red-500'}`;

                // Histórico
                const contribs = JSON.parse(localStorage.getItem('amas_contributions'))
                                    .filter(c => c.userId === freshUser.id)
                                    .sort((a,b) => b.id - a.id); // mais recentes primeiro

                const tbody = document.getElementById('table-assoc-history');
                tbody.innerHTML = '';
                
                if(contribs.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">Nenhuma contribuição registrada.</td></tr>`;
                } else {
                    contribs.forEach(c => {
                        let statusColor = c.status === 'Aprovado' ? 'text-green-500' : (c.status === 'Em análise' ? 'text-yellow-500' : 'text-red-500');
                        tbody.innerHTML += `
                            <tr class="border-b dark:border-gray-700">
                                <td class="p-3 font-medium">${c.month}</td>
                                <td class="p-3">R$ ${parseFloat(c.value).toFixed(2)}</td>
                                <td class="p-3 font-bold ${statusColor}">${c.status}</td>
                                <td class="p-3 text-sm text-gray-600 dark:text-gray-400 italic">${c.message || '-'}</td>
                            </tr>
                        `;
                    });
                }
            },
            submitContribution: function(e) {
                e.preventDefault();
                const mes = document.getElementById('contrib-mes').value;
                const valor = document.getElementById('contrib-valor').value;
                // Simulação de upload de arquivo no frontend
                
                let contribs = JSON.parse(localStorage.getItem('amas_contributions'));
                // checar se já mandou esse mes
                if(contribs.some(c => c.userId === this.currentUser.id && c.month === mes)) {
                    this.showToast('Você já enviou comprovante para este mês.', 'error');
                    return;
                }

                contribs.push({
                    id: Date.now(),
                    userId: this.currentUser.id,
                    month: mes,
                    value: parseFloat(valor),
                    status: 'Em análise',
                    message: ''
                });

                localStorage.setItem('amas_contributions', JSON.stringify(contribs));
                
                // Mudar status do usuario temporariamente se for inadimplente? Não, regra diz admin quem muda na aprovação.
                
                document.getElementById('contrib-form').reset();
                this.showToast('Comprovante enviado com sucesso! Aguarde análise.', 'success');
                this.loadAssocPanel();
            },

            // --- PARTE 4: EMPRESÁRIO ---
            consultarAssociado: function() {
                const cpf = document.getElementById('emp-search-cpf').value;
                if(cpf.length < 14) {
                    this.showToast('CPF incompleto.', 'error');
                    return;
                }

                const users = JSON.parse(localStorage.getItem('amas_users'));
                const assoc = users.find(u => u.cpf === cpf && u.role === 'associado');
                
                const resDiv = document.getElementById('emp-resultado');
                
                if(!assoc) {
                    this.showToast('Associado não encontrado.', 'error');
                    resDiv.classList.add('hidden');
                    return;
                }

                document.getElementById('emp-res-nome').innerText = assoc.name;
                document.getElementById('emp-res-cpf').innerText = assoc.cpf;
                document.getElementById('emp-res-status').innerText = assoc.status;
                
                const dt = new Date();
                document.getElementById('emp-res-data').innerText = `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR')}`;

                const icon = document.getElementById('emp-icon');
                const liberado = document.getElementById('emp-res-liberado');

                if(assoc.status === 'Regular') {
                    resDiv.className = 'mt-8 p-6 rounded-xl border-2 transition-all duration-300 border-green-500 bg-green-50 dark:bg-gray-800 block';
                    icon.className = 'text-5xl mr-4 text-green-500 fa-solid fa-circle-check';
                    document.getElementById('emp-res-status').className = 'text-xl font-bold text-green-600';
                    liberado.innerText = 'SIM';
                    liberado.className = 'text-xl font-bold text-green-600';
                } else {
                    resDiv.className = 'mt-8 p-6 rounded-xl border-2 transition-all duration-300 border-red-500 bg-red-50 dark:bg-gray-800 block';
                    icon.className = 'text-5xl mr-4 text-red-500 fa-solid fa-circle-xmark';
                    document.getElementById('emp-res-status').className = 'text-xl font-bold text-red-600';
                    liberado.innerText = 'NÃO';
                    liberado.className = 'text-xl font-bold text-red-600';
                }
            }
        };

        // Inicialização
        document.addEventListener('DOMContentLoaded', () => {
            app.init();
        });

   