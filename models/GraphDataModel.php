<?php

declare(strict_types=1);

/**
 * GraphDataModel - Formatage des données ontologiques pour les visualisations D3.js
 */
class GraphDataModel
{
    private array $nodes = [];
    private array $links = [];

    public function addNode(string $id, string $label, string $group = '', array $extra = []): void
    {
        $this->nodes[] = array_merge([
            'id' => $id,
            'label' => $label,
            'group' => $group,
        ], $extra);
    }

    public function addLink(string $source, string $target, string $label = '', string $type = 'default'): void
    {
        $this->links[] = [
            'source' => $source,
            'target' => $target,
            'label' => $label,
            'type' => $type,
        ];
    }

    public function getNodes(): array
    {
        return $this->nodes;
    }

    public function getLinks(): array
    {
        return $this->links;
    }

    public function toArray(): array
    {
        return [
            'nodes' => $this->nodes,
            'links' => $this->links,
        ];
    }

    public function toJson(): string
    {
        return json_encode($this->toArray(), JSON_UNESCAPED_UNICODE);
    }

    /**
     * Construire à partir de la hiérarchie du parseur (format arbre)
     */
    public static function fromHierarchy(array $tree): self
    {
        $model = new self();
        $model->walkTree($tree, null);
        return $model;
    }

    private function walkTree(array $node, ?string $parentId): void
    {
        $id = $node['uri'];
        $this->addNode($id, $node['name'], $node['group'] ?? '');

        if ($parentId !== null) {
            $this->addLink($parentId, $id, 'subClassOf', 'inheritance');
        }

        foreach ($node['children'] ?? [] as $child) {
            $this->walkTree($child, $id);
        }
    }
}
