<?php $title = htmlspecialchars($fileName) . ' - Visualisation'; ?>
<?php ob_start(); ?>

<div class="viz-layout">
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
        <h3>Ontologie : <?= htmlspecialchars($fileName) ?></h3>

        <div class="sidebar-section">
            <label for="select-concept"><strong>Concept :</strong></label>
            <select id="select-concept">
                <option value="">-- Tous (hiérarchie complète) --</option>
                <?php foreach ($classes as $c): ?>
                    <option value="<?= htmlspecialchars($c->getUri()) ?>">
                        <?= htmlspecialchars($c->getLabel()) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="sidebar-section">
            <label for="select-depth"><strong>Profondeur :</strong></label>
            <select id="select-depth">
                <option value="-1">Illimitée</option>
                <option value="1">1</option>
                <option value="2" selected>2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
            </select>
        </div>

        <div class="sidebar-section">
            <label><strong>Mode :</strong></label>
            <select id="select-mode">
                <option value="hierarchy">Héritage (classes)</option>
                <option value="properties">Propriétés du concept</option>
                <option value="prop-hierarchy">Hiérarchie des propriétés</option>
                <option value="combined">Combiné (héritage + propriétés)</option>
            </select>
        </div>

        <div class="sidebar-section">
            <label><strong>Propriété (pour hiérarchie) :</strong></label>
            <select id="select-property">
                <option value="">-- Toutes --</option>
                <?php foreach ($properties as $p): ?>
                    <option value="<?= htmlspecialchars($p->getUri()) ?>">
                        <?= htmlspecialchars($p->getLabel()) ?>
                        (<?= $p->getPropertyType() ?>)
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <button id="btn-refresh" class="btn btn-primary btn-block">Visualiser</button>

        <!-- Info panel -->
        <div id="info-panel" class="info-panel" style="display:none;">
            <h4 id="info-title"></h4>
            <p id="info-uri" class="muted small"></p>
            <p id="info-comment"></p>
            <div id="info-properties"></div>
            <div id="info-restrictions"></div>
        </div>
    </aside>

    <!-- Main visualization -->
    <section class="viz-main">
        <div class="viz-toolbar">
            <div class="viz-tabs" id="viz-tabs">
                <button class="tab active" data-graph="collapse">Collapse</button>
                <button class="tab" data-graph="radial">Radial</button>
                <button class="tab" data-graph="coupe">Coupe</button>
                <button class="tab" data-graph="force">Force</button>
            </div>
            <div class="viz-actions">
                <button id="btn-zoom-in" class="btn-icon" title="Zoom +">+</button>
                <button id="btn-zoom-out" class="btn-icon" title="Zoom -">-</button>
                <button id="btn-reset" class="btn-icon" title="Reset">R</button>
            </div>
        </div>
        <div id="graph-container"></div>
    </section>
</div>

<!-- Pass data to JS -->
<script>
    window.ONTO_FILE = <?= json_encode($fileName) ?>;
    window.API_BASE = '?action=api&file=' + encodeURIComponent(window.ONTO_FILE);
</script>

<script src="/js/graphs/collapse.js"></script>
<script src="/js/graphs/radial.js"></script>
<script src="/js/graphs/coupe.js"></script>
<script src="/js/graphs/force.js"></script>
<script src="/js/app.js"></script>

<?php $content = ob_get_clean(); ?>
<?php require __DIR__ . '/layout.php'; ?>
