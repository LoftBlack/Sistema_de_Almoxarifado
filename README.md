# Sistema de Almoxarifado

Sistema web para gestão de itens de almoxarifado: cadastro, edição, exclusão,
busca em tempo real, exportação para Excel e agora **login multiusuário com
senha em hash e gestão de usuários pelo administrador**.

## Estrutura de pastas

```
almoxarifado/
├── app.py                    # Ponto de entrada + comando "flask create-admin"
├── config.py                  # Configurações (variáveis de ambiente, banco)
├── requirements.txt
├── .env.example                # Modelo de variáveis de ambiente
├── database/                    # Onde o .db do SQLite é criado (se não usar Postgres)
├── models/
│   ├── __init__.py               # Instância do SQLAlchemy
│   ├── item.py                    # Modelo do Item de almoxarifado
│   └── user.py                     # Modelo do Usuário (senha em hash)
├── routes/
│   ├── auth.py                      # Login / logout / minha-conta / decorators
│   ├── items.py                      # Dashboard + API de itens + exportação Excel
│   └── users.py                       # Painel de usuários (somente admin)
├── templates/
│   ├── login.html
│   ├── dashboard.html
│   ├── usuarios.html                   # Painel de gestão de usuários
│   └── minha_conta.html                 # Troca de senha do próprio usuário
└── static/
    ├── css/style.css                     # Tema visual (bege/marrom/ocre)
    ├── images/logo.png                    # Logo
    └── js/
        ├── dashboard.js                    # Busca, modal, CRUD de itens
        └── usuarios.js                      # CRUD de usuários
```

## Passo a passo para rodar localmente

### 1. Pré-requisitos
- Python 3.9+ instalado (`python --version`)

### 2. Ambiente virtual
```bash
python -m venv venv
```
- **Windows (PowerShell):** `venv\Scripts\Activate.ps1`
- **Mac/Linux:** `source venv/bin/activate`

### 3. Instalar dependências
```bash
pip install -r requirements.txt
```

### 4. Configurar variáveis de ambiente
Copie `.env.example` para `.env` e gere uma `SECRET_KEY` própria:
```bash
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"
```
Cole o valor gerado no `.env`.

### 5. Criar o seu usuário administrador
Este é o passo que substitui o antigo `admin`/`admin` fixo no código.
Rode (a senha é digitada de forma oculta):
```bash
flask --app app create-admin
```
Você será perguntado por: nome de usuário, nome de exibição e senha.
Guarde bem essas credenciais — é você quem vai logar com elas.

