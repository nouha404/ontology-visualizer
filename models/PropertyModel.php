<?php

declare(strict_types=1);

class PropertyModel
{
    private string $uri;
    private string $label;
    private string $domain;
    private string $range;
    private string $comment = '';
    private string $propertyType = 'object'; // object, datatype, rdf
    private bool $transitive = false;
    private bool $reflexive = false;
    private bool $irreflexive = false;
    private string $inverseOf = '';
    private array $superProperties = [];
    private array $subProperties = [];

    public function __construct(string $uri, string $label, string $domain = '', string $range = '')
    {
        $this->uri = $uri;
        $this->label = $label;
        $this->domain = $domain;
        $this->range = $range;
    }

    public function getUri(): string { return $this->uri; }
    public function getLabel(): string { return $this->label; }
    public function getDomain(): string { return $this->domain; }
    public function getRange(): string { return $this->range; }
    public function getComment(): string { return $this->comment; }
    public function getPropertyType(): string { return $this->propertyType; }
    public function isTransitive(): bool { return $this->transitive; }
    public function isReflexive(): bool { return $this->reflexive; }
    public function isIrreflexive(): bool { return $this->irreflexive; }
    public function getInverseOf(): string { return $this->inverseOf; }
    public function getSuperProperties(): array { return $this->superProperties; }
    public function getSubProperties(): array { return $this->subProperties; }

    public function setComment(string $v): void { $this->comment = $v; }
    public function setPropertyType(string $v): void { $this->propertyType = $v; }
    public function setTransitive(bool $v): void { $this->transitive = $v; }
    public function setReflexive(bool $v): void { $this->reflexive = $v; }
    public function setIrreflexive(bool $v): void { $this->irreflexive = $v; }
    public function setInverseOf(string $v): void { $this->inverseOf = $v; }
    public function addSuperProperty(string $uri): void { $this->superProperties[] = $uri; }
    public function addSubProperty(string $uri): void { $this->subProperties[] = $uri; }

    public function toArray(): array
    {
        return [
            'uri' => $this->uri,
            'label' => $this->label,
            'domain' => $this->domain,
            'range' => $this->range,
            'comment' => $this->comment,
            'type' => $this->propertyType,
            'transitive' => $this->transitive,
            'reflexive' => $this->reflexive,
            'irreflexive' => $this->irreflexive,
            'inverseOf' => $this->inverseOf,
            'superProperties' => $this->superProperties,
        ];
    }
}
