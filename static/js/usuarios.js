/* =============================================================
   Sistema de Almoxarifado — painel de gestão de usuários (admin)
   ============================================================= */

let usuariosCache = [];

const corpoTabelaUsuarios = document.getElementById("corpoTabelaUsuarios");
const estadoVazioUsuarios = document.getElementById("estadoVazioUsuarios");

const overlayModalUsuario = document.getElementById("overlayModalUsuario");
const tituloModalUsuario = document.getElementById("tituloModalUsuario");
const formUsuario = document.getElementById("formUsuario");
const usuarioIdInput = document.getElementById("usuarioId");
const inputNomeUsuario = document.getElementById("inputNomeUsuario");
const inputUsername = document.getElementById("inputUsername");
const inputSenhaUsuario = document.getElementById("inputSenhaUsuario");
const inputIsAdmin = document.getElementById("inputIsAdmin");
const alertaFormularioUsuario = document.getElementById("alertaFormularioUsuario");

const btnNovoUsuario = document.getElementById("btnNovoUsuario");
const btnFecharModalUsuario = document.getElementById("btnFecharModalUsuario");
const btnCancelarUsuario = document.getElementById("btnCancelarUsuario");
const btnSalvarUsuario = document.getElementById("btnSalvarUsuario");

const overlayModalSenha = document.getElementById("overlayModalSenha");
const usuarioIdSenhaInput = document.getElementById("usuarioIdSenha");
const inputNovaSenha = document.getElementById("inputNovaSenha");
const alertaSenha = document.getElementById("alertaSenha");
const btnFecharModalSenha = document.getElementById("btnFecharModalSenha");
const btnCancelarSenha = document.getElementById("btnCancelarSenha");
const btnConfirmarSenha = document.getElementById("btnConfirmarSenha");

const toast = document.getElementById("toast");
const toastMensagem = document.getElementById("toastMensagem");

// =============================================================
// Carregamento inicial
// =============================================================
document.addEventListener("DOMContentLoaded", carregarUsuarios);

async function carregarUsuarios() {
  try {
    const resp = await fetch("/api/usuarios");
    if (!resp.ok) throw new Error("Falha ao carregar usuários");
    usuariosCache = await resp.json();
    renderizarTabelaUsuarios();
  } catch (erro) {
    mostrarToast("Não foi possível carregar os usuários.", "erro");
    console.error(erro);
  }
}

