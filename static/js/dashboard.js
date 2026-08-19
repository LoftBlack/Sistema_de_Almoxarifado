/* =============================================================
   Sistema de Almoxarifado — lógica do painel (dashboard)
   ============================================================= */

const LIMITE_ESTOQUE_BAIXO = 5; // abaixo disso, destaca a quantidade em vermelho

let itensCache = []; // guarda a última lista carregada, para filtrar localmente

// --------- Elementos da página ---------
const corpoTabela = document.getElementById("corpoTabela");
const estadoVazio = document.getElementById("estadoVazio");
const campoBusca = document.getElementById("campoBusca");

const overlayModal = document.getElementById("overlayModal");
const tituloModal = document.getElementById("tituloModal");
const formItem = document.getElementById("formItem");
const itemIdInput = document.getElementById("itemId");
const inputNome = document.getElementById("inputNome");
const inputQuantidade = document.getElementById("inputQuantidade");
const inputLocalizacao = document.getElementById("inputLocalizacao");
const inputFinalidade = document.getElementById("inputFinalidade");
const inputObservacoes = document.getElementById("inputObservacoes");
const alertaFormulario = document.getElementById("alertaFormulario");

const btnNovoItem = document.getElementById("btnNovoItem");
const btnFecharModal = document.getElementById("btnFecharModal");
const btnCancelar = document.getElementById("btnCancelar");
const btnSalvar = document.getElementById("btnSalvar");
const btnExportar = document.getElementById("btnExportar");

const toast = document.getElementById("toast");
const toastMensagem = document.getElementById("toastMensagem");

// =============================================================
// Carregamento inicial
// =============================================================
document.addEventListener("DOMContentLoaded", carregarItens);

async function carregarItens() {
  try {
    const resp = await fetch("/api/itens");
    if (!resp.ok) throw new Error("Falha ao carregar itens");
    itensCache = await resp.json();
    renderizarTabela(itensCache);
  } catch (erro) {
    mostrarToast("Não foi possível carregar os itens.", "erro");
    console.error(erro);
  }
}

