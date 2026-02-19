<?php

declare(strict_types=1);

class OntologyController
{
    public function index(): void
    {
        $files = OntologyParser::listAvailableFiles();
        $message = $_GET['msg'] ?? '';
        require BASE_PATH . '/views/home.php';
    }

    public function upload(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['ontology'])) {
            header('Location: ?action=home&msg=no_file');
            return;
        }

        $file = $_FILES['ontology'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            header('Location: ?action=home&msg=upload_error');
            return;
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, SUPPORTED_FORMATS)) {
            header('Location: ?action=home&msg=invalid_format');
            return;
        }

        $dest = UPLOAD_PATH . '/' . basename($file['name']);
        move_uploaded_file($file['tmp_name'], $dest);

        header('Location: ?action=home&msg=success');
    }
}
