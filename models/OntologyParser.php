<?php

declare(strict_types=1);

use EasyRdf\Graph;
use EasyRdf\Resource;
use EasyRdf\RdfNamespace;

/**
 * OntologyParser - Parseur de fichiers OWL/RDF/RDFS avec EasyRDF
 * Supporte : RDF/XML (.owl, .rdfs, .rdf) et JSON-LD (.jsonld, .json)
 */
class OntologyParser
{
    private Graph $graph;
    private string $baseUri = '';
    private string $filePath = '';

    public function __construct()
    {
        RdfNamespace::set('owl', NS_OWL);
        RdfNamespace::set('rdfs', NS_RDFS);
        RdfNamespace::set('rdf', NS_RDF);
    }

    public function loadFile(string $filepath): void
    {
        $this->filePath = $filepath;
        $this->graph = new Graph();
        $format = $this->detectFormat($filepath);
        $data = file_get_contents($filepath);

        if ($data === false) {
            throw new \RuntimeException("Cannot read file: $filepath");
        }

        $this->graph->parse($data, $format);
        $this->baseUri = $this->detectBaseUri();
    }

    private function detectFormat(string $filepath): string
    {
        $content = file_get_contents($filepath, false, null, 0, 200);

        if (str_starts_with(trim($content), '[') || str_starts_with(trim($content), '{')) {
            return 'jsonld';
        }

        return 'rdfxml';
    }

    private function detectBaseUri(): string
    {
        // Chercher l'URI de l'ontologie
        foreach ($this->graph->allOfType('owl:Ontology') as $ont) {
            return $ont->getUri();
        }

        // Repli : trouver le namespace le plus fréquent parmi les classes
        $namespaces = [];
        foreach ($this->getAllClassResources() as $resource) {
            if ($resource->isBNode()) continue;
            $uri = $resource->getUri();
            $ns = $this->getNamespace($uri);
            $namespaces[$ns] = ($namespaces[$ns] ?? 0) + 1;
        }

        if (!empty($namespaces)) {
            arsort($namespaces);
            return array_key_first($namespaces);
        }

        return '';
    }

    public function getBaseUri(): string
    {
        return $this->baseUri;
    }

    // ========== CLASSES ==========

    /**
     * Récupérer toutes les ressources de classes (owl:Class + rdfs:Class)
     */
    private function getAllClassResources(): array
    {
        $resources = [];
        $seen = [];

        // Classes OWL (owl:Class)
        foreach ($this->graph->allOfType('owl:Class') as $r) {
            if ($r->isBNode()) continue;
            $uri = $r->getUri();
            if (!isset($seen[$uri])) {
                $resources[] = $r;
                $seen[$uri] = true;
            }
        }

        // Classes RDFS (rdfs:Class)
        foreach ($this->graph->allOfType('rdfs:Class') as $r) {
            if ($r->isBNode()) continue;
            $uri = $r->getUri();
            if (!isset($seen[$uri])) {
                $resources[] = $r;
                $seen[$uri] = true;
            }
        }

        return $resources;
    }

    /**
     * Récupérer toutes les classes sous forme de ConceptModel[]
     */
    public function getClasses(): array
    {
        $classes = [];

        foreach ($this->getAllClassResources() as $resource) {
            $uri = $resource->getUri();

            // Ignorer owl:Thing et les URIs du vocabulaire standard
            if ($this->isStandardUri($uri)) continue;

            $classes[$uri] = $this->resourceToConcept($resource);
        }

        return $classes;
    }

    /**
     * Convertir une ressource RDF en ConceptModel
     */
    private function resourceToConcept(Resource $resource): ConceptModel
    {
        $uri = $resource->getUri();
        $label = $this->getLabel($resource);
        $comment = $this->getComment($resource);

        $parents = [];
        foreach ($resource->all('rdfs:subClassOf') as $parent) {
            if ($parent instanceof Resource && !$parent->isBNode()) {
                $parentUri = $parent->getUri();
                if (!$this->isStandardUri($parentUri)) {
                    $parents[] = $parentUri;
                }
            }
        }

        $restrictions = $this->extractRestrictions($resource);

        $concept = new ConceptModel($uri, $label);
        $concept->setComment($comment);
        $concept->setParentUris($parents);
        $concept->setRestrictions($restrictions);

        return $concept;
    }