> Rodar o comando de novo com o mesmo nome de usuário **atualiza a senha**
> e garante que ele continue sendo administrador (útil como "reset de
> emergência" caso você esqueça a senha, direto no servidor).

### 6. Rodar a aplicação
```bash
python app.py
```
Acesse **http://127.0.0.1:5000** e faça login com o usuário que você acabou
de criar.

---

## Gestão de usuários

Ao logar como administrador, aparece o link **"Usuários"** na barra superior.
Lá você pode:

- Criar novos usuários (definindo se são administradores ou não)
- Editar nome / nome de usuário / perfil
- Redefinir a senha de qualquer usuário
- Ativar / Desativar (bloqueia o login sem apagar o cadastro)
- Excluir usuários

**Proteções automáticas:**
- Ninguém consegue excluir ou desativar a própria conta.
- O sistema nunca fica sem nenhum administrador ativo (a última conta admin
  não pode ser rebaixada, desativada ou excluída).
- Ao desativar alguém, a sessão dessa pessoa é cortada imediatamente, mesmo
  que ela já estivesse com o navegador aberto.

Qualquer usuário (admin ou não) pode trocar a própria senha em **"Minha
Conta"**, na barra superior.

---

## Colocando no ar (deploy)

Você tem duas rotas principais. Se não tem preferência, a **Opção A** é a
mais simples de manter no dia a dia.

### Opção A — Render (ou Railway) + PostgreSQL — recomendado p/ quem não quer administrar servidor

O SQLite funciona bem localmente, mas a maioria dos serviços gerenciados
(Render, Railway, Heroku) tem **disco efêmero**: se você não usar um disco
persistente pago, o arquivo `.db` pode ser apagado a cada novo deploy. Por
isso, para produção nesses serviços, o mais seguro é usar o banco
PostgreSQL gerenciado que eles mesmos oferecem (geralmente com plano
gratuito ou bem barato).

Passo a passo (Render como exemplo):
1. Suba este projeto para um repositório no GitHub.
2. No Render, crie um **PostgreSQL** (Render fornece a `DATABASE_URL` pronta).
3. Crie um **Web Service** apontando para o repositório.
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app`
4. Nas variáveis de ambiente do Web Service, defina:
   - `SECRET_KEY` → uma chave aleatória forte
   - `DATABASE_URL` → cole a URL do PostgreSQL criado no passo 2
   - `SESSION_COOKIE_SECURE` → `true`
5. No requirements.txt, descomente a linha `psycopg2-binary` (driver do
   PostgreSQL) antes do deploy.
6. Depois do primeiro deploy, abra o "Shell" do serviço (Render oferece um
   terminal web) e rode `flask --app app create-admin` para criar seu
   usuário — as tabelas já existem porque `db.create_all()` roda
   automaticamente na inicialização do app.

### Opção B — VPS próprio (DigitalOcean, Hetzner, Contabo, etc.)

Aqui você tem controle total do disco, então pode manter o **SQLite** sem
problema (ideal se o uso é de poucas pessoas simultâneas, como costuma ser
num almoxarifado paroquial).

1. Acesse o servidor via SSH e instale Python 3, `pip` e `venv`.
2. Clone/copie o projeto para o servidor, crie o `venv` e instale as
   dependências (`pip install -r requirements.txt`).
3. Configure o `.env` com uma `SECRET_KEY` própria e `SESSION_COOKIE_SECURE=true`.
4. Rode `flask --app app create-admin` para criar seu usuário.
5. Rode a aplicação com Gunicorn (não use `python app.py`/`debug=True` em
   produção):
   ```bash
   gunicorn --workers 3 --bind 127.0.0.1:8000 app:app
   ```
6. Configure um **Nginx** na frente fazendo proxy reverso para
   `127.0.0.1:8000`, com certificado HTTPS (ex: Let's Encrypt / Certbot).
7. Use `systemd` (ou supervisor) para manter o Gunicorn rodando e
   reiniciando sozinho caso o servidor reinicie.
8. Faça backup periódico do arquivo `database/almoxarifado.db` (é só um
   arquivo — copiar para outro lugar de tempos em tempos já ajuda muito).

---

## Notas de segurança

- Senhas nunca são armazenadas em texto puro — apenas o hash
  (`werkzeug.security`).
- `SECRET_KEY` e a string de conexão do banco vêm de variáveis de ambiente,
  nunca do código-fonte.
- Em produção, sempre `SESSION_COOKIE_SECURE=true` (exige HTTPS) e nunca
  rode com `debug=True`.
- Recomenda-se senhas de pelo menos 6 caracteres (validado no cadastro);
  para um sistema mais crítico, considere aumentar esse mínimo.

## Funcionalidades incluídas

- ✅ Login multiusuário com senha em hash + sessão que expira ao fechar o navegador
- ✅ Comando `flask create-admin` para criar/atualizar administradores sem tocar no código
- ✅ Painel de usuários (somente admin): criar, editar, redefinir senha, ativar/desativar, excluir
- ✅ Autoatendimento "Minha Conta" para qualquer usuário trocar a própria senha
- ✅ Proteções contra autoexclusão/autodesativação e remoção do último administrador
- ✅ Tabela de itens com Nome, Quantidade, Localização e Finalidade/Categoria
- ✅ Busca em tempo real, sem recarregar a página
- ✅ Adicionar / Editar / Excluir itens via modal, com validação
- ✅ Exportação da lista de itens para Excel (.xlsx)
- ✅ Destaque visual para itens com quantidade baixa (≤ 5 unidades)
- ✅ Pronto para trocar SQLite → PostgreSQL só configurando `DATABASE_URL`
- ✅ Layout responsivo
