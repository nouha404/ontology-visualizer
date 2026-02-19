<?php

declare(strict_types=1);

class ConceptModel
{
    private string $uri;
    private string $label;
    private string $comment = '';
    private array $parentUris = [];
    private array $children = [];
    private array $restrictions = [];

    public function __construct(string $uri, string $label)
    {
        $this->uri = $uri;
        $this->label = $label;
    }

    public function getUri(): string
    {
        return $this->uri;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function getComment(): string
    {
        return $this->comment;
    }

    public function setComment(string $comment): void
    {
        $this->comment = $comment;
    }

    public function getParentUris(): array
    {
        return $this->parentUris;
    }

    public function setParentUris(array $parentUris): void
    {
        $this->parentUris = $parentUris;
    }

    public function getChildren(): array
    {
        return $this->children;
    }

    public function addChild(ConceptModel $child): void
    {
        $this->children[] = $child;
    }

    public function getRestrictions(): array
    {
        return $this->restrictions;
    }

    public function setRestrictions(array $restrictions): void
    {
        $this->restrictions = $restrictions;
    }

    public function toArray(): array
    {
        return [
            'uri' => $this->uri,
            'label' => $this->label,
            'comment' => $this->comment,
            'parents' => $this->parentUris,
            'restrictions' => $this->restrictions,
        ];
    }
}