// =============================================================
// Renderização da tabela
// =============================================================
function renderizarTabela(itens) {
  corpoTabela.innerHTML = "";

  if (itens.length === 0) {
    estadoVazio.style.display = "block";
    return;
  }
  estadoVazio.style.display = "none";

  itens.forEach((item) => {
    const tr = document.createElement("tr");

    const qtdClasse = item.quantidade <= LIMITE_ESTOQUE_BAIXO ? "qtd-baixa" : "";

    tr.innerHTML = `
      <td data-rotulo="Nome do Item">${escapeHtml(item.nome)}</td>
      <td data-rotulo="Quantidade"><span class="${qtdClasse}">${item.quantidade}</span></td>
      <td data-rotulo="Localização">${escapeHtml(item.localizacao)}</td>
      <td data-rotulo="Finalidade"><span class="badge">${escapeHtml(item.finalidade)}</span></td>
      <td data-rotulo="Ações">
        <div class="acoes-linha">
          ${item.observacoes ? `
            <button class="icon-btn ver-obs" title="Ver observação" data-id="${item.id}">
              <i class="fa-solid fa-note-sticky"></i>
            </button>` : ""}
          <button class="icon-btn editar" title="Editar" data-id="${item.id}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="icon-btn excluir" title="Excluir" data-id="${item.id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;

    corpoTabela.appendChild(tr);
  });

  // Liga os botões de ação recém-criados
  corpoTabela.querySelectorAll(".editar").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalEdicao(btn.dataset.id));
  });
  corpoTabela.querySelectorAll(".excluir").forEach((btn) => {
    btn.addEventListener("click", () => confirmarExclusao(btn.dataset.id));
  });
  corpoTabela.querySelectorAll(".ver-obs").forEach((btn) => {
  btn.addEventListener("click", () => verObservacao(btn.dataset.id));
});
}

function escapeHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

// =============================================================
// Busca dinâmica (client-side, instantânea)
// =============================================================
campoBusca.addEventListener("input", () => {
  const termo = campoBusca.value.trim().toLowerCase();

  if (!termo) {
    renderizarTabela(itensCache);
    return;
  }

  const filtrados = itensCache.filter((item) =>
    item.nome.toLowerCase().includes(termo) ||
    item.localizacao.toLowerCase().includes(termo) ||
    item.finalidade.toLowerCase().includes(termo)
  );

  renderizarTabela(filtrados);
});

// =============================================================
// Modal — abrir / fechar
// =============================================================
btnNovoItem.addEventListener("click", abrirModalNovo);
btnFecharModal.addEventListener("click", fecharModal);
btnCancelar.addEventListener("click", fecharModal);
overlayModal.addEventListener("click", (e) => {
  if (e.target === overlayModal) fecharModal();
});

function abrirModalNovo() {
  tituloModal.innerHTML = '<i class="fa-solid fa-box"></i> Adicionar Novo Item';
  formItem.reset();
  itemIdInput.value = "";
  esconderAlerta();
  overlayModal.classList.add("ativo");
  setTimeout(() => inputNome.focus(), 50);
}

function abrirModalEdicao(id) {
  const item = itensCache.find((i) => String(i.id) === String(id));
  if (!item) return;

  tituloModal.innerHTML = '<i class="fa-solid fa-pen"></i> Editar Item';
  itemIdInput.value = item.id;
  inputNome.value = item.nome;
  inputQuantidade.value = item.quantidade;
  inputLocalizacao.value = item.localizacao;
  inputFinalidade.value = item.finalidade;
  inputObservacoes.value = item.observacoes || "";
  esconderAlerta();
  overlayModal.classList.add("ativo");
}

function fecharModal() {
  overlayModal.classList.remove("ativo");
}

function mostrarAlerta(mensagem) {
  alertaFormulario.style.display = "flex";
  alertaFormulario.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${escapeHtml(mensagem)}</span>`;
}

function esconderAlerta() {
  alertaFormulario.style.display = "none";
  alertaFormulario.innerHTML = "";
}

// =============================================================
// Salvar (criar ou atualizar)
// =============================================================
btnSalvar.addEventListener("click", salvarItem);

async function salvarItem() {
  esconderAlerta();

  const id = itemIdInput.value;
  const payload = {
    nome: inputNome.value.trim(),
    quantidade: inputQuantidade.value,
    localizacao: inputLocalizacao.value.trim(),
    finalidade: inputFinalidade.value.trim(),
    observacoes: inputObservacoes.value.trim(),
  };

  // Validação básica no front (a validação real/segura ocorre no backend)
  if (!payload.nome || !payload.localizacao || !payload.finalidade) {
    mostrarAlerta("Preencha todos os campos obrigatórios.");
    return;
  }
  if (payload.quantidade === "" || Number(payload.quantidade) < 0) {
    mostrarAlerta("A quantidade não pode ser negativa.");
    return;
  }

  const url = id ? `/api/itens/${id}` : "/api/itens";
  const metodo = id ? "PUT" : "POST";

  btnSalvar.disabled = true;
  try {
    const resp = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const dados = await resp.json();

    if (!resp.ok) {
      const mensagens = dados.erros ? dados.erros.join(" ") : "Erro ao salvar item.";
      mostrarAlerta(mensagens);
      return;
    }

    fecharModal();
    mostrarToast(id ? "Item atualizado com sucesso!" : "Item adicionado com sucesso!", "sucesso");
    await carregarItens();
    // Reaplica o filtro de busca, se houver.
    if (campoBusca.value.trim()) campoBusca.dispatchEvent(new Event("input"));
  } catch (erro) {
    mostrarAlerta("Erro de conexão com o servidor.");
    console.error(erro);
  } finally {
    btnSalvar.disabled = false;
  }
}

// =============================================================
// Excluir
// =============================================================
async function confirmarExclusao(id) {
  const item = itensCache.find((i) => String(i.id) === String(id));
  const nome = item ? item.nome : "este item";

  if (!confirm(`Tem certeza que deseja excluir "${nome}"? Essa ação não pode ser desfeita.`)) {
    return;
  }

  try {
    const resp = await fetch(`/api/itens/${id}`, { method: "DELETE" });
    if (!resp.ok) throw new Error("Falha ao excluir");

    mostrarToast("Item excluído com sucesso!", "sucesso");
    await carregarItens();
    if (campoBusca.value.trim()) campoBusca.dispatchEvent(new Event("input"));
  } catch (erro) {
    mostrarToast("Não foi possível excluir o item.", "erro");
    console.error(erro);
  }
}

// =============================================================
// Exportar para Excel
// =============================================================
btnExportar.addEventListener("click", () => {
  window.location.href = "/api/itens/exportar";
});

// =============================================================
// Toast de notificação
// =============================================================
let toastTimeout;
function mostrarToast(mensagem, tipo = "sucesso") {
  clearTimeout(toastTimeout);

  toast.className = tipo; // "sucesso" ou "erro"
  toastMensagem.textContent = mensagem;
  toast.querySelector("i").className =
    tipo === "sucesso" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation";

  toast.classList.add("mostrar");
  toastTimeout = setTimeout(() => toast.classList.remove("mostrar"), 3000);
}

function verObservacao(id) {
  const item = itensCache.find((i) => String(i.id) === String(id));
  if (!item) return;
  document.getElementById("textoObservacaoVisualizar").textContent = item.observacoes;
  document.getElementById("overlayModalObservacao").classList.add("ativo");
}

document.getElementById("btnFecharModalObservacao").addEventListener("click", () => {
  document.getElementById("overlayModalObservacao").classList.remove("ativo");
});
document.getElementById("btnFecharObservacao2").addEventListener("click", () => {
  document.getElementById("overlayModalObservacao").classList.remove("ativo");
});
document.getElementById("overlayModalObservacao").addEventListener("click", (e) => {
  if (e.target.id === "overlayModalObservacao") e.target.classList.remove("ativo");
});