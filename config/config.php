<?php

declare(strict_types=1);

define('BASE_PATH', dirname(__DIR__));
define('DATA_PATH', BASE_PATH . '/data');
define('UPLOAD_PATH', DATA_PATH);

// Formats d'ontologie supportés
define('SUPPORTED_FORMATS', ['owl', 'rdf', 'rdfs', 'xml', 'jsonld', 'json']);

// Namespaces utilisés pour les ontologies
define('NS_OWL', 'http://www.w3.org/2002/07/owl#');
define('NS_RDFS', 'http://www.w3.org/2000/01/rdf-schema#');
define('NS_RDF', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
define('NS_XSD', 'http://www.w3.org/2001/XMLSchema#');
