<?php

declare(strict_types=1);

class VisualizationController
{
    public function show(): void
    {
        $fileName = $_GET['file'] ?? '';
        if (empty($fileName)) {
            header('Location: ?action=home&msg=select_file');
            return;
        }

        $filePath = DATA_PATH . '/' . basename($fileName);
        if (!file_exists($filePath)) {
            header('Location: ?action=home&msg=not_found');
            return;
        }

        // Parser l'ontologie pour récupérer les listes de classes/propriétés pour la sidebar
        $parser = new OntologyParser();
        $parser->loadFile($filePath);

        $classes = $parser->getClasses();
        $properties = $parser->getProperties();

        // Trier les classes par label
        usort($classes, fn($a, $b) => strcasecmp($a->getLabel(), $b->getLabel()));

        require BASE_PATH . '/views/visualization.php';
    }
}
