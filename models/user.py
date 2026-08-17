from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from models import db


class Usuario(db.Model):
    """
    Representa um usuário do sistema.

    - senha_hash: NUNCA armazenamos a senha em texto puro, apenas o hash
      (via werkzeug.security). Use set_senha()/checar_senha() para manipular.
    - is_admin: administradores podem gerenciar outros usuários (/usuarios).
    - ativo: usuários desativados não conseguem mais logar, mas o histórico
      de quem fez o quê (se vier a existir) não é perdido.
    """

    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    senha_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def set_senha(self, senha_plana):
        self.senha_hash = generate_password_hash(senha_plana)

    def checar_senha(self, senha_plana):
        return check_password_hash(self.senha_hash, senha_plana)

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "username": self.username,
            "is_admin": self.is_admin,
            "ativo": self.ativo,
        }
