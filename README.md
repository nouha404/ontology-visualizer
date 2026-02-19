# Visualiseur d'Ontologies OWL/RDFS — PHP 8 MVC + D3.js

Visualiseur interactif d'ontologies OWL et RDFS. Charge des fichiers ontologiques (RDF/XML, JSON-LD, RDFS), extrait les classes, propriétés et hiérarchies avec EasyRDF, et les affiche sous forme de graphes interactifs avec D3.js v7.

Testé sur 4 ontologies de domaines différents :

| Fichier | Domaine | Format | Classes | Propriétés |
|---------|---------|--------|---------|------------|
| AfricanWildlifeOntology1.owl | Faune africaine | RDF/XML | 30 | 5 |
| bckmJSON.owl | Cancer du sein (médical) | JSON-LD | 628 | 46 |
| human_2007_09_11.rdfs | Relations familiales | RDFS | 8 | 14 |
| test_simple.owl | Ontologie simple en français | RDF/XML | 10 | 7 |

---

## Table des matières

- [1. Concepts : comprendre les ontologies](#1-concepts--comprendre-les-ontologies)
  - [1.1 Qu'est-ce qu'une ontologie ?](#11-quest-ce-quune-ontologie-)
  - [1.2 Les formats RDF/XML, JSON-LD, RDFS](#12-les-formats-rdfxml-json-ld-rdfs)
  - [1.3 Vocabulaire clé (owl:Class, rdfs:subClassOf, etc.)](#13-vocabulaire-clé-owlclass-rdfssubclassof-etc)
- [2. Analyse des 4 fichiers ontologiques](#2-analyse-des-4-fichiers-ontologiques)
  - [2.1 AfricanWildlifeOntology1.owl](#21-africanwildlifeontology1owl)
  - [2.2 bckmJSON.owl](#22-bckmjsonowl)
  - [2.3 human_2007_09_11.rdfs](#23-human_2007_09_11rdfs)
  - [2.4 test_simple.owl](#24-test_simpleowl--le-fichier-simple-en-français)
  - [2.5 Le défi : des formats et structures différents](#25-le-défi--des-formats-et-structures-différents)
- [3. Choix d'architecture](#3-choix-darchitecture)
  - [3.1 Pourquoi PHP 8 en MVC ?](#31-pourquoi-php-8-en-mvc-)
  - [3.2 Pourquoi EasyRDF ?](#32-pourquoi-easyrdf-)
  - [3.3 Pourquoi D3.js ?](#33-pourquoi-d3js-)
- [4. Structure du projet](#4-structure-du-projet)
- [5. Installation et lancement](#5-installation-et-lancement)
- [6. Le backend : OntologyParser](#6-le-backend--ontologyparser)
  - [6.1 Chargement et détection du format](#61-chargement-et-détection-du-format)
  - [6.2 Extraction des classes (owl:Class + rdfs:Class)](#62-extraction-des-classes-owlclass--rdfsclass)
  - [6.3 Conversion en ConceptModel](#63-conversion-en-conceptmodel)
  - [6.4 Extraction des restrictions OWL](#64-extraction-des-restrictions-owl)
  - [6.5 Extraction des propriétés](#65-extraction-des-propriétés)
  - [6.6 Construction de la hiérarchie des classes](#66-construction-de-la-hiérarchie-des-classes)
  - [6.7 Construction de la hiérarchie des propriétés](#67-construction-de-la-hiérarchie-des-propriétés)
  - [6.8 Propriétés d'un concept (domain matching)](#68-propriétés-dun-concept-domain-matching)
  - [6.9 Vue combinée](#69-vue-combinée)
  - [6.10 Données force-directed (nodes/links)](#610-données-force-directed-nodeslinks)
  - [6.11 Labels multilingues](#611-labels-multilingues)
- [7. Les modèles de données](#7-les-modèles-de-données)
  - [7.1 ConceptModel](#71-conceptmodel)
  - [7.2 PropertyModel](#72-propertymodel)
  - [7.3 GraphDataModel](#73-graphdatamodel)
- [8. Les contrôleurs et l'API JSON](#8-les-contrôleurs-et-lapi-json)
  - [8.1 Le routeur (public/index.php)](#81-le-routeur-publicindexphp)
  - [8.2 OntologyController](#82-ontologycontroller)
  - [8.3 VisualizationController](#83-visualizationcontroller)
  - [8.4 ApiController — les 7 endpoints](#84-apicontroller--les-7-endpoints)
- [9. Le frontend : les vues PHP](#9-le-frontend--les-vues-php)
  - [9.1 layout.php — le template de base](#91-layoutphp--le-template-de-base)
  - [9.2 home.php — page d'accueil](#92-homephp--page-daccueil)
  - [9.3 visualization.php — page principale](#93-visualizationphp--page-principale)
- [10. Les 4 visualisations D3.js](#10-les-4-visualisations-d3js)
  - [10.1 Collapse — arbre dépliable horizontal](#101-collapse--arbre-dépliable-horizontal)
  - [10.2 Radial — arbre radial collapsible](#102-radial--arbre-radial-collapsible)
  - [10.3 Coupe — cercles imbriqués zoomables](#103-coupe--cercles-imbriqués-zoomables)
  - [10.4 Force — graphe force-directed](#104-force--graphe-force-directed)
- [11. StateManager — gestion de l'état](#11-statemanager--gestion-de-létat)
- [12. ColorManager — couleurs par famille](#12-colormanager--couleurs-par-famille)
- [13. app.js — le contrôleur JavaScript principal](#13-appjs--le-contrôleur-javascript-principal)
  - [13.1 Initialisation et auto-reload](#131-initialisation-et-auto-reload)
  - [13.2 loadData() — le flux de chargement](#132-loaddata--le-flux-de-chargement)
  - [13.3 showInfo() — panneau de détails](#133-showinfo--panneau-de-détails)
- [14. Les 5 fonctionnalités obligatoires](#14-les-5-fonctionnalités-obligatoires)
- [15. Flux complet : du clic au rendu](#15-flux-complet--du-clic-au-rendu)

---

## 1. Concepts : comprendre les ontologies

### 1.1 Qu'est-ce qu'une ontologie ?

Une ontologie est une manière de décrire un domaine de connaissance de façon structurée. Ou encore, c'est l'étude de l'être en tant qu'être.
On définit :
- Des **classes** (les concepts) : Animal, Person, Plant...
- Des **propriétés** (les relations entre concepts) : eats, hasParent, has-part...
- Des **hiérarchies** (qui hérite de quoi) : carnivore est un sous-type d'animal

**Exemple concret :** dans l'ontologie AfricanWildlife, la classe `animal` a une sous-classe `carnivore`, qui a elle-même une sous-classe `lion`. La propriété `eats` relie un animal à ce qu'il mange.

### 1.2 Les formats RDF/XML, JSON-LD, RDFS

**RDF/XML** : du XML avec des balises RDF. C'est le format le plus courant pour `.owl` et `.rdfs`. Exemple :

```xml
<owl:Class rdf:about="&AfricanWildlifeOntology1;lion">
    <rdfs:subClassOf rdf:resource="&AfricanWildlifeOntology1;animal"/>
</owl:Class>
```

**JSON-LD** : du JSON avec des annotations sémantiques (`@id`, `@type`). On le reconnaît parce que le fichier commence par `[` ou `{`. Exemple :

```json
{
  "@id" : "http://desiree-project.eu/bckm#PatientEntity",
  "@type" : [ "http://www.w3.org/2002/07/owl#Class" ]
}
```

**RDFS** : un sous-ensemble plus simple d'OWL, utilisant `rdfs:Class` au lieu de `owl:Class` et `rdf:Property` au lieu de `owl:ObjectProperty`.

### 1.3 Vocabulaire clé (owl:Class, rdfs:subClassOf, etc.)

| Terme | Signification | Utilisé dans |
|-------|---------------|--------------|
| `owl:Class` | Définit une classe OWL | AfricanWildlife, bckmJSON |
| `rdfs:Class` | Définit une classe RDFS | human |
| `rdfs:subClassOf` | Relation d'héritage entre classes | Les 3 fichiers |
| `owl:ObjectProperty` | Propriété reliant deux classes | AfricanWildlife, bckmJSON |
| `owl:DatatypeProperty` | Propriété vers un type simple (string, int) | bckmJSON |
| `rdf:Property` | Propriété RDFS simple | human |
| `rdfs:subPropertyOf` | Hiérarchie de propriétés | human |
| `owl:Restriction` | Contrainte sur une propriété | AfricanWildlife, bckmJSON |
| `owl:inverseOf` | Deux propriétés inverses (eats ↔ eaten-by) | AfricanWildlife |
| `owl:TransitiveProperty` | Propriété transitive (A→B→C ⟹ A→C) | AfricanWildlife |
| `owl:someValuesFrom` | "au moins un" (restriction) | AfricanWildlife, bckmJSON |
| `owl:allValuesFrom` | "seulement" (restriction) | AfricanWildlife |

---

## 2. Analyse des 3 fichiers ontologiques

### 2.1 AfricanWildlifeOntology1.owl

- **Format :** RDF/XML (OWL 2)
- **Namespace :** `http://www.meteck.org/teaching/ontologies/AfricanWildlifeOntology1.owl#`
- **30 classes, 5 propriétés**

Hiérarchie des classes :

```
animal
├── carnivore
│   └── lion
├── herbivore
│   ├── Elephant
│   └── giraffe
├── Omnivore
├── Impala, RockDassie, Warthog

plant
├── CarnivorousPlant, Grass, Palmtree
├── tasty-plant, tree, leaf

PlantParts
├── FruitingBody (Berry, Apple)
├── Phloem, Root, Stem, Twig, Xylem, branch
```

**Propriétés :** `eats` (inverse: `eaten-by`), `has-part` (transitive, inverse: `is-part-of`), `is-proper-part-of` (sous-propriété de `is-part-of`).

**Particularités :** restrictions OWL complexes. Le `lion` a une restriction `allValuesFrom` sur `eats` → `herbivore` (le lion mange **seulement** des herbivores) et une restriction `someValuesFrom` sur `eats` → `Impala` (le lion mange **au moins** des impalas).

### 2.2 bckmJSON.owl

- **Format :** JSON-LD
- **Namespace :** `http://desiree-project.eu/bckm#`
- **628 classes, 46 propriétés**

Grosse ontologie médicale (Breast Cancer Knowledge Model). Concepts : `PatientEntity`, `LesionEntity`, `BreastCancerProcedure`, des centaines de sous-types de traitements (ChemotherapyRegimen, AnastrozoleTherapy...).

**Particularité :** le format JSON-LD est complètement différent du XML. Mon parser détecte le format en lisant les premiers caractères du fichier.

### 2.3 human_2007_09_11.rdfs

- **Format :** RDFS (RDF Schema en XML)
- **Namespace :** `http://www.inria.fr/2007/09/11/humans.rdfs`
- **8 classes, 14 propriétés**

Hiérarchie :

```
Animal
├── Male → Man
├── Female → Woman
└── Person → Man, Woman, Lecturer, Researcher
```

**Particularités :**
- Utilise `rdfs:Class` au lieu de `owl:Class`
- Utilise `rdf:Property` au lieu de `owl:ObjectProperty`
- **Labels multilingues** (FR + EN) : "Man" s'affiche "homme", "Woman" s'affiche "femme"
- **Héritage multiple** : `Man` hérite de `Person` ET `Male`
- **Hiérarchie de propriétés** : `hasFather` → `hasParent` → `hasAncestor`

### 2.4 test_simple.owl — Le fichier simple en français

- **Format :** RDF/XML (OWL)
- **Namespace :** `http://example.org/test#`
- **10 classes, 7 propriétés** (4 ObjectProperty + 3 DatatypeProperty)

J'ai ajouté ce fichier pour avoir une **ontologie simple et compréhensible en français**. Les 3 autres fichiers sont en anglais ou très volumineux (628 classes pour bckmJSON). Quelqu'un qui découvre le projet pourrait avoir du mal à comprendre les concepts. Avec `test_simple.owl`, tout est en français avec des données du quotidien.

**Hiérarchie des classes :**

```
Être
├── Animal
│   ├── Mammifère
│   │   ├── Chien
│   │   └── Chat
│   └── Oiseau
│       └── Aigle
└── Plante
    ├── Arbre
    └── Fleur
```

Chaque classe a un label et un commentaire en français (ex : Mammifère = "Animal qui allaite ses petits").

**Propriétés ObjectProperty :**

| Propriété | Domain | Range | Particularité |
|-----------|--------|-------|---------------|
| `mange` | Animal | Être | Relation d'alimentation |
| `estMangePar` | — | — | `owl:inverseOf` mange |
| `habite` | Animal | — | Où vit l'animal |
| `amiAvec` | Animal | Animal | `owl:SymmetricProperty` |

**Propriétés DatatypeProperty :**

| Propriété | Domain | Range | Description |
|-----------|--------|-------|-------------|
| `nom` | Être | xsd:string | Le nom de l'être |
| `âge` | Animal | xsd:integer | L'âge de l'animal |
| `poids (kg)` | Animal | xsd:float | Le poids en kg |

**Pourquoi ce fichier est utile pour comprendre le projet :**

1. **Hiérarchie claire** : tout le monde sait qu'un Chien est un Mammifère qui est un Animal → c'est `rdfs:subClassOf` rendu concret
2. **ObjectProperty** : un Animal mange un Être → c'est `owl:ObjectProperty` avec `rdfs:domain` et `rdfs:range`
3. **DatatypeProperty** : un nom est un string, un âge est un integer → c'est la différence entre ObjectProperty et DatatypeProperty
4. **owl:inverseOf** : "mange" ↔ "estMangePar" — si le Chien mange la Plante, la Plante est mangée par le Chien
5. **owl:SymmetricProperty** : "amiAvec" — si le Chien est ami avec le Chat, le Chat est ami avec le Chien
6. **Tout en français** : labels, commentaires, noms de propriétés — pas besoin de traduire mentalement

C'est le fichier idéal pour une démonstration ou pour expliquer le fonctionnement du projet à quelqu'un qui ne connaît pas les ontologies.

### 2.5 Le défi : des formats et structures différents

| Élément | AfricanWildlife | bckmJSON | human | test_simple |
|---------|:---:|:---:|:---:|:---:|
| owl:Class | oui | oui | non (rdfs:Class) | oui |
| owl:ObjectProperty | oui | oui | non (rdf:Property) | oui |
| owl:DatatypeProperty | non | oui | non | oui |
| owl:Restriction | oui | oui | non | non |
| owl:inverseOf | oui | non | non | oui |
| owl:TransitiveProperty | oui | non | non | non |
| owl:SymmetricProperty | non | non | non | oui |
| rdfs:subPropertyOf | non | non | oui | non |
| Labels multilingues | non | non | oui (FR+EN) | oui (FR) |
| Format | RDF/XML | JSON-LD | RDF/XML | RDF/XML |

Le parser doit gérer **tous ces cas** de manière unifiée.

---

## 3. Choix d'architecture

### 3.1 Pourquoi PHP 8 en MVC ?

Le MVC (Model-View-Controller) sépare la logique :

- **Models** : logique métier (parser EasyRDF, concepts, propriétés)
- **Views** : affichage HTML (templates PHP)
- **Controllers** : lien entre les deux (routing, API JSON)

PHP 8 apporte `match()` (remplace switch/case), les typed properties, et `str_starts_with()` utilisé dans le parser.

### 3.2 Pourquoi EasyRDF ?

EasyRDF est la bibliothèque PHP de référence pour parser du RDF. Elle supporte RDF/XML nativement et JSON-LD via `ml/json-ld`. Après le parsing, on accède aux données simplement :

```php
$graph->allOfType('owl:Class');       // toutes les classes OWL
$resource->all('rdfs:subClassOf');    // tous les parents
$resource->label('fr');               // label en français
$resource->get('owl:inverseOf');      // propriété inverse
```

Sans EasyRDF, il faudrait parser le XML avec DOMDocument et le JSON-LD manuellement.

### 3.3 Pourquoi D3.js ?

D3.js v7 fournit les layouts nécessaires :

- `d3.tree()` : arbres (collapse, radial)
- `d3.pack()` : cercles imbriqués (coupe)
- `d3.forceSimulation()` : simulation physique (force-directed)
- `d3.zoom()` : zoom et pan
- `d3.hierarchy()` : conversion JSON → hiérarchie navigable

---

## 4. Structure du projet

```
project/
├── composer.json              ← dépendances (easyrdf, ml/json-ld)
├── config/
│   └── config.php             ← constantes, chemins, namespaces
├── controllers/
│   ├── OntologyController.php ← page d'accueil, upload
│   ├── VisualizationController.php ← page de visualisation
│   └── ApiController.php      ← 7 endpoints JSON
├── models/
│   ├── OntologyParser.php     ← coeur : parsing EasyRDF
│   ├── ConceptModel.php       ← modèle de classe/concept
│   ├── PropertyModel.php      ← modèle de propriété
│   └── GraphDataModel.php     ← formatage pour D3.js
├── views/
│   ├── layout.php             ← template de base (dark theme)
│   ├── home.php               ← accueil (upload + liste fichiers)
│   └── visualization.php      ← page principale (sidebar + graphe)
├── public/
│   ├── index.php              ← point d'entrée + routeur
│   ├── css/style.css          ← styles dark theme
│   └── js/
│       ├── app.js             ← contrôleur JS principal
│       ├── stateManager.js    ← persistance de l'état
│       ├── colorManager.js    ← palette de couleurs par famille
│       └── graphs/
│           ├── collapse.js    ← arbre dépliable
│           ├── radial.js      ← arbre radial collapsible
│           ├── coupe.js       ← cercles imbriqués zoomables
│           └── force.js       ← graphe force-directed
└── data/                      ← fichiers ontologie
    ├── AfricanWildlifeOntology1.owl
    ├── bckmJSON.owl
    ├── human_2007_09_11.rdfs
    └── test_simple.owl
```

---

## 5. Installation et lancement

**Prérequis :** PHP 8.0+, Composer

```bash
# 1. Installer les dépendances
composer install

# 2. Lancer le serveur
php -S localhost:8000 -t public

# 3. Ouvrir http://localhost:8000
```

Le `composer.json` installe :
- **easyrdf/easyrdf** `^1.1` : parsing RDF/XML
- **ml/json-ld** `^1.2` : support JSON-LD (requis par EasyRDF pour bckmJSON.owl)

> **Note :** Sans `ml/json-ld`, le parsing de bckmJSON.owl échoue avec `Class "ML\JsonLD\JsonLD" not found`.

> **Note :** EasyRDF 1.1 génère des warnings `Deprecated` sur PHP 8. C'est supprimé dans `index.php` avec `error_reporting(E_ALL & ~E_DEPRECATED)`.

---

## 6. Le backend : OntologyParser

Le fichier `models/OntologyParser.php` est le coeur du projet. Il gère tout le parsing et la structuration des données.

### 6.1 Chargement et détection du format

```php
public function loadFile(string $filepath): void
{
    $this->graph = new Graph();
    $format = $this->detectFormat($filepath);
    $data = file_get_contents($filepath);
    $this->graph->parse($data, $format);
    $this->baseUri = $this->detectBaseUri();
}
```

**Détection du format :** on lit les 200 premiers caractères. Si ça commence par `[` ou `{` → JSON-LD. Sinon → RDF/XML.

```php
private function detectFormat(string $filepath): string
{
    $content = file_get_contents($filepath, false, null, 0, 200);
    if (str_starts_with(trim($content), '[') || str_starts_with(trim($content), '{')) {
        return 'jsonld';
    }
    return 'rdfxml';
}
```

**Détection du namespace :** on cherche d'abord un `owl:Ontology` dans le graphe. Sinon on prend le namespace le plus fréquent parmi les classes.

### 6.2 Extraction des classes (owl:Class + rdfs:Class)

```php
private function getAllClassResources(): array
{
    $resources = [];
    $seen = [];

    // owl:Class (AfricanWildlife, bckmJSON)
    foreach ($this->graph->allOfType('owl:Class') as $r) {
        if ($r->isBNode()) continue;
        $uri = $r->getUri();
        if (!isset($seen[$uri])) {
            $resources[] = $r;
            $seen[$uri] = true;
        }
    }

    // rdfs:Class (human)
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
```

**Pourquoi deux boucles :** AfricanWildlife et bckmJSON utilisent `owl:Class`, human utilise `rdfs:Class`. On cherche les deux.

**Pourquoi `isBNode()` :** un blank node (BNode) est un noeud anonyme créé par les restrictions OWL. Ce ne sont pas de vraies classes, on les ignore.

**Pourquoi `$seen` :** pour éviter les doublons si une classe apparaît dans les deux types.

### 6.3 Conversion en ConceptModel

```php
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
```

**Ce qui se passe :**
1. Récupère l'URI (identifiant unique)
2. Récupère le label (nom lisible, priorité FR)
3. Récupère le commentaire
4. Cherche tous les parents via `rdfs:subClassOf`
5. Filtre les BNodes (restrictions anonymes) et les URIs standard (`owl:Thing`, `rdfs:Class`...)
6. Extrait les restrictions OWL
7. Crée un `ConceptModel` avec toutes ces infos

**Pourquoi `isStandardUri()` :** je ne veux pas que `owl:Thing`, `rdfs:Class`, etc. apparaissent dans mon arbre. Ce sont des classes du vocabulaire RDF/OWL, pas des concepts métier.

### 6.4 Extraction des restrictions OWL

```php
private function parseRestriction(Resource $bnode): ?array
{
    $onProperty = $bnode->get('owl:onProperty');
    if (!$onProperty) return null;

    $restriction = [
        'property' => $onProperty->getUri(),
        'propertyLabel' => $this->localName($onProperty->getUri()),
    ];

    if ($sv = $bnode->get('owl:someValuesFrom')) {
        $restriction['type'] = 'someValuesFrom';
        // ...
    } elseif ($av = $bnode->get('owl:allValuesFrom')) {
        $restriction['type'] = 'allValuesFrom';
        // ...
    }

    return $restriction;
}
```

**Comment ça marche :** en OWL, quand un `rdfs:subClassOf` pointe vers un BNode de type `owl:Restriction`, c'est une contrainte. Par exemple dans le fichier :

```xml
<owl:Class rdf:about="&AfricanWildlifeOntology1;lion">
    <rdfs:subClassOf>
        <owl:Restriction>
            <owl:onProperty rdf:resource="&AfricanWildlifeOntology1;eats"/>
            <owl:allValuesFrom rdf:resource="&AfricanWildlifeOntology1;herbivore"/>
        </owl:Restriction>
    </rdfs:subClassOf>
</owl:Class>
```

→ **"le lion mange seulement des herbivores"**. Le parser extrait cette info pour l'afficher dans les tooltips.

### 6.5 Extraction des propriétés

La méthode `getProperties()` cherche 4 types différents :

1. **`owl:ObjectProperty`** : propriétés entre classes (eats, has-part)
2. **`owl:DatatypeProperty`** : propriétés vers des types simples (age → integer)
3. **`owl:TransitiveProperty`** : si une propriété est déjà trouvée, on met `transitive = true`
4. **`rdf:Property`** : propriétés RDFS simples (hasAncestor, hasFather)

Pour chaque propriété, on récupère aussi le domain, le range, l'inverse, les super-propriétés et les caractéristiques (transitive, réflexive, irréflexive).

### 6.6 Construction de la hiérarchie des classes

```php
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

    // Si un concept spécifique est demandé
    if ($rootUri !== null && isset($classes[$rootUri])) {
        return $this->buildTree($rootUri, $classes, $childrenMap, $depth);
    }

    // Sinon, construire la forêt complète
    // Si plusieurs racines, les regrouper sous owl:Thing
}
```

**Algorithme :**
1. Récupérer toutes les classes
2. Construire un `childrenMap` : pour chaque parent, la liste de ses enfants
3. Les classes sans parent sont les racines
4. Si un concept est demandé → arbre à partir de lui
5. Sinon → forêt complète
6. Plusieurs racines → noeud virtuel `owl:Thing`

Le paramètre `depth` contrôle la profondeur : `-1` = illimitée, `2` = deux niveaux sous la racine.

### 6.7 Construction de la hiérarchie des propriétés

Même algorithme que pour les classes, mais en utilisant `rdfs:subPropertyOf` au lieu de `rdfs:subClassOf`. Retourne un tableau de racines (propriétés sans parent).

### 6.8 Propriétés d'un concept (domain matching)

```php
public function getPropertiesForConcept(string $conceptUri): array
```

Trouve toutes les propriétés applicables à un concept donné :
1. Récupère les **ancêtres** du concept (pour le matching de domain hérité)
2. Pour chaque propriété, si son `domain` est vide ou correspond au concept ou à un ancêtre → on l'inclut
3. Ajoute aussi les propriétés issues des **restrictions OWL** du concept

### 6.9 Vue combinée

```php
public function getCombinedView(string $conceptUri, int $depth = 2): array
```

Construit la hiérarchie du concept ET enrichit chaque noeud avec ses propriétés. Retourne un objet `{ hierarchy, properties }`.

### 6.10 Données force-directed (nodes/links)

```php
public function getForceData(?string $rootUri = null, int $depth = -1): array
```

Retourne les données au format `{ nodes: [...], links: [...] }` pour D3 force. Les liens incluent les relations `subClassOf` (héritage) ET les restrictions OWL (propriétés).

### 6.11 Labels multilingues

```php
private function getLabel(Resource $resource): string
{
    $label = $resource->label('fr') ?? $resource->label('en') ?? $resource->label();
    if ($label) return (string) $label;
    return $this->localName($resource->getUri());
}
```

**Priorité :** français → anglais → n'importe quel label → nom local de l'URI. C'est grâce à ça que human affiche "homme" au lieu de "Man".

---

## 7. Les modèles de données

### 7.1 ConceptModel

Représente une classe/concept de l'ontologie.

| Attribut | Type | Description |
|----------|------|-------------|
| `uri` | string | Identifiant unique (ex: `http://...#animal`) |
| `label` | string | Nom lisible (ex: "animal") |
| `comment` | string | Description textuelle |
| `parentUris` | array | URIs des classes parentes |
| `restrictions` | array | Restrictions OWL (someValuesFrom, allValuesFrom) |

### 7.2 PropertyModel

Représente une propriété/relation de l'ontologie.

| Attribut | Type | Description |
|----------|------|-------------|
| `uri, label, comment` | string | Comme ConceptModel |
| `domain` | string | Classe source |
| `range` | string | Classe cible ou type |
| `propertyType` | string | "object", "datatype", ou "rdf" |
| `transitive` | bool | Propriété transitive ? |
| `reflexive` | bool | Propriété réflexive ? |
| `inverseOf` | string | URI de la propriété inverse |
| `superProperties` | array | Parents dans la hiérarchie |

### 7.3 GraphDataModel

Formate les données pour D3.js. Deux formats :

**Format arbre** (collapse, radial, coupe) :
```json
{
  "name": "animal",
  "uri": "http://...",
  "children": [
    { "name": "carnivore", "children": [] }
  ]
}
```

**Format force** (force-directed) :
```json
{
  "nodes": [{ "id": "uri", "label": "animal", "group": "root" }],
  "links": [{ "source": "uri1", "target": "uri2", "label": "subClassOf" }]
}
```

---

## 8. Les contrôleurs et l'API JSON

### 8.1 Le routeur (public/index.php)

```php
$action = $_GET['action'] ?? 'home';

match ($action) {
    'home'          => (new OntologyController())->index(),
    'upload'        => (new OntologyController())->upload(),
    'visualization' => (new VisualizationController())->show(),
    'api'           => (new ApiController())->handle(),
    default         => (new OntologyController())->index(),
};
```

Toutes les requêtes passent par `index.php`. Le paramètre `?action=` détermine quel contrôleur appeler.

### 8.2 OntologyController

- **`index()`** : affiche la page d'accueil avec la liste des fichiers disponibles
- **`upload()`** : gère l'upload d'un fichier OWL/RDFS, vérifie l'extension, sauvegarde dans `data/`

### 8.3 VisualizationController

- **`show()`** : reçoit `?file=`, charge l'ontologie avec OntologyParser, récupère classes et propriétés, passe tout à `visualization.php`

C'est ici que les **listes déroulantes** de la sidebar sont remplies côté PHP.

### 8.4 ApiController — les 7 endpoints

| Endpoint | Paramètres | Description |
|----------|------------|-------------|
| `classes` | file | Toutes les classes en JSON |
| `properties` | file | Toutes les propriétés en JSON |
| `hierarchy` | file, concept?, depth? | Arbre hiérarchique des classes |
| `property-hierarchy` | file, property? | Arbre hiérarchique des propriétés |
| `concept-properties` | file, concept | Propriétés applicables à un concept |
| `combined` | file, concept, depth? | Hiérarchie enrichie avec propriétés |
| `force` | file, concept?, depth? | Données nodes/links pour force graph |

**Exemple d'URL :**

```
?action=api&file=AfricanWildlifeOntology1.owl&endpoint=hierarchy&concept=http://...%23animal&depth=2
```

---

## 9. Le frontend : les vues PHP

### 9.1 layout.php — le template de base

Toutes les pages héritent de `layout.php` via `ob_start()` / `ob_get_clean()` :

```php
<?php $title = 'Ma page'; ?>
<?php ob_start(); ?>
    <!-- contenu de la page -->
<?php $content = ob_get_clean(); ?>
<?php require 'layout.php'; ?>
```

Dans `layout.php`, `$content` est injecté dans le HTML. D3.js est chargé depuis le CDN dans le `<head>`.

### 9.2 home.php — page d'accueil

Affiche une grille de fichiers (ontologies disponibles dans `data/`) et un formulaire d'upload. Chaque fichier est un lien cliquable vers la visualisation.

### 9.3 visualization.php — page principale

**Sidebar :**
- Select **Concept** : liste toutes les classes (rempli côté PHP)
- Select **Profondeur** : 1 à 5 ou illimitée
- Select **Mode** : héritage, propriétés, hiérarchie propriétés, combiné
- Select **Propriété** : pour la hiérarchie de propriétés
- Bouton **Visualiser**
- **Panneau d'info** : s'affiche au clic sur un noeud

**Zone principale :**
- **Barre d'outils** : 4 onglets (Collapse, Radial, Coupe, Force) + boutons zoom
- **Conteneur** `#graph-container` : zone de dessin D3.js

**Passage des données au JS :**

```html
<script>
    window.ONTO_FILE = <?= json_encode($fileName) ?>;
    window.API_BASE = '?action=api&file=' + encodeURIComponent(window.ONTO_FILE);
</script>
```

---

## 10. Les 4 visualisations D3.js

### 10.1 Collapse — arbre dépliable horizontal

**Fichier :** `public/js/graphs/collapse.js`

Arbre horizontal. Racine à gauche. Cliquer un noeud = déplier/replier ses enfants. Transitions animées.

**Fonctionnement :**
1. `d3.hierarchy(data)` convertit le JSON en hiérarchie
2. `d3.tree()` calcule les positions x,y
3. Les enfants de profondeur > 1 sont repliés (`_children` au lieu de `children`)
4. Au clic, on échange `children` ↔ `_children` et on rappelle `_update()`
5. `_update()` utilise le pattern **enter/update/exit** de D3 pour animer

**Pattern enter/update/exit :**
- **enter** : nouveaux noeuds → apparition animée depuis le parent
- **update** : noeuds existants → déplacement vers nouvelle position
- **exit** : noeuds supprimés → disparition animée vers le parent

**Couleurs :** chaque noeud est coloré selon sa famille (ancêtre racine). Noeud replié = couleur pleine (indique des enfants cachés). Noeud déplié/feuille = semi-transparent.

### 10.2 Radial — arbre radial collapsible

**Fichier :** `public/js/graphs/radial.js`

Même logique que Collapse mais en **coordonnées polaires**. Racine au centre, enfants en cercles concentriques.

**Différences avec Collapse :**
- Layout : `d3.tree().size([2 * Math.PI, radius])` — angle de 0 à 2π, rayon = profondeur
- Positions converties avec `rotate()` et `translate()`
- Liens : `d3.linkRadial()` au lieu de courbes de Bézier manuelles
- Cercles guides en pointillé pour montrer les niveaux
- Labels retournés à 180° côté gauche pour rester lisibles

**Interactivité identique :** clic = déplier/replier. Tooltip au survol (nom, commentaire, nb enfants, état replié/déplié).

### 10.3 Coupe — cercles imbriqués zoomables

**Fichier :** `public/js/graphs/coupe.js`

Racine = rectangle, sous-concepts = cercles imbriqués. **Zoomable circle packing** : cliquer un cercle pour zoomer dedans.

**Fonctionnement :**
1. `d3.hierarchy().sum(() => 1)` pour donner un poids à chaque noeud
2. `d3.pack()` calcule position et rayon de chaque cercle
3. Racine = rectangle SVG, tous les autres = cercles SVG

**Zoom interactif :**
- **Cliquer un cercle** → `_zoomTo(d)` : animation fluide, centre et agrandit ce cercle
- **Re-cliquer le même** → zoom out vers le parent
- **Cliquer le fond** → retour vue globale
- `d3.interpolateZoom` calcule la transition entre l'ancienne et la nouvelle vue
- Pendant la transition, tous les cercles et labels sont repositionnés et redimensionnés à chaque frame
- À la fin, les labels sont affichés/cachés selon la taille du cercle à l'écran

**Gestion des labels :** un label n'est visible que si son cercle est assez grand à l'écran. Quand on zoome, les enfants grandissent et leurs labels apparaissent → effet de **drill-down progressif**.

### 10.4 Force — graphe force-directed

**Fichier :** `public/js/graphs/force.js`

Les noeuds se repoussent, les liens les attirent. Placement automatique par simulation physique.

**Fonctionnement :**
1. Données au format `{ nodes, links }` (différent de l'arbre)
2. `d3.forceSimulation()` avec 4 forces :
   - **forceLink** : liens attirent les noeuds connectés (distance 100)
   - **forceManyBody** : noeuds se repoussent (strength -200)
   - **forceCenter** : attraction vers le centre
   - **forceCollide** : empêche la superposition (rayon 30)
3. À chaque tick, les positions sont mises à jour
4. Noeuds **draggables** : attraper et déplacer

**Types de liens :** héritage (trait plein) vs propriété/restriction (pointillé coloré).

**Destruction :** quand on quitte la vue Force, `ForceGraph.destroy()` arrête la simulation pour ne pas consommer du CPU en arrière-plan.

---

## 11. StateManager — gestion de l'état

**Fichier :** `public/js/stateManager.js`

**Problème :** quand on passe de Collapse à Radial, on ne veut pas perdre le concept sélectionné, la profondeur, et le mode.

**Solution :** stocker l'état dans un objet JS ET dans `sessionStorage` (persistance entre rechargements).

```javascript
StateManager.set('concept', 'http://...#animal');
StateManager.get('concept'); // 'http://...#animal'
```

- **`saveFormState()`** : lit les selects → sauvegarde. Appelé à chaque `loadData()`.
- **`restoreFormState()`** : remet les valeurs dans les selects + active le bon onglet. Appelé au `init()`.

---

## 12. ColorManager — couleurs par famille

**Fichier :** `public/js/colorManager.js`

Chaque concept appartient à une "famille" (son ancêtre racine). Tous les descendants de `animal` ont la même couleur, ceux de `plant` une autre.

**Palette de 16 couleurs :**

```javascript
palette: [
    '#6c8aff', '#4ecdc4', '#ff6b6b', '#ffd93d',
    '#a29bfe', '#fd79a8', '#00b894', '#e17055',
    '#0984e3', '#d63031', '#00cec9', '#fdcb6e',
    '#6c5ce7', '#fab1a0', '#55efc4', '#74b9ff',
]
```

- **`ColorManager.get(family)`** : retourne la couleur de cette famille (assignée à la première demande)
- **`ColorManager.getAlpha(family, 0.3)`** : même couleur avec opacité (pour feuilles et fonds)
- **`ColorManager.reset()`** : remet à zéro (appelé à chaque `loadData()`)

---

## 13. app.js — le contrôleur JavaScript principal

**Fichier :** `public/js/app.js`

Chef d'orchestre côté client. Connecte sidebar, API et 4 visualisations.

### 13.1 Initialisation et auto-reload

```javascript
init() {
    StateManager.restoreFormState();
    this.currentGraph = StateManager.get('graph', 'collapse');

    // Auto-reload : chaque changement de select déclenche loadData()
    ['select-concept', 'select-depth', 'select-mode', 'select-property'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => this.loadData());
    });

    this.loadData();
}
```

Plus besoin de cliquer "Visualiser" : chaque changement dans un select relance automatiquement la visualisation.

### 13.2 loadData() — le flux de chargement

1. Lire les valeurs des selects
2. Sauvegarder l'état (`StateManager.saveFormState()`)
3. Construire l'URL d'API selon le mode et le graphe actif
4. Appeler l'API en `fetch()` asynchrone
5. Transformer les données si nécessaire
6. Appeler `_renderCurrent()` pour dessiner

**Choix de l'endpoint selon le mode :**

| Mode | Endpoint API |
|------|-------------|
| hierarchy | `endpoint=hierarchy` |
| properties | `endpoint=concept-properties` → conversion en arbre |
| prop-hierarchy | `endpoint=property-hierarchy` |
| combined | `endpoint=combined` → enrichissement |
| (vue force) | `endpoint=force` (toujours, peu importe le mode) |

### 13.3 showInfo() — panneau de détails

Quand on clique un noeud dans n'importe quelle visualisation, `App.showInfo(data)` met à jour le panneau d'info dans la sidebar : nom, URI, commentaire, propriétés, restrictions.

---

## 14. Les 5 fonctionnalités obligatoires

| # | Fonctionnalité | Comment l'utiliser | Endpoint API |
|---|---|---|---|
| 1 | Héritage depuis un concept C | Sélectionner concept + profondeur, mode "Héritage" | `hierarchy` |
| 2 | Propriétés du concept C | Sélectionner concept, mode "Propriétés du concept" | `concept-properties` |
| 3 | Hiérarchie d'une propriété | Mode "Hiérarchie des propriétés", sélectionner propriété | `property-hierarchy` |
| 4 | Combiné (héritage + propriétés + chaîne P) | Sélectionner concept + profondeur, mode "Combiné" | `combined` |
| 5 | Changer de vue sans perdre l'état | Cliquer les onglets Collapse/Radial/Coupe/Force | StateManager |

---

## 15. Flux complet : du clic au rendu

```
Utilisateur ouvre http://localhost:8000
    │
    ▼
index.php → OntologyController::index()
    │  Liste les fichiers dans data/
    ▼
home.php affiche la grille de fichiers
    │
    │  Clic sur "test_simple.owl"
    ▼
index.php → VisualizationController::show()
    │  OntologyParser charge le fichier
    │  Extrait 10 classes + 7 propriétés
    ▼
visualization.php s'affiche
    │  Sidebar remplie (Être, Animal, Mammifère, Chien...)
    │  D3.js + graphs/*.js + app.js chargés
    ▼
App.init()
    │  Restaure l'état (StateManager)
    │  Bind les événements (selects, tabs, zoom)
    │  Appelle loadData()
    ▼
App.loadData()
    │  Lit les selects (concept=Être, depth=2, mode=hierarchy)
    │  Sauvegarde l'état
    │  fetch('?action=api&endpoint=hierarchy&concept=Être&depth=2')
    ▼
ApiController::handle()
    │  OntologyParser charge test_simple.owl
    │  Construit l'arbre : Être → Animal/Plante → ...
    │  echo json_encode(...)
    ▼
App reçoit le JSON
    │  ColorManager.reset()
    │  CollapseGraph.render(container, data)
    ▼
D3.js dessine le SVG
    │  Être au centre, Animal et Plante en branches
    │  Clic sur Animal → déplie Mammifère, Oiseau
    ▼
Utilisateur interagit
    │  Clic noeud → déplier/replier
    │  Change select → loadData() automatique
    │  Change onglet → re-render
    │  Mode "Propriétés" → voit mange, habite, amiAvec...
    │  État sauvé dans sessionStorage
```