// =============================================================
// Renderização da tabela
// =============================================================
function renderizarTabelaUsuarios() {
  corpoTabelaUsuarios.innerHTML = "";

  if (usuariosCache.length === 0) {
    estadoVazioUsuarios.style.display = "block";
    return;
  }
  estadoVazioUsuarios.style.display = "none";

  usuariosCache.forEach((usuario) => {
    const tr = document.createElement("tr");

    const statusBadge = usuario.ativo
      ? '<span class="badge" style="background:rgba(76,122,76,0.12); color:#4c7a4c;">Ativo</span>'
      : '<span class="badge" style="background:rgba(168,50,50,0.12); color:#a83232;">Inativo</span>';

    tr.innerHTML = `
      <td data-rotulo="Nome">${escapeHtml(usuario.nome)}</td>
      <td data-rotulo="Usuário">${escapeHtml(usuario.username)}</td>
      <td data-rotulo="Perfil"><span class="badge">${usuario.is_admin ? "Administrador" : "Usuário"}</span></td>
      <td data-rotulo="Status">${statusBadge}</td>
      <td data-rotulo="Ações">
        <div class="acoes-linha">
          <button class="icon-btn editar" title="Editar" data-id="${usuario.id}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="icon-btn senha" title="Redefinir senha" data-id="${usuario.id}">
            <i class="fa-solid fa-key"></i>
          </button>
          <button class="icon-btn status" title="${usuario.ativo ? "Desativar" : "Ativar"}" data-id="${usuario.id}">
            <i class="fa-solid ${usuario.ativo ? "fa-user-slash" : "fa-user-check"}"></i>
          </button>
          <button class="icon-btn excluir" title="Excluir" data-id="${usuario.id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;

    corpoTabelaUsuarios.appendChild(tr);
  });

  corpoTabelaUsuarios.querySelectorAll(".editar").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalEdicao(btn.dataset.id));
  });
  corpoTabelaUsuarios.querySelectorAll(".senha").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalSenha(btn.dataset.id));
  });
  corpoTabelaUsuarios.querySelectorAll(".status").forEach((btn) => {
    btn.addEventListener("click", () => alternarStatus(btn.dataset.id));
  });
  corpoTabelaUsuarios.querySelectorAll(".excluir").forEach((btn) => {
    btn.addEventListener("click", () => confirmarExclusao(btn.dataset.id));
  });
}

function escapeHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

// =============================================================
// Modal — Novo / Editar usuário
// =============================================================
btnNovoUsuario.addEventListener("click", abrirModalNovo);
btnFecharModalUsuario.addEventListener("click", fecharModalUsuario);
btnCancelarUsuario.addEventListener("click", fecharModalUsuario);
overlayModalUsuario.addEventListener("click", (e) => {
  if (e.target === overlayModalUsuario) fecharModalUsuario();
});

function abrirModalNovo() {
  tituloModalUsuario.innerHTML = '<i class="fa-solid fa-user-plus"></i> Novo Usuário';
  formUsuario.reset();
  usuarioIdInput.value = "";
  inputSenhaUsuario.placeholder = "Mínimo 6 caracteres";
  esconderAlertaUsuario();
  overlayModalUsuario.classList.add("ativo");
  setTimeout(() => inputNomeUsuario.focus(), 50);
}

function abrirModalEdicao(id) {
  const usuario = usuariosCache.find((u) => String(u.id) === String(id));
  if (!usuario) return;

  tituloModalUsuario.innerHTML = '<i class="fa-solid fa-pen"></i> Editar Usuário';
  usuarioIdInput.value = usuario.id;
  inputNomeUsuario.value = usuario.nome;
  inputUsername.value = usuario.username;
  inputIsAdmin.checked = usuario.is_admin;
  inputSenhaUsuario.value = "";
  inputSenhaUsuario.placeholder = "Deixe em branco para não alterar a senha";
  esconderAlertaUsuario();
  overlayModalUsuario.classList.add("ativo");
}

function fecharModalUsuario() {
  overlayModalUsuario.classList.remove("ativo");
}

function mostrarAlertaUsuario(mensagem) {
  alertaFormularioUsuario.style.display = "flex";
  alertaFormularioUsuario.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${escapeHtml(mensagem)}</span>`;
}

function esconderAlertaUsuario() {
  alertaFormularioUsuario.style.display = "none";
  alertaFormularioUsuario.innerHTML = "";
}

// =============================================================
// Salvar (criar ou atualizar usuário)
// =============================================================
btnSalvarUsuario.addEventListener("click", salvarUsuario);

async function salvarUsuario() {
  esconderAlertaUsuario();

  const id = usuarioIdInput.value;
  const payload = {
    nome: inputNomeUsuario.value.trim(),
    username: inputUsername.value.trim().toLowerCase(),
    is_admin: inputIsAdmin.checked,
  };

  // Ao CRIAR, a senha é obrigatória. Ao EDITAR, o campo de senha nem existe
  // no payload (a senha só é alterada pelo modal de "Redefinir Senha").
  if (!id) {
    payload.senha = inputSenhaUsuario.value;
  }

  if (!payload.nome || !payload.username) {
    mostrarAlertaUsuario("Preencha nome e nome de usuário.");
    return;
  }
  if (!id && (!payload.senha || payload.senha.length < 6)) {
    mostrarAlertaUsuario("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  const url = id ? `/api/usuarios/${id}` : "/api/usuarios";
  const metodo = id ? "PUT" : "POST";

  btnSalvarUsuario.disabled = true;
  try {
    const resp = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const dados = await resp.json();

    if (!resp.ok) {
      mostrarAlertaUsuario((dados.erros || []).join(" ") || "Erro ao salvar usuário.");
      return;
    }

    fecharModalUsuario();
    mostrarToast(id ? "Usuário atualizado com sucesso!" : "Usuário criado com sucesso!", "sucesso");
    await carregarUsuarios();
  } catch (erro) {
    mostrarAlertaUsuario("Erro de conexão com o servidor.");
    console.error(erro);
  } finally {
    btnSalvarUsuario.disabled = false;
  }
}

// =============================================================
// Modal — Redefinir senha
// =============================================================
function abrirModalSenha(id) {
  usuarioIdSenhaInput.value = id;
  inputNovaSenha.value = "";
  alertaSenha.style.display = "none";
  overlayModalSenha.classList.add("ativo");
  setTimeout(() => inputNovaSenha.focus(), 50);
}

btnFecharModalSenha.addEventListener("click", () => overlayModalSenha.classList.remove("ativo"));
btnCancelarSenha.addEventListener("click", () => overlayModalSenha.classList.remove("ativo"));
overlayModalSenha.addEventListener("click", (e) => {
  if (e.target === overlayModalSenha) overlayModalSenha.classList.remove("ativo");
});

btnConfirmarSenha.addEventListener("click", async () => {
  const id = usuarioIdSenhaInput.value;
  const senha = inputNovaSenha.value;

  if (!senha || senha.length < 6) {
    alertaSenha.style.display = "flex";
    alertaSenha.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> A senha deve ter pelo menos 6 caracteres.';
    return;
  }

  try {
    const resp = await fetch(`/api/usuarios/${id}/senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    const dados = await resp.json();

    if (!resp.ok) {
      alertaSenha.style.display = "flex";
      alertaSenha.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml((dados.erros || []).join(" "))}`;
      return;
    }

    overlayModalSenha.classList.remove("ativo");
    mostrarToast("Senha redefinida com sucesso!", "sucesso");
  } catch (erro) {
    console.error(erro);
  }
});

// =============================================================
// Ativar / Desativar
// =============================================================
async function alternarStatus(id) {
  try {
    const resp = await fetch(`/api/usuarios/${id}/status`, { method: "POST" });
    const dados = await resp.json();

    if (!resp.ok) {
      mostrarToast((dados.erros || ["Não foi possível alterar o status."]).join(" "), "erro");
      return;
    }

    mostrarToast("Status atualizado!", "sucesso");
    await carregarUsuarios();
  } catch (erro) {
    mostrarToast("Erro de conexão com o servidor.", "erro");
    console.error(erro);
  }
}

// =============================================================
// Excluir
// =============================================================
async function confirmarExclusao(id) {
  const usuario = usuariosCache.find((u) => String(u.id) === String(id));
  const nome = usuario ? usuario.nome : "este usuário";

  if (!confirm(`Tem certeza que deseja excluir "${nome}"? Essa ação não pode ser desfeita.`)) {
    return;
  }

  try {
    const resp = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    const dados = await resp.json();

    if (!resp.ok) {
      mostrarToast((dados.erros || ["Não foi possível excluir o usuário."]).join(" "), "erro");
      return;
    }

    mostrarToast("Usuário excluído com sucesso!", "sucesso");
    await carregarUsuarios();
  } catch (erro) {
    mostrarToast("Erro de conexão com o servidor.", "erro");
    console.error(erro);
  }
}

// =============================================================
// Toast de notificação
// =============================================================
let toastTimeout;
function mostrarToast(mensagem, tipo = "sucesso") {
  clearTimeout(toastTimeout);

  toast.className = tipo;
  toastMensagem.textContent = mensagem;
  toast.querySelector("i").className =
    tipo === "sucesso" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation";

  toast.classList.add("mostrar");
  toastTimeout = setTimeout(() => toast.classList.remove("mostrar"), 3000);
}