    /**
     * Extraire les restrictions OWL d'une classe
     */
    private function extractRestrictions(Resource $resource): array
    {
        $restrictions = [];

        foreach ($resource->all('rdfs:subClassOf') as $parent) {
            if ($parent instanceof Resource && $parent->isBNode()) {
                $restriction = $this->parseRestriction($parent);
                if ($restriction) {
                    $restrictions[] = $restriction;
                }
            }
        }

        return $restrictions;
    }

    private function parseRestriction(Resource $bnode): ?array
    {
        $type = $bnode->type();
        if ($type !== 'owl:Restriction' && !$bnode->isA('owl:Restriction')) {
            return null;
        }

        $onProperty = $bnode->get('owl:onProperty');
        if (!$onProperty) return null;

        $restriction = [
            'property' => $onProperty->getUri(),
            'propertyLabel' => $this->localName($onProperty->getUri()),
        ];

        if ($sv = $bnode->get('owl:someValuesFrom')) {
            $restriction['type'] = 'someValuesFrom';
            if (!$sv->isBNode()) {
                $restriction['value'] = $sv->getUri();
                $restriction['valueLabel'] = $this->localName($sv->getUri());
            }
        } elseif ($av = $bnode->get('owl:allValuesFrom')) {
            $restriction['type'] = 'allValuesFrom';
            if (!$av->isBNode()) {
                $restriction['value'] = $av->getUri();
                $restriction['valueLabel'] = $this->localName($av->getUri());
            }
        }

        return $restriction;
    }

    // ========== PROPRIÉTÉS ==========

    /**
     * Récupérer toutes les propriétés sous forme de PropertyModel[]
     */
    public function getProperties(): array
    {
        $properties = [];
        $seen = [];

        // Propriétés d'objet (owl:ObjectProperty)
        foreach ($this->graph->allOfType('owl:ObjectProperty') as $r) {
            if ($r->isBNode()) continue;
            $uri = $r->getUri();
            if ($this->isStandardUri($uri) || isset($seen[$uri])) continue;
            $seen[$uri] = true;
            $properties[$uri] = $this->resourceToProperty($r, 'object');
        }

        // Propriétés de type de données (owl:DatatypeProperty)
        foreach ($this->graph->allOfType('owl:DatatypeProperty') as $r) {
            if ($r->isBNode()) continue;
            $uri = $r->getUri();
            if ($this->isStandardUri($uri) || isset($seen[$uri])) continue;
            $seen[$uri] = true;
            $properties[$uri] = $this->resourceToProperty($r, 'datatype');
        }

        // Propriétés transitives (owl:TransitiveProperty)
        foreach ($this->graph->allOfType('owl:TransitiveProperty') as $r) {
            if ($r->isBNode()) continue;
            $uri = $r->getUri();
            if (isset($seen[$uri]) && isset($properties[$uri])) {
                $properties[$uri]->setTransitive(true);
                continue;
            }
            if ($this->isStandardUri($uri)) continue;
            $seen[$uri] = true;
            $prop = $this->resourceToProperty($r, 'object');
            $prop->setTransitive(true);
            $properties[$uri] = $prop;
        }

        // Propriétés RDFS (rdf:Property)
        foreach ($this->graph->allOfType('rdf:Property') as $r) {
            if ($r->isBNode()) continue;
            $uri = $r->getUri();
            if ($this->isStandardUri($uri) || isset($seen[$uri])) continue;
            $seen[$uri] = true;
            $properties[$uri] = $this->resourceToProperty($r, 'rdf');
        }

        return $properties;
    }

