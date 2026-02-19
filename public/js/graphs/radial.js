/**
 * Radial - Arbre radial collapsible
 * Racine au centre, enfants sur des cercles concentriques
 * CLIQUER un noeud pour déplier/replier ses enfants (animé)
 */
const RadialGraph = {
    svg: null,
    g: null,
    zoom: null,
    root: null,
    gLink: null,
    gNode: null,
    width: 0,
    height: 0,
    radius: 0,
    tree: null,
    i: 0,
    duration: 500,
    _container: null,
    tooltip: null,

    render(container, data) {
        d3.select(container).selectAll('*').remove();
        this._container = container;
        this.i = 0;

        const rect = container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.radius = Math.min(this.width, this.height) / 2 - 80;

        this.svg = d3.select(container)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        this.g = this.svg.append('g');

        // Zoom et déplacement
        this.zoom = d3.zoom()
            .scaleExtent([0.2, 5])
            .on('zoom', (event) => this.g.attr('transform', event.transform));
        this.svg.call(this.zoom);
        this.svg.call(this.zoom.transform,
            d3.zoomIdentity.translate(this.width / 2, this.height / 2));

        // Groupes pour les liens et noeuds (liens dessinés derrière)
        this.gLink = this.g.append('g').attr('class', 'links-group');
        this.gNode = this.g.append('g').attr('class', 'nodes-group');

        // Groupe des cercles guides concentriques (derrière tout)
        this.gGuides = this.g.insert('g', ':first-child').attr('class', 'guides-group');

        // Layout de l'arbre
        this.tree = d3.tree()
            .size([2 * Math.PI, this.radius])
            .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

        // Construire la hiérarchie
        this.root = d3.hierarchy(data, d => d.children);
        this.root.x0 = 0;
        this.root.y0 = 0;

        // Replier tous les enfants au-delà de la profondeur 1
        if (this.root.children) {
            this.root.children.forEach(c => this._collapse(c));
        }

        // Infobulle
        this.tooltip = d3.select(container)
            .append('div')
            .attr('class', 'tooltip')
            .style('display', 'none');

        this._update(this.root);
    },

    _collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(c => this._collapse(c));
            d.children = null;
        }
    },

    _update(source) {
        const self = this;
        const treeData = this.tree(this.root);
        const nodes = treeData.descendants();
        const links = treeData.links();

        // Donner un identifiant unique à chaque noeud
        nodes.forEach(d => { if (!d.id) d.id = ++this.i; });

        // ===== CERCLES GUIDES =====
        const depths = [...new Set(nodes.map(d => d.y))].filter(y => y > 0).sort((a, b) => a - b);
        this.gGuides.selectAll('.guide-circle')
            .data(depths, d => d)
            .join(
                enter => enter.append('circle')
                    .attr('class', 'guide-circle')
                    .attr('r', 0)
                    .style('fill', 'none')
                    .style('stroke', 'rgba(255,255,255,0.04)')
                    .style('stroke-dasharray', '4 4')
                    .call(e => e.transition().duration(self.duration).attr('r', d => d)),
                update => update.call(u => u.transition().duration(self.duration).attr('r', d => d)),
                exit => exit.transition().duration(self.duration).attr('r', 0).remove()
            );

        // ===== LIENS =====
        const link = this.gLink.selectAll('path.radial-link')
            .data(links, d => d.target.id);

        const linkEnter = link.enter().append('path')
            .attr('class', 'radial-link link')
            .attr('d', () => {
                const o = { x: source.x0 ?? 0, y: source.y0 ?? 0 };
                return self._radialLinkPath({ source: o, target: o });
            });

        linkEnter.merge(link)
            .transition().duration(this.duration)
            .attr('d', d => self._radialLinkPath(d));

        link.exit()
            .transition().duration(this.duration)
            .attr('d', () => {
                const o = { x: source.x, y: source.y };
                return self._radialLinkPath({ source: o, target: o });
            })
            .remove();

        // ===== NOEUDS =====
        const node = this.gNode.selectAll('g.radial-node')
            .data(nodes, d => d.id);

        const nodeEnter = node.enter().append('g')
            .attr('class', 'radial-node')
            .attr('transform', () => self._radialPoint(source.x0 ?? 0, source.y0 ?? 0))
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                self._toggle(d);
                // Afficher les infos
                if (typeof App !== 'undefined') App.showInfo(d.data);
            })
            .on('mouseover', (event, d) => self._showTooltip(event, d))
            .on('mousemove', (event) => self._moveTooltip(event))
            .on('mouseout', () => self._hideTooltip());

        nodeEnter.append('circle')
            .attr('r', 1e-6)
            .style('stroke-width', '2px');

        nodeEnter.append('text')
            .attr('class', 'node-label')
            .attr('dy', '0.31em')
            .style('font-size', '11px');

        // Mettre à jour tout (entrée + existant)
        const nodeUpdate = nodeEnter.merge(node);

        nodeUpdate.transition().duration(this.duration)
            .attr('transform', d => self._radialPoint(d.x, d.y));

        nodeUpdate.select('circle')
            .attr('r', d => {
                if (d.depth === 0) return 10;        // root
                if (d._children) return 7;            // collapsed, has hidden children
                if (d.children) return 6;             // expanded parent
                return 4;                             // leaf
            })
            .style('fill', d => {
                if (d._children) return ColorManager.get(self._getFamily(d));  // collapsed = solid
                if (d.children) return ColorManager.getAlpha(self._getFamily(d), 0.3); // expanded = hollow
                return ColorManager.getAlpha(self._getFamily(d), 0.5);
            })
            .style('stroke', d => ColorManager.get(self._getFamily(d)));

        nodeUpdate.select('text')
            .attr('x', d => {
                const isLeft = d.x >= Math.PI;
                const hasKids = d.children || d._children;
                return (isLeft === !!hasKids) ? -10 : 10;
            })
            .attr('text-anchor', d => {
                const isLeft = d.x >= Math.PI;
                const hasKids = d.children || d._children;
                return (isLeft === !!hasKids) ? 'end' : 'start';
            })
            .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
            .text(d => d.data.name);

        // Sortie (suppression des noeuds)
        const nodeExit = node.exit()
            .transition().duration(this.duration)
            .attr('transform', () => self._radialPoint(source.x, source.y))
            .remove();

        nodeExit.select('circle').attr('r', 1e-6);
        nodeExit.select('text').style('fill-opacity', 1e-6);

        // Sauvegarder les anciennes positions
        nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
    },

    _toggle(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        this._update(d);
    },

    _radialPoint(x, y) {
        return `rotate(${x * 180 / Math.PI - 90}) translate(${y},0)`;
    },

    _radialLinkPath(d) {
        return d3.linkRadial()
            .angle(n => n.x)
            .radius(n => n.y)(d);
    },

    _getFamily(d) {
        let node = d;
        while (node.parent && node.parent.parent) node = node.parent;
        return node.data.name;
    },

    _showTooltip(event, d) {
        const childCount = (d.children?.length || 0) + (d._children?.length || 0);
        let html = `<strong>${d.data.name}</strong>`;
        if (d.data.comment) html += `<br><span style="color:#9599a6">${d.data.comment}</span>`;
        if (childCount > 0) {
            const state = d._children ? 'replié' : 'déplié';
            html += `<br><span style="color:#4ecdc4">${childCount} enfant(s) — ${state}</span>`;
        }
        if (d.depth === 0) html += `<br><span style="color:#ffd93d">Racine</span>`;
        const restrictions = d.data.restrictions || [];
        if (restrictions.length) {
            html += '<br>';
            restrictions.forEach(r => {
                html += `<span class="restriction-tag">${r.propertyLabel} ${r.type} ${r.valueLabel || ''}</span> `;
            });
        }
        this.tooltip.html(html).style('display', 'block');
        this._moveTooltip(event);
    },

    _moveTooltip(event) {
        const containerRect = this._container.getBoundingClientRect();
        this.tooltip
            .style('left', (event.clientX - containerRect.left + 15) + 'px')
            .style('top', (event.clientY - containerRect.top - 10) + 'px');
    },

    _hideTooltip() {
        this.tooltip?.style('display', 'none');
    },

    zoomIn() { this.svg?.transition().call(this.zoom.scaleBy, 1.3); },
    zoomOut() { this.svg?.transition().call(this.zoom.scaleBy, 0.7); },
    resetZoom() {
        const rect = this.svg?.node()?.getBoundingClientRect();
        if (rect) {
            this.svg.transition().call(this.zoom.transform,
                d3.zoomIdentity.translate(rect.width / 2, rect.height / 2));
        }
    }
};
