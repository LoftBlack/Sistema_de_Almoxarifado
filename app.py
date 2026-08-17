import os

import click
from flask import Flask

from config import Config
from models import db
from models.user import Usuario
from routes.auth import _usuario_atual, auth_bp
from routes.items import items_bp
from routes.users import users_bp


def create_app():
    """Application factory: facilita testes e futura escalabilidade."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Garante que a pasta do banco de dados exista (relevante apenas para SQLite).
    os.makedirs(os.path.join(Config.BASE_DIR, "database"), exist_ok=True)

    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(items_bp)
    app.register_blueprint(users_bp)

    with app.app_context():
        db.create_all()

    # Disponibiliza o usuário logado em todos os templates, como
    # `usuario_atual` (sem precisar passar isso manualmente em cada rota).
    @app.context_processor
    def injetar_usuario_atual():
        return {"usuario_atual": _usuario_atual()}

    # -------------------------------------------------------------------
    # Comando de linha de comando para criar o administrador inicial.
    #
    # Uso (no terminal, dentro da pasta do projeto):
    #     flask --app app create-admin
    #
    # A senha é digitada de forma oculta (não aparece na tela) e nunca
    # fica salva em nenhum arquivo do projeto — só o hash vai para o banco.
    # Rodar de novo com o mesmo usuário atualiza a senha e garante que ele
    # seja administrador (útil para "resetar" o acesso caso necessário).
    # -------------------------------------------------------------------
    @app.cli.command("create-admin")
    @click.option("--username", prompt="Nome de usuário (login)")
    @click.option("--nome", prompt="Nome de exibição")
    @click.password_option()
    def create_admin(username, nome, password):
        """Cria (ou atualiza) um usuário administrador."""
        with app.app_context():
            username_normalizado = username.strip().lower()
            usuario = Usuario.query.filter_by(username=username_normalizado).first()

            if usuario:
                usuario.set_senha(password)
                usuario.nome = nome
                usuario.is_admin = True
                usuario.ativo = True
                db.session.commit()
                click.echo(f"Usuário '{username_normalizado}' atualizado e definido como administrador.")
            else:
                usuario = Usuario(
                    nome=nome,
                    username=username_normalizado,
                    is_admin=True,
                    ativo=True,
                )
                usuario.set_senha(password)
                db.session.add(usuario)
                db.session.commit()
                click.echo(f"Administrador '{username_normalizado}' criado com sucesso!")

    return app


app = create_app()


if __name__ == "__main__":
    # debug=True apenas para desenvolvimento local. Desative em produção.
    app.run(debug=True, host="0.0.0.0", port=5000)
