const API_URL = 'https://api-receitas-pi.vercel.app/receitas/todas?page=1&limit=10';
let listaReceitasGlobal = []; // Guarda TODOS os dados da API

// --- 1. Carregamento Inicial ---
document.addEventListener('DOMContentLoaded', async () => {
    await carregarModal();
    await buscarDadosDaAPI(); // Busca os dados uma vez só
    atualizarContadorFavoritos(); // Atualiza o número na sidebar
});

async function carregarModal() {
    try {
        const response = await fetch('modal.html');
        const html = await response.text();
        document.getElementById('container-modal').innerHTML = html;
        
        const btnFav = document.getElementById('btn-favoritar');
        if (btnFav) {
             btnFav.addEventListener('click', () => {
                 const currentId = parseInt(btnFav.dataset.recipeId); 
                 if (!isNaN(currentId)) alternarFavorito(currentId);
             });
        }
    } catch (erro) { console.error(erro); }
}

// --- 2. Busca de Dados (Só acontece uma vez ou quando clica em "Todas") ---
async function buscarDadosDaAPI() {
    try {
        const response = await fetch(API_URL);
        const dados = await response.json();
        listaReceitasGlobal = dados.items || [];
        
        // Por padrão, ao carregar, mostra tudo
        renderizarLista(listaReceitasGlobal, "Todas as receitas");
        
    } catch (erro) { console.error(erro); }
}

// Wrapper para o botão "Todas as receitas" da sidebar
function carregarReceitas() {
    // Se já temos os dados, não precisa buscar na API de novo, só redesenha
    if (listaReceitasGlobal.length > 0) {
        renderizarLista(listaReceitasGlobal, "Todas as receitas");
    } else {
        buscarDadosDaAPI();
    }
}

// --- 3. Função de Exibir Favoritos (Filtra a lista global) ---
function mostrarFavoritos() {
    // Pega os IDs salvos no LocalStorage
    const favoritosIds = JSON.parse(localStorage.getItem('receitasFavoritas')) || [];
    
    // Filtra: Mantém na lista apenas quem tem o ID salvo nos favoritos
    const listaFiltrada = listaReceitasGlobal.filter(receita => favoritosIds.includes(receita.id));
    
    // Redesenha a tela com a lista filtrada
    renderizarLista(listaFiltrada, "Meus Favoritos");
}

// --- 4. Função Genérica de Renderizar (Desenha os Cards) ---
function renderizarLista(lista, titulo) {
    const container = document.getElementById('lista-receitas');
    const tituloElemento = document.getElementById('titulo-principal');
    
    // Atualiza o título da página
    if(tituloElemento) tituloElemento.innerText = titulo;

    container.innerHTML = ''; 

    if (lista.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted mt-5">Nenhuma receita encontrada aqui.</div>';
        return;
    }

    lista.forEach(receita => {
        const favoritos = JSON.parse(localStorage.getItem('receitasFavoritas')) || [];
        const isFav = favoritos.includes(receita.id);
        const heartClass = isFav ? 'bi-heart-fill text-danger' : 'bi-heart text-danger';

        const cardHTML = `
            <div class="col">
                <div class="card recipe-card h-100" onclick="abrirDetalhes(${receita.id})">
                    <img src="${receita.link_imagem}" class="card-img-top" alt="${receita.receita}" onerror="this.src='https://placehold.co/600x400'">
                    <div class="card-body">
                        <span>${receita.receita}</span>
                        
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// --- 5. Lógica do Modal e Ações ---
function abrirDetalhes(id) {
    const receita = listaReceitasGlobal.find(r => r.id === id);
    if (receita) {
        document.getElementById('modal-titulo').innerText = receita.receita;
        document.getElementById('modal-img').src = receita.link_imagem;
        document.getElementById('modal-preparo').innerText = receita.modo_preparo;

        const listaUl = document.getElementById('modal-ingredientes');
        listaUl.innerHTML = '';
        if (receita.ingredientes) {
            receita.ingredientes.split(',').forEach(item => {
                let li = document.createElement('li');
                li.className = 'list-group-item px-0 bg-transparent';
                li.innerHTML = `<i class="bi bi-check2-circle text-success me-2"></i> ${item.trim()}`;
                listaUl.appendChild(li);
            });
        }

        const btnFav = document.getElementById('btn-favoritar');
        if (btnFav) {
            btnFav.dataset.recipeId = id; 
            atualizarIconeModal(id);
        }

        new bootstrap.Modal(document.getElementById('modalReceita')).show();
    }
}

function alternarFavorito(id) {
    let favoritos = JSON.parse(localStorage.getItem('receitasFavoritas')) || [];
    const index = favoritos.indexOf(id);
    
    if (index > -1) favoritos.splice(index, 1); 
    else favoritos.push(id);
    
    localStorage.setItem('receitasFavoritas', JSON.stringify(favoritos));
    
    atualizarIconeModal(id);
    atualizarContadorFavoritos(); // Atualiza o número na sidebar
    
    // Se estivermos na tela de favoritos, remove o card em tempo real
    const tituloAtual = document.getElementById('titulo-principal').innerText;
    if (tituloAtual === "Meus Favoritos") {
        mostrarFavoritos();
    } else {
        // Se estiver em "Todas", apenas atualiza o ícone do card específico
        carregarReceitas(); 
    }
}

function atualizarIconeModal(id) {
    const icon = document.getElementById('icon-favorito');
    const favoritos = JSON.parse(localStorage.getItem('receitasFavoritas')) || [];
    
    if (favoritos.includes(id)) {
        icon.classList.remove('bi-heart');
        icon.classList.add('bi-heart-fill', 'favoritado');
    } else {
        icon.classList.add('bi-heart');
        icon.classList.remove('bi-heart-fill', 'favoritado');
    }
}

// --- Função para Filtrar por Categoria ---
function filtrarPorCategoria(categoriaAlvo) {
    
    // 1. Filtra a lista global
    // Usamos .toLowerCase() para garantir que "Doce" seja igual a "doce"
    const listaFiltrada = listaReceitasGlobal.filter(receita => 
        receita.tipo && receita.tipo.toLowerCase() === categoriaAlvo.toLowerCase()
    );

    // 2. Formata o Título para ficar bonito (Ex: "doce" vira "Doce")
    const tituloFormatado = categoriaAlvo.charAt(0).toUpperCase() + categoriaAlvo.slice(1);

    // 3. Renderiza a tela apenas com os itens filtrados
    renderizarLista(listaFiltrada, `Categoria: ${tituloFormatado}`);
}

// --- 7. Função de Pesquisa ---
function realizarPesquisa() {
    // 1. Pega o valor digitado e transforma em minúsculo
    const termo = document.getElementById('campo-pesquisa').value.toLowerCase();

    // 2. Filtra a lista global
    const listaFiltrada = listaReceitasGlobal.filter(receita => {
        // Verifica se o termo está no Nome
        const nomeMatch = receita.receita.toLowerCase().includes(termo);
        
        // Verifica se o termo está nos Ingredientes
        const ingredienteMatch = receita.ingredientes.toLowerCase().includes(termo);

        // Retorna verdadeiro se encontrar em qualquer um dos dois
        return nomeMatch || ingredienteMatch;
    });

    // 3. Define um título para o resultado
    let tituloResultado = "";
    if (termo === "") {
        tituloResultado = "Todas as receitas";
    } else {
        tituloResultado = `Resultados para: "${termo}"`;
    }

    // 4. Renderiza a lista filtrada
    renderizarLista(listaFiltrada, tituloResultado);
}