    private function resourceToProperty(Resource $resource, string $type): PropertyModel
    {
        $uri = $resource->getUri();
        $label = $this->getLabel($resource);

        $domain = '';
        if ($d = $resource->get('rdfs:domain')) {
            $domain = $d instanceof Resource && !$d->isBNode() ? $d->getUri() : '';
        }

        $range = '';
        if ($r = $resource->get('rdfs:range')) {
            $range = $r instanceof Resource && !$r->isBNode() ? $r->getUri() : '';
        }

        $prop = new PropertyModel($uri, $label, $domain, $range);
        $prop->setPropertyType($type);
        $prop->setComment($this->getComment($resource));

        // Propriété inverse
        if ($inv = $resource->get('owl:inverseOf')) {
            if ($inv instanceof Resource && !$inv->isBNode()) {
                $prop->setInverseOf($inv->getUri());
            }
        }

        // Sous-propriété
        foreach ($resource->all('rdfs:subPropertyOf') as $parent) {
            if ($parent instanceof Resource && !$parent->isBNode()) {
                $prop->addSuperProperty($parent->getUri());
            }
        }

        // Caractéristiques
        if ($resource->isA('owl:TransitiveProperty')) {
            $prop->setTransitive(true);
        }
        if ($resource->isA('owl:ReflexiveProperty')) {
            $prop->setReflexive(true);
        }
        if ($resource->isA('owl:IrreflexiveProperty')) {
            $prop->setIrreflexive(true);
        }

        return $prop;
    }

    // ========== HIÉRARCHIE ==========

    /**
     * Construire l'arbre hiérarchique des classes à partir d'un concept racine
     */
    public function getClassHierarchy(?string $rootUri = null, int $depth = -1): array
    {
        $classes = $this->getClasses();

        // Construire la map parent → enfants
        $childrenMap = [];
        $roots = [];

        foreach ($classes as $uri => $concept) {
            $parents = $concept->getParentUris();
            if (empty($parents)) {
                $roots[] = $uri;
            }
            foreach ($parents as $parentUri) {
                $childrenMap[$parentUri][] = $uri;
            }
        }

        // Si une racine spécifique est demandée
        if ($rootUri !== null && isset($classes[$rootUri])) {
            return $this->buildTree($rootUri, $classes, $childrenMap, $depth);
        }

        // Construire la forêt complète
        $forest = [];
        foreach ($roots as $rootUri) {
            $forest[] = $this->buildTree($rootUri, $classes, $childrenMap, $depth);
        }

        // Si une seule racine, la retourner directement
        if (count($forest) === 1) {
            return $forest[0];
        }

        // Regrouper les racines multiples sous owl:Thing
        return [
            'uri' => NS_OWL . 'Thing',
            'name' => 'owl:Thing',
            'comment' => '',
            'restrictions' => [],
            'children' => $forest,
        ];
    }

    private function buildTree(string $uri, array $classes, array $childrenMap, int $depth, int $currentDepth = 0): array
    {
        $concept = $classes[$uri] ?? null;
        $node = [
            'uri' => $uri,
            'name' => $concept ? $concept->getLabel() : $this->localName($uri),
            'comment' => $concept ? $concept->getComment() : '',
            'restrictions' => $concept ? $concept->getRestrictions() : [],
            'children' => [],
        ];

        if ($depth !== -1 && $currentDepth >= $depth) {
            return $node;
        }

        $childUris = $childrenMap[$uri] ?? [];
        sort($childUris);
        foreach ($childUris as $childUri) {
            $node['children'][] = $this->buildTree($childUri, $classes, $childrenMap, $depth, $currentDepth + 1);
        }

        return $node;
    }

    /**
     * Construire l'arbre hiérarchique des propriétés
     */
    public function getPropertyHierarchy(?string $rootUri = null): array
    {
        $properties = $this->getProperties();

        $childrenMap = [];
        $roots = [];

        foreach ($properties as $uri => $prop) {
            $supers = $prop->getSuperProperties();
            if (empty($supers)) {
                $roots[] = $uri;
            }
            foreach ($supers as $parentUri) {
                $childrenMap[$parentUri][] = $uri;
            }
        }

        if ($rootUri !== null && isset($properties[$rootUri])) {
            return $this->buildPropertyTree($rootUri, $properties, $childrenMap);
        }

        $forest = [];
        foreach ($roots as $rUri) {
            $forest[] = $this->buildPropertyTree($rUri, $properties, $childrenMap);
        }

        return $forest;
    }

