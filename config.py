import os

from dotenv import load_dotenv

# Carrega variáveis de um arquivo .env na raiz do projeto (se existir).
# Em produção, normalmente essas variáveis vêm do painel do serviço de
# hospedagem em vez de um arquivo .env versionado.
load_dotenv()


class Config:
    """
    Configurações centrais da aplicação.

    Todas as configurações sensíveis (chave secreta, string de conexão do
    banco) vêm de variáveis de ambiente — nunca ficam hardcoded no código.
    """

    SECRET_KEY = os.environ.get("SECRET_KEY", "troque-esta-chave-em-producao-2026")

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

    # --- Banco de dados ---
    # Se DATABASE_URL estiver definida (ex: ao usar PostgreSQL em produção),
    # ela tem prioridade. Caso contrário, usa SQLite localmente.
    _database_url = os.environ.get("DATABASE_URL")
    if _database_url:
        # Alguns provedores (Render, Heroku) fornecem a URL no formato antigo
        # "postgres://", mas o SQLAlchemy 1.4+/2.x exige "postgresql://".
        if _database_url.startswith("postgres://"):
            _database_url = _database_url.replace("postgres://", "postgresql://", 1)
        SQLALCHEMY_DATABASE_URI = _database_url
    else:
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'database', 'almoxarifado.db')}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- Sessão ---
    # Expira quando o navegador é fechado (comportamento solicitado).
    SESSION_PERMANENT = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # Em produção, atrás de HTTPS, defina SESSION_COOKIE_SECURE=true no .env
    # para que o cookie de sessão só trafegue por conexões seguras.
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
