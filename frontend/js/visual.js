// visual.js
//
// Efeitos visuais do SIGEM. Nada aqui e necessario para o sistema
// funcionar - e so o "acabamento" que deixa o site com cara de
// aplicativo profissional. Cada bloco abaixo cuida de um efeito:
//
//   1. Icones            2. Sombra do cabecalho   3. Menu com pilula deslizante
//   4. Abas do celular   5. Aparecer ao rolar     6. Brilho que segue o mouse
//   7. Onda no clique    8. Avisos (toasts)       9. Esqueletos de carregamento
//  10. Barra deslizante 11. Inclinacao do banner 12. Numeros que contam

(function () {
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- 1. Icones ----------
    if (typeof hidratarIcones === 'function') hidratarIcones();

    // ---------- 2. Sombra do cabecalho ao rolar ----------
    const cabecalho = document.querySelector('header.topo');
    if (cabecalho) {
        const atualizarSombra = () => cabecalho.classList.toggle('com-sombra', window.scrollY > 8);
        window.addEventListener('scroll', atualizarSombra, { passive: true });
        atualizarSombra();
    }

    // ---------- 3. Menu: pilula que desliza ----------
    // Como cada pagina e um arquivo separado, guardamos onde a pilula
    // estava na pagina anterior e deslizamos DE la ATE o item novo.
    const menu = document.querySelector('nav.menu');
    if (menu) {
        const indicador = document.createElement('span');
        indicador.className = 'menu-indicador';
        menu.prepend(indicador);

        const mover = (alvo, animar) => {
            if (!alvo) return;
            indicador.style.transition = animar ? '' : 'none';
            indicador.style.width = `${alvo.offsetWidth}px`;
            indicador.style.height = `${alvo.offsetHeight}px`;
            indicador.style.transform = `translate(${alvo.offsetLeft}px, ${alvo.offsetTop}px)`;
            indicador.classList.add('pronto');
        };

        const ativo = () => menu.querySelector('a.ativo');
        const links = [...menu.querySelectorAll(':scope > a')];

        // posicao anterior (da pagina de onde viemos)
        let anterior = null;
        try { anterior = JSON.parse(sessionStorage.getItem('sigem_menu_pos')); } catch { /* ignora */ }

        if (ativo()) {
            if (anterior && !reduzirMovimento) {
                const antigo = links.find(l => l.getAttribute('href') === anterior.href);
                mover(antigo || ativo(), false);
                void indicador.offsetWidth;            // aplica a posicao antiga antes de animar
                requestAnimationFrame(() => mover(ativo(), true));
            } else {
                mover(ativo(), false);
            }
            try { sessionStorage.setItem('sigem_menu_pos', JSON.stringify({ href: ativo().getAttribute('href') })); } catch { /* ignora */ }
        }

        // a pilula acompanha o mouse e volta para o item ativo ao sair
        links.forEach((link) => link.addEventListener('mouseenter', () => mover(link, true)));
        menu.addEventListener('mouseleave', () => mover(ativo(), true));
        window.addEventListener('resize', () => mover(ativo(), false));
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => mover(ativo(), false));
    }

    // ---------- 4. Abas do celular (barra fixa embaixo) ----------
    if (menu && menu.querySelector(':scope > a')) {
        const ICONE_POR_PAGINA = {
            'dashboard.html': ['dashboard', 'Início'],
            'medicamentos.html': ['pill', 'Estoque'],
            'movimentacoes.html': ['movimentacoes', 'Movimentos'],
            'relatorios.html': ['relatorios', 'Relatórios'],
            'comparativo.html': ['comparativo', 'Comparativo'],
            'contexto.html': ['contexto', 'Contexto'],
        };
        const PRINCIPAIS = ['dashboard.html', 'medicamentos.html', 'movimentacoes.html', 'relatorios.html'];

        const todos = [...menu.querySelectorAll(':scope > a')].map(a => ({
            href: a.getAttribute('href'),
            ativo: a.classList.contains('ativo'),
        })).filter(l => ICONE_POR_PAGINA[l.href]);

        const principais = todos.filter(l => PRINCIPAIS.includes(l.href));
        const extras = todos.filter(l => !PRINCIPAIS.includes(l.href));

        const barra = document.createElement('nav');
        barra.className = 'nav-inferior';
        barra.setAttribute('aria-label', 'Navegação principal');

        barra.innerHTML = principais.map(l => {
            const [ico, rotulo] = ICONE_POR_PAGINA[l.href];
            return `<a href="${l.href}" class="${l.ativo ? 'ativo' : ''}">${icone(ico)}<span>${rotulo}</span></a>`;
        }).join('') + `<button type="button" id="btn-mais" class="${extras.some(e => e.ativo) ? 'ativo' : ''}" aria-label="Mais opções">${icone('mais')}<span>Mais</span></button>`;

        const folha = document.createElement('div');
        folha.className = 'folha-fundo';
        folha.innerHTML = `<div class="folha-mais">${extras.map(l => {
            const [ico, rotulo] = ICONE_POR_PAGINA[l.href];
            return `<a href="${l.href}" class="${l.ativo ? 'ativo' : ''}">${icone(ico)}${rotulo}</a>`;
        }).join('')}</div>`;

        document.body.append(barra, folha);

        const botaoMais = barra.querySelector('#btn-mais');
        botaoMais.addEventListener('click', () => folha.classList.toggle('aberto'));
        folha.addEventListener('click', (e) => { if (e.target === folha || e.target.closest('a')) folha.classList.remove('aberto'); });
    }

    // ---------- 5. Aparecer ao rolar ----------
    const secoes = [...document.querySelectorAll('main > *:nth-child(n+5)')];
    if ('IntersectionObserver' in window && secoes.length && !reduzirMovimento) {
        document.documentElement.classList.add('js-ok');
        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach((entrada) => {
                if (entrada.isIntersecting) {
                    entrada.target.classList.add('visivel');
                    observador.unobserve(entrada.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        secoes.forEach((s) => { s.classList.add('revelar'); observador.observe(s); });
    }

    // ---------- 6. Brilho que segue o mouse nos cards ----------
    document.addEventListener('pointermove', (e) => {
        const card = e.target.closest && e.target.closest('.card');
        if (!card) return;
        const caixa = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - caixa.left}px`);
        card.style.setProperty('--my', `${e.clientY - caixa.top}px`);
    }, { passive: true });

    // ---------- 7. Onda ao clicar nos botoes ----------
    document.addEventListener('click', (e) => {
        const botao = e.target.closest && e.target.closest('.btn-primario, .btn-vidro');
        if (!botao || reduzirMovimento) return;
        const caixa = botao.getBoundingClientRect();
        const tamanho = Math.max(caixa.width, caixa.height);
        const onda = document.createElement('span');
        onda.className = 'onda';
        onda.style.width = onda.style.height = `${tamanho}px`;
        onda.style.left = `${e.clientX - caixa.left - tamanho / 2}px`;
        onda.style.top = `${e.clientY - caixa.top - tamanho / 2}px`;
        botao.appendChild(onda);
        setTimeout(() => onda.remove(), 650);
    });

    // ---------- 8. Avisos (toasts) ----------
    // As paginas escrevem mensagens em #mensagem-area. Aqui damos a
    // elas um icone, fazemos sumirem sozinhas e deixamos fechar no clique.
    const areaMensagens = document.getElementById('mensagem-area');
    if (areaMensagens) {
        const melhorar = (aviso) => {
            if (aviso.dataset.pronto) return;
            aviso.dataset.pronto = '1';
            const erro = aviso.classList.contains('mensagem-erro');
            const sucesso = aviso.classList.contains('mensagem-sucesso');
            aviso.insertAdjacentHTML('afterbegin',
                `<span class="mensagem-icone">${icone(erro ? 'alerta' : sucesso ? 'ok' : 'info')}</span>`);

            const fechar = () => {
                aviso.classList.add('saindo');
                setTimeout(() => aviso.remove(), 260);
            };
            aviso.addEventListener('click', fechar);
            setTimeout(fechar, erro ? 9000 : 5000);
        };
        new MutationObserver((mudancas) => {
            mudancas.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1 && n.classList.contains('mensagem')) melhorar(n);
            }));
        }).observe(areaMensagens, { childList: true });
    }

    // ---------- 9. Esqueletos de carregamento ----------
    // Enquanto os dados nao chegam, mostramos blocos cinzas brilhando
    // no lugar dos cards e das linhas das tabelas.
    const gradeCards = document.getElementById('cards-resumo') || document.getElementById('cards-ao-vivo');
    if (gradeCards && gradeCards.innerHTML.trim() === '') {
        const qtd = gradeCards.id === 'cards-resumo' ? 5 : 3;
        gradeCards.innerHTML = Array.from({ length: qtd }, () =>
            '<div class="card-esqueleto"><span class="esqueleto"></span><span class="esqueleto"></span><span class="esqueleto"></span></div>').join('');
    }

    const corposVazios = [...document.querySelectorAll('tbody[id]')].filter(t => t.innerHTML.trim() === '');
    corposVazios.forEach((corpo) => {
        const colunas = corpo.closest('table').querySelectorAll('thead th').length || 1;
        corpo.innerHTML = Array.from({ length: 3 }, () =>
            `<tr class="linha-esqueleto"><td colspan="${colunas}"><span class="esqueleto"></span></td></tr>`).join('');
    });

    // Se algo der errado e os dados nunca chegarem, nao deixa o esqueleto para sempre.
    setTimeout(() => {
        document.querySelectorAll('.linha-esqueleto').forEach(l => l.remove());
        document.querySelectorAll('.card-esqueleto').forEach(c => c.remove());
    }, 40000);

    // ---------- 10. Barras deslizantes (simulador) ----------
    document.querySelectorAll('input[type="range"]').forEach((barra) => {
        const atualizar = () => {
            const pct = ((barra.value - barra.min) / (barra.max - barra.min)) * 100;
            barra.style.setProperty('--pct', `${pct}%`);
        };
        barra.addEventListener('input', atualizar);
        atualizar();
    });

    // ---------- 11. Inclinacao 3D do banner ----------
    const arte = document.querySelector('.hero-arte');
    if (arte && !reduzirMovimento && window.matchMedia('(hover: hover)').matches) {
        const imagem = arte.querySelector('img');
        arte.addEventListener('pointermove', (e) => {
            const c = arte.getBoundingClientRect();
            const x = (e.clientX - c.left) / c.width - 0.5;
            const y = (e.clientY - c.top) / c.height - 0.5;
            imagem.style.setProperty('--ry', `${x * 10}deg`);
            imagem.style.setProperty('--rx', `${-y * 8}deg`);
        });
        arte.addEventListener('pointerleave', () => {
            imagem.style.setProperty('--ry', '0deg');
            imagem.style.setProperty('--rx', '0deg');
        });
    }

    // ---------- 12. Numeros que contam (data-contar="1234") ----------
    const contadores = document.querySelectorAll('[data-contar]');
    contadores.forEach((el) => {
        const alvo = Number(el.dataset.contar);
        const sufixo = el.dataset.sufixo || '';
        const mostrar = (valor) => { el.textContent = Math.round(valor).toLocaleString('pt-BR') + sufixo; };
        mostrar(reduzirMovimento ? alvo : 0);
        if (reduzirMovimento) return;

        const iniciar = () => {
            const inicio = performance.now();
            const duracao = 1600;
            const passo = (agora) => {
                const p = Math.min((agora - inicio) / duracao, 1);
                mostrar(alvo * (1 - Math.pow(1 - p, 4)));
                if (p < 1) requestAnimationFrame(passo);
            };
            requestAnimationFrame(passo);
        };
        setTimeout(iniciar, 500);
    });
})();
