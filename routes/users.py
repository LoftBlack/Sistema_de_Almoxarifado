from flask import Blueprint, jsonify, render_template, request

from models import db
from models.user import Usuario
from routes.auth import _usuario_atual, admin_required

users_bp = Blueprint("users", __name__)


# ---------------------------------------------------------------------------
# Página do painel de usuários
# ---------------------------------------------------------------------------
@users_bp.route("/usuarios")
@admin_required
def pagina_usuarios():
    return render_template("usuarios.html")


# ---------------------------------------------------------------------------
# API: listar usuários
# ---------------------------------------------------------------------------
@users_bp.route("/api/usuarios", methods=["GET"])
@admin_required
def listar_usuarios():
    usuarios = Usuario.query.order_by(Usuario.nome.asc()).all()
    return jsonify([u.to_dict() for u in usuarios])


# ---------------------------------------------------------------------------
# API: criar usuário
# ---------------------------------------------------------------------------
@users_bp.route("/api/usuarios", methods=["POST"])
@admin_required
def criar_usuario():
    dados = request.get_json(silent=True) or {}

    nome = (dados.get("nome") or "").strip()
    username = (dados.get("username") or "").strip().lower()
    senha = dados.get("senha") or ""
    is_admin = bool(dados.get("is_admin"))

    erros = validar_dados_usuario(nome, username, senha, exigir_senha=True)
    if Usuario.query.filter_by(username=username).first():
        erros.append("Já existe um usuário com este nome de usuário.")

    if erros:
        return jsonify({"erros": erros}), 400

    usuario = Usuario(nome=nome, username=username, is_admin=is_admin, ativo=True)
    usuario.set_senha(senha)
    db.session.add(usuario)
    db.session.commit()

    return jsonify(usuario.to_dict()), 201


# ---------------------------------------------------------------------------
# API: atualizar dados de usuário (nome / username / perfil admin)
# ---------------------------------------------------------------------------
@users_bp.route("/api/usuarios/<int:usuario_id>", methods=["PUT"])
@admin_required
def atualizar_usuario(usuario_id):
    usuario = Usuario.query.get_or_404(usuario_id)
    dados = request.get_json(silent=True) or {}

    nome = (dados.get("nome") or "").strip()
    username = (dados.get("username") or "").strip().lower()
    is_admin = bool(dados.get("is_admin"))

    erros = validar_dados_usuario(nome, username, "senha-nao-verificada-aqui", exigir_senha=False)

    existente = Usuario.query.filter_by(username=username).first()
    if existente and existente.id != usuario.id:
        erros.append("Já existe um usuário com este nome de usuário.")

    # Nunca deixa o sistema ficar sem nenhum administrador.
    if usuario.is_admin and not is_admin and _contar_outros_admins(usuario.id) == 0:
        erros.append("Não é possível remover o único administrador do sistema.")

    if erros:
        return jsonify({"erros": erros}), 400

    usuario.nome = nome
    usuario.username = username
    usuario.is_admin = is_admin
    db.session.commit()

    return jsonify(usuario.to_dict())


# ---------------------------------------------------------------------------
# API: redefinir senha de um usuário (o admin define uma nova senha)
# ---------------------------------------------------------------------------
@users_bp.route("/api/usuarios/<int:usuario_id>/senha", methods=["POST"])
@admin_required
def redefinir_senha(usuario_id):
    usuario = Usuario.query.get_or_404(usuario_id)
    dados = request.get_json(silent=True) or {}
    nova_senha = dados.get("senha") or ""

    if len(nova_senha) < 6:
        return jsonify({"erros": ["A senha deve ter pelo menos 6 caracteres."]}), 400

    usuario.set_senha(nova_senha)
    db.session.commit()
    return jsonify({"sucesso": True})


# ---------------------------------------------------------------------------
# API: ativar / desativar usuário
# ---------------------------------------------------------------------------
@users_bp.route("/api/usuarios/<int:usuario_id>/status", methods=["POST"])
@admin_required
def alternar_status(usuario_id):
    usuario = Usuario.query.get_or_404(usuario_id)
    atual = _usuario_atual()

    if usuario.id == atual.id:
        return jsonify({"erros": ["Você não pode desativar a si mesmo."]}), 400

    if usuario.ativo and usuario.is_admin and _contar_outros_admins(usuario.id, apenas_ativos=True) == 0:
        return jsonify({"erros": ["Não é possível desativar o único administrador ativo."]}), 400

    usuario.ativo = not usuario.ativo
    db.session.commit()
    return jsonify(usuario.to_dict())


# ---------------------------------------------------------------------------
# API: excluir usuário
# ---------------------------------------------------------------------------
@users_bp.route("/api/usuarios/<int:usuario_id>", methods=["DELETE"])
@admin_required
def excluir_usuario(usuario_id):
    usuario = Usuario.query.get_or_404(usuario_id)
    atual = _usuario_atual()

    if usuario.id == atual.id:
        return jsonify({"erros": ["Você não pode excluir a si mesmo."]}), 400

    if usuario.is_admin and _contar_outros_admins(usuario.id) == 0:
        return jsonify({"erros": ["Não é possível excluir o único administrador do sistema."]}), 400

    db.session.delete(usuario)
    db.session.commit()
    return jsonify({"sucesso": True})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _contar_outros_admins(usuario_id, apenas_ativos=False):
    query = Usuario.query.filter(Usuario.is_admin.is_(True), Usuario.id != usuario_id)
    if apenas_ativos:
        query = query.filter(Usuario.ativo.is_(True))
    return query.count()


def validar_dados_usuario(nome, username, senha, exigir_senha=True):
    erros = []

    if not nome:
        erros.append("O nome é obrigatório.")

    if not username or len(username) < 3:
        erros.append("O nome de usuário deve ter pelo menos 3 caracteres.")
    elif not username.replace(".", "").replace("_", "").isalnum():
        erros.append("O nome de usuário deve conter apenas letras, números, ponto ou underline.")

    if exigir_senha and len(senha) < 6:
        erros.append("A senha deve ter pelo menos 6 caracteres.")

    return erros
