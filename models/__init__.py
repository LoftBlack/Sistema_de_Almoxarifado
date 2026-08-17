from flask_sqlalchemy import SQLAlchemy

# Instância única do SQLAlchemy, compartilhada entre app.py e os models.
db = SQLAlchemy()
