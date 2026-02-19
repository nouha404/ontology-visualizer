<?php $title = 'Accueil - Ontology Visualizer'; ?>
<?php ob_start(); ?>

<div class="home-container">
    <h2>Charger une ontologie</h2>

    <?php if (!empty($message)): ?>
        <div class="alert alert-<?= $message === 'success' ? 'success' : 'error' ?>">
            <?= match($message) {
                'success'        => 'Fichier uploadé avec succès.',
                'no_file'        => 'Aucun fichier sélectionné.',
                'upload_error'   => 'Erreur lors de l\'upload.',
                'invalid_format' => 'Format non supporté (owl, rdfs, rdf, json, jsonld).',
                'select_file'    => 'Veuillez sélectionner un fichier.',
                'not_found'      => 'Fichier non trouvé.',
                default          => $message,
            } ?>
        </div>
    <?php endif; ?>

    <form action="?action=upload" method="POST" enctype="multipart/form-data" class="upload-form">
        <label class="file-label">
            <input type="file" name="ontology" accept=".owl,.rdf,.rdfs,.xml,.json,.jsonld">
            <span class="file-btn">Choisir un fichier OWL/RDFS</span>
        </label>
        <button type="submit" class="btn btn-primary">Uploader</button>
    </form>

    <h2>Ontologies disponibles</h2>

    <?php if (empty($files)): ?>
        <p class="muted">Aucun fichier trouvé dans le dossier data/.</p>
    <?php else: ?>
        <div class="file-grid">
            <?php foreach ($files as $f): ?>
                <a href="?action=visualization&file=<?= urlencode($f['name']) ?>" class="file-card">
                    <div class="file-icon">
                        <?= strtoupper($f['format']) ?>
                    </div>
                    <div class="file-info">
                        <strong><?= htmlspecialchars($f['name']) ?></strong>
                        <span class="muted"><?= number_format($f['size'] / 1024, 1) ?> Ko</span>
                    </div>
                </a>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>

<?php $content = ob_get_clean(); ?>
<?php require __DIR__ . '/layout.php'; ?>