    private function buildPropertyTree(string $uri, array $properties, array $childrenMap): array
    {
        $prop = $properties[$uri] ?? null;
        $node = [
            'uri' => $uri,
            'name' => $prop ? $prop->getLabel() : $this->localName($uri),
            'type' => $prop ? $prop->getPropertyType() : 'unknown',
            'domain' => $prop ? $this->localName($prop->getDomain()) : '',
            'range' => $prop ? $this->localName($prop->getRange()) : '',
            'transitive' => $prop ? $prop->isTransitive() : false,
            'inverseOf' => $prop ? $this->localName($prop->getInverseOf()) : '',
            'children' => [],
        ];

        foreach ($childrenMap[$uri] ?? [] as $childUri) {
            $node['children'][] = $this->buildPropertyTree($childUri, $properties, $childrenMap);
        }

        return $node;
    }

    /**
     * Récupérer les propriétés applicables à un concept (correspondance de domaine + restrictions)
     */
    public function getPropertiesForConcept(string $conceptUri): array
    {
        $properties = $this->getProperties();
        $classes = $this->getClasses();
        $result = [];

        // Récupérer tous les ancêtres du concept (pour la correspondance de domaine)
        $ancestors = $this->getAncestors($conceptUri, $classes);
        $ancestors[] = $conceptUri;

        foreach ($properties as $uri => $prop) {
            $domain = $prop->getDomain();
            if ($domain === '' || in_array($domain, $ancestors)) {
                $result[$uri] = [
                    'uri' => $uri,
                    'name' => $prop->getLabel(),
                    'type' => $prop->getPropertyType(),
                    'domain' => $this->localName($domain),
                    'range' => $this->localName($prop->getRange()),
                    'transitive' => $prop->isTransitive(),
                    'inverseOf' => $this->localName($prop->getInverseOf()),
                ];
            }
        }

        // Ajouter aussi les restrictions du concept lui-même
        $concept = $classes[$conceptUri] ?? null;
        if ($concept) {
            foreach ($concept->getRestrictions() as $r) {
                $propUri = $r['property'] ?? '';
                if ($propUri && !isset($result[$propUri])) {
                    $result[$propUri] = [
                        'uri' => $propUri,
                        'name' => $r['propertyLabel'] ?? $this->localName($propUri),
                        'type' => 'restriction',
                        'domain' => $this->localName($conceptUri),
                        'range' => $r['valueLabel'] ?? '',
                        'restriction' => $r['type'] ?? '',
                    ];
                }
            }
        }

        return array_values($result);
    }

    private function getAncestors(string $uri, array $classes, array &$visited = []): array
    {
        if (isset($visited[$uri])) return [];
        $visited[$uri] = true;

        $ancestors = [];
        $concept = $classes[$uri] ?? null;
        if (!$concept) return [];

        foreach ($concept->getParentUris() as $parentUri) {
            $ancestors[] = $parentUri;
            $ancestors = array_merge($ancestors, $this->getAncestors($parentUri, $classes, $visited));
        }

        return $ancestors;
    }

    /**
     * Vue combinée : hiérarchie des classes + propriétés le long de la chaîne
     */
    public function getCombinedView(string $conceptUri, int $depth = 2): array
    {
        $hierarchy = $this->getClassHierarchy($conceptUri, $depth);
        $properties = $this->getPropertiesForConcept($conceptUri);

        // Enrichir les noeuds de la hiérarchie avec leurs propriétés
        $this->enrichWithProperties($hierarchy);

        return [
            'hierarchy' => $hierarchy,
            'properties' => $properties,
        ];
    }

    private function enrichWithProperties(array &$node): void
    {
        $node['properties'] = $this->getPropertiesForConcept($node['uri']);
        foreach ($node['children'] as &$child) {
            $this->enrichWithProperties($child);
        }
    }

    // ========== DONNÉES GRAPHE FORCE ==========

