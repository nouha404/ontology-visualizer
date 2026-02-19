<?php

declare(strict_types=1);

class ApiController
{
    private OntologyParser $parser;

    public function handle(): void
    {
        header('Content-Type: application/json; charset=utf-8');

        $endpoint = $_GET['endpoint'] ?? '';
        $fileName = $_GET['file'] ?? '';

        if (empty($fileName)) {
            $this->error('Missing file parameter');
            return;
        }

        $filePath = DATA_PATH . '/' . basename($fileName);
        if (!file_exists($filePath)) {
            $this->error('File not found');
            return;
        }

        $this->parser = new OntologyParser();
        $this->parser->loadFile($filePath);

        match ($endpoint) {
            'classes'            => $this->getClasses(),
            'properties'         => $this->getProperties(),
            'hierarchy'          => $this->getHierarchy(),
            'property-hierarchy' => $this->getPropertyHierarchy(),
            'concept-properties' => $this->getConceptProperties(),
            'combined'           => $this->getCombined(),
            'force'              => $this->getForce(),
            default              => $this->error('Unknown endpoint'),
        };
    }

    private function getClasses(): void
    {
        $classes = $this->parser->getClasses();
        $result = [];
        foreach ($classes as $c) {
            $result[] = $c->toArray();
        }
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    }

    private function getProperties(): void
    {
        $properties = $this->parser->getProperties();
        $result = [];
        foreach ($properties as $p) {
            $result[] = $p->toArray();
        }
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    }

    private function getHierarchy(): void
    {
        $concept = $_GET['concept'] ?? null;
        $depth = isset($_GET['depth']) ? (int) $_GET['depth'] : -1;
        echo json_encode(
            $this->parser->getClassHierarchy($concept ?: null, $depth),
            JSON_UNESCAPED_UNICODE
        );
    }

    private function getPropertyHierarchy(): void
    {
        $property = $_GET['property'] ?? null;
        echo json_encode(
            $this->parser->getPropertyHierarchy($property ?: null),
            JSON_UNESCAPED_UNICODE
        );
    }

    private function getConceptProperties(): void
    {
        $concept = $_GET['concept'] ?? '';
        if (empty($concept)) {
            $this->error('Missing concept parameter');
            return;
        }
        echo json_encode(
            $this->parser->getPropertiesForConcept($concept),
            JSON_UNESCAPED_UNICODE
        );
    }

    private function getCombined(): void
    {
        $concept = $_GET['concept'] ?? '';
        $depth = isset($_GET['depth']) ? (int) $_GET['depth'] : 2;
        if (empty($concept)) {
            $this->error('Missing concept parameter');
            return;
        }
        echo json_encode(
            $this->parser->getCombinedView($concept, $depth),
            JSON_UNESCAPED_UNICODE
        );
    }

    private function getForce(): void
    {
        $concept = $_GET['concept'] ?? null;
        $depth = isset($_GET['depth']) ? (int) $_GET['depth'] : -1;
        echo json_encode(
            $this->parser->getForceData($concept ?: null, $depth),
            JSON_UNESCAPED_UNICODE
        );
    }

    private function error(string $message): void
    {
        http_response_code(400);
        echo json_encode(['error' => $message]);
    }
}
