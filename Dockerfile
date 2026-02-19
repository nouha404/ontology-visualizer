FROM php:8.2-cli

# Installer les extensions nécessaires
RUN apt-get update && apt-get install -y \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Installer Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances d'abord (cache Docker)
COPY composer.json composer.lock ./

# Installer les dépendances
RUN composer install --no-dev --optimize-autoloader

# Copier le reste du projet
COPY . .

# Exposer le port (Render utilise la variable PORT)
EXPOSE 10000

# Lancer le serveur PHP intégré sur le port de Render
CMD php -S 0.0.0.0:${PORT:-10000} -t public
