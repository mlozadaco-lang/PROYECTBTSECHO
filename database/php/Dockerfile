# Archivo: database/php/Dockerfile — Propósito: imagen web (PHP+Apache) con pdo_mysql y DocumentRoot /var/www/public.
FROM php:8.2-apache

# Enable Apache modules often needed for apps
RUN a2enmod rewrite headers

# Install PDO MySQL so PHP can connect to MySQL
RUN docker-php-ext-install pdo_mysql

# Serve the project from /var/www/public (repo root is mounted at /var/www)
ENV APACHE_DOCUMENT_ROOT=/var/www/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
	&& sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Recommended: allow .htaccess overrides if needed (kept minimal)
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

WORKDIR /var/www/public
