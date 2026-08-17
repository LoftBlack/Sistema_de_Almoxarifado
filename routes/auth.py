from functools import wraps

from flask import Blueprint, jsonify, redirect, render_template, request, session, url_for

from models import db
from models.user import Usuario

auth_bp = Blueprint("auth", __name__)


# ---------------------------------------------------------------------------
# Helpers de sessão / autorização
# ---------------------------------------------------------------------------
def _usuario_atual():
    """
    Retorna o objeto Usuario correspondente à sessão atual, ou None.

    Consultamos o banco a cada request (em vez de confiar só no que está na
    sessão) para que, se um admin desativar alguém, o acesso seja cortado
    imediatamente — mesmo que a sessão daquele usuário ainda esteja "válida"
    no navegador dele.
    """
    usuario_id = session.get("usuario_id")
    if not usuario_id:
        return None

    usuario = Usuario.query.get(usuario_id)
    if not usuario or not usuario.ativo:
        return None

    return usuario


def login_required(view_func):
    """Protege rotas exigindo que o usuário esteja logado e ativo."""

    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if not _usuario_atual():
            session.clear()
            return redirect(url_for("auth.login"))
        return view_func(*args, **kwargs)

    return wrapped


def admin_required(view_func):
    """Protege rotas exigindo que o usuário logado seja administrador."""

    @wraps(view_func)
    def wrapped(*args, **kwargs):
        usuario = _usuario_atual()
        if not usuario:
            session.clear()
            return redirect(url_for("auth.login"))
        if not usuario.is_admin:
            return jsonify({"erros": ["Acesso restrito ao administrador."]}), 403
        return view_func(*args, **kwargs)

    return wrapped


# ---------------------------------------------------------------------------
# Login / Logout
# ---------------------------------------------------------------------------
@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if _usuario_atual():
        return redirect(url_for("items.dashboard"))

    erro = None
    # Se o banco ainda não tem nenhum usuário (primeira instalação), avisamos
    # a pessoa a rodar o comando de criação do administrador inicial.
    sem_usuarios = Usuario.query.count() == 0

    if request.method == "POST" and not sem_usuarios:
        username = request.form.get("usuario", "").strip().lower()
        senha = request.form.get("senha", "")

        usuario = Usuario.query.filter_by(username=username).first()

        if usuario and not usuario.ativo:
            erro = "Este usuário está desativado. Fale com o administrador."
        elif usuario and usuario.checar_senha(senha):
            session.clear()
            session["usuario_id"] = usuario.id
            session.permanent = False  # expira quando o navegador for fechado
            return redirect(url_for("items.dashboard"))
        else:
            erro = "Usuário ou senha inválidos."

    return render_template("login.html", erro=erro, sem_usuarios=sem_usuarios)


@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login"))


# ---------------------------------------------------------------------------
# Autoatendimento: cada usuário pode trocar a própria senha
# ---------------------------------------------------------------------------
@auth_bp.route("/minha-conta", methods=["GET", "POST"])
@login_required
def minha_conta():
    usuario = _usuario_atual()
    mensagem = None
    erro = None

    if request.method == "POST":
        senha_atual = request.form.get("senha_atual", "")
        nova_senha = request.form.get("nova_senha", "")
        confirmar_senha = request.form.get("confirmar_senha", "")

        if not usuario.checar_senha(senha_atual):
            erro = "Senha atual incorreta."
        elif len(nova_senha) < 6:
            erro = "A nova senha deve ter pelo menos 6 caracteres."
        elif nova_senha != confirmar_senha:
            erro = "A confirmação não corresponde à nova senha."
        else:
            usuario.set_senha(nova_senha)
            db.session.commit()
            mensagem = "Senha alterada com sucesso!"

    return render_template("minha_conta.html", usuario=usuario, mensagem=mensagem, erro=erro)
