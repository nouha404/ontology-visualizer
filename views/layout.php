<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($title ?? 'Ontology Visualizer') ?></title>
    <link rel="stylesheet" href="/css/style.css">
    <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
    <header>
        <div class="header-inner">
            <h1 class="logo"><a href="/">Ontology Visualizer</a></h1>
            <nav>
                <a href="/?action=home">Accueil</a>
            </nav>
        </div>
    </header>

    <main>
        <?= $content ?? '' ?>
    </main>

    <script src="/js/stateManager.js"></script>
    <script src="/js/colorManager.js"></script>
</body>
</html>