    /**
     * Récupérer les données formatées pour le graphe force-directed
     */
    public function getForceData(?string $rootUri = null, int $depth = -1): array
    {
        $classes = $this->getClasses();
        $properties = $this->getProperties();
        $nodes = [];
        $links = [];

        // Si enraciné, inclure seulement les descendants
        $includeUris = null;
        if ($rootUri !== null) {
            $includeUris = $this->getDescendants($rootUri, $classes);
            $includeUris[] = $rootUri;
        }

        foreach ($classes as $uri => $concept) {
            if ($includeUris !== null && !in_array($uri, $includeUris)) continue;
            $nodes[] = [
                'id' => $uri,
                'label' => $concept->getLabel(),
                'group' => $this->getFamily($uri, $classes),
            ];

            foreach ($concept->getParentUris() as $parentUri) {
                if ($includeUris !== null && !in_array($parentUri, $includeUris)) continue;
                $links[] = [
                    'source' => $parentUri,
                    'target' => $uri,
                    'label' => 'subClassOf',
                    'type' => 'inheritance',
                ];
            }

            // Ajouter les liens basés sur les restrictions
            foreach ($concept->getRestrictions() as $r) {
                if (isset($r['value']) && isset($classes[$r['value']])) {
                    if ($includeUris !== null && !in_array($r['value'], $includeUris)) continue;
                    $links[] = [
                        'source' => $uri,
                        'target' => $r['value'],
                        'label' => $r['propertyLabel'] ?? '',
                        'type' => 'property',
                    ];
                }
            }
        }

        return ['nodes' => $nodes, 'links' => $links];
    }

    private function getDescendants(string $uri, array $classes): array
    {
        $childrenMap = [];
        foreach ($classes as $cUri => $concept) {
            foreach ($concept->getParentUris() as $pUri) {
                $childrenMap[$pUri][] = $cUri;
            }
        }

        $descendants = [];
        $queue = $childrenMap[$uri] ?? [];
        while (!empty($queue)) {
            $current = array_shift($queue);
            if (in_array($current, $descendants)) continue;
            $descendants[] = $current;
            foreach ($childrenMap[$current] ?? [] as $child) {
                $queue[] = $child;
            }
        }

        return $descendants;
    }

    /**
     * Récupérer la famille racine (ancêtre de plus haut niveau) pour la coloration
     */
    private function getFamily(string $uri, array $classes): string
    {
        $concept = $classes[$uri] ?? null;
        if (!$concept || empty($concept->getParentUris())) {
            return $this->localName($uri);
        }

        $parent = $concept->getParentUris()[0];
        return $this->getFamily($parent, $classes);
    }

    // ========== UTILITAIRES ==========

    private function getLabel(Resource $resource): string
    {
        // Chercher le label (priorité : FR, EN, puis n'importe lequel)
        $label = $resource->label('fr') ?? $resource->label('en') ?? $resource->label();
        if ($label) return (string) $label;

        return $this->localName($resource->getUri());
    }

    private function getComment(Resource $resource): string
    {
        $comment = $resource->get('rdfs:comment');
        return $comment ? (string) $comment : '';
    }

    public function localName(string $uri): string
    {
        if (empty($uri)) return '';

        if (($pos = strrpos($uri, '#')) !== false) {
            return substr($uri, $pos + 1);
        }
        if (($pos = strrpos($uri, '/')) !== false) {
            return substr($uri, $pos + 1);
        }

        return $uri;
    }

    private function getNamespace(string $uri): string
    {
        if (($pos = strrpos($uri, '#')) !== false) {
            return substr($uri, 0, $pos + 1);
        }
        if (($pos = strrpos($uri, '/')) !== false) {
            return substr($uri, 0, $pos + 1);
        }
        return $uri;
    }

    private function isStandardUri(string $uri): bool
    {
        return str_starts_with($uri, NS_OWL)
            || str_starts_with($uri, NS_RDFS)
            || str_starts_with($uri, NS_RDF)
            || str_starts_with($uri, NS_XSD);
    }

    /**
     * Lister les fichiers ontologie disponibles
     */
    public static function listAvailableFiles(): array
    {
        $files = [];
        $dir = DATA_PATH;

        if (!is_dir($dir)) return $files;

        foreach (scandir($dir) as $file) {
            if ($file === '.' || $file === '..') continue;
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array($ext, SUPPORTED_FORMATS)) {
                $files[] = [
                    'name' => $file,
                    'path' => $dir . '/' . $file,
                    'size' => filesize($dir . '/' . $file),
                    'format' => $ext,
                ];
            }
        }

        return $files;
    }
}
