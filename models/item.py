from datetime import datetime

from models import db


class Item(db.Model):
    """
    Representa um item armazenado no almoxarifado.

    Campos:
        nome:        Nome do item (ex.: "Cadeiras dobráveis")
        quantidade:  Quantidade disponível em estoque (>= 0)
        localizacao: Onde o item está guardado (ex.: "Prateleira A3")
        finalidade:  Categoria/uso do item (ex.: "Retiro", "Liturgia", "Manutenção")
    """

    __tablename__ = "itens"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False, default=0)
    localizacao = db.Column(db.String(150), nullable=False)
    finalidade = db.Column(db.String(100), nullable=False)

    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "quantidade": self.quantidade,
            "localizacao": self.localizacao,
            "finalidade": self.finalidade,
        }
