<?php

declare(strict_types=1);

// Supprimer les avertissements de dépréciation EasyRDF sur PHP 8
error_reporting(E_ALL & ~E_DEPRECATED);

// Charger l'autoloader Composer
require_once __DIR__ . '/../vendor/autoload.php';

// Charger la configuration
require_once __DIR__ . '/../config/config.php';

// Autoloader simple type PSR-4 pour nos classes
spl_autoload_register(function (string $class): void {
    $dirs = [
        BASE_PATH . '/controllers/',
        BASE_PATH . '/models/',
    ];
    foreach ($dirs as $dir) {
        $file = $dir . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// Routeur
$action = $_GET['action'] ?? 'home';

match ($action) {
    'home'          => (new OntologyController())->index(),
    'upload'        => (new OntologyController())->upload(),
    'visualization' => (new VisualizationController())->show(),
    'api'           => (new ApiController())->handle(),
    default         => (new OntologyController())->index(),
};
