/**
 * Collapse - Arbre dépliable horizontal
 * Arbre D3 horizontal avec clic pour déplier/replier
 */
const CollapseGraph = {
    svg: null,
    g: null,
    zoom: null,
    treemap: null,
    root: null,
    i: 0,
    duration: 400,

    render(container, data) {
        // Nettoyer
        d3.select(container).selectAll('*').remove();

        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const margin = { top: 20, right: 120, bottom: 20, left: 140 };

        this.svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        this.g = this.svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Zoom et déplacement
        this.zoom = d3.zoom()
            .scaleExtent([0.2, 5])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
        this.svg.call(this.zoom);
        this.svg.call(this.zoom.transform,
            d3.zoomIdentity.translate(margin.left, height / 2));

        this.treemap = d3.tree().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

        // Construire la hiérarchie
        this.root = d3.hierarchy(data, d => d.children);
        this.root.x0 = height / 2;
        this.root.y0 = 0;

        // Replier après la profondeur 1
        if (this.root.children) {
            this.root.children.forEach(c => this._collapse(c));
        }

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
        const treeData = this.treemap(this.root);
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

        // Normaliser la profondeur
        nodes.forEach(d => { d.y = d.depth * 180; });

        // ===== NOEUDS =====
        const node = this.g.selectAll('g.node')
            .data(nodes, d => d.id || (d.id = ++this.i));

        const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', `translate(${source.y0},${source.x0})`)
            .on('click', (event, d) => this._click(d))
            .on('mouseover', (event, d) => this._showInfo(d.data))
            .on('mouseout', () => this._hideInfo());

        nodeEnter.append('circle')
            .attr('r', 1e-6)
            .style('fill', d => d._children ? ColorManager.get(d.data.name) : ColorManager.getAlpha(d.data.name, 0.3))
            .style('stroke', d => ColorManager.get(this._getFamily(d)));

        nodeEnter.append('text')
            .attr('class', 'node-label')
            .attr('dy', '.35em')
            .attr('x', d => d.children || d._children ? -13 : 13)
            .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
            .text(d => d.data.name);

        // Mise à jour
        const nodeUpdate = nodeEnter.merge(node);

        nodeUpdate.transition().duration(this.duration)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        nodeUpdate.select('circle')
            .attr('r', 7)
            .style('fill', d => d._children ? ColorManager.get(this._getFamily(d)) : ColorManager.getAlpha(this._getFamily(d), 0.3))
            .style('stroke', d => ColorManager.get(this._getFamily(d)));

        // Sortie (suppression des noeuds)
        const nodeExit = node.exit().transition().duration(this.duration)
            .attr('transform', `translate(${source.y},${source.x})`)
            .remove();

        nodeExit.select('circle').attr('r', 1e-6);
        nodeExit.select('text').style('fill-opacity', 1e-6);

        // ===== LIENS =====
        const link = this.g.selectAll('path.link')
            .data(links, d => d.id);

        const linkEnter = link.enter().insert('path', 'g')
            .attr('class', 'link')
            .attr('d', () => {
                const o = { x: source.x0, y: source.y0 };
                return this._diagonal(o, o);
            });

        const linkUpdate = linkEnter.merge(link);
        linkUpdate.transition().duration(this.duration)
            .attr('d', d => this._diagonal(d, d.parent));

        link.exit().transition().duration(this.duration)
            .attr('d', () => {
                const o = { x: source.x, y: source.y };
                return this._diagonal(o, o);
            })
            .remove();

        // Sauvegarder les positions
        nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
    },

    _diagonal(s, d) {
        return `M ${s.y} ${s.x}
                C ${(s.y + d.y) / 2} ${s.x},
                  ${(s.y + d.y) / 2} ${d.x},
                  ${d.y} ${d.x}`;
    },

    _click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        this._update(d);
    },

    _getFamily(d) {
        let node = d;
        while (node.parent) node = node.parent;
        return node.data.name;
    },

    _showInfo(data) {
        if (typeof App !== 'undefined') App.showInfo(data);
    },

    _hideInfo() {},

    zoomIn() { this.svg?.transition().call(this.zoom.scaleBy, 1.3); },
    zoomOut() { this.svg?.transition().call(this.zoom.scaleBy, 0.7); },
    resetZoom() {
        const rect = this.svg?.node()?.getBoundingClientRect();
        if (rect) {
            this.svg.transition().call(this.zoom.transform,
                d3.zoomIdentity.translate(140, rect.height / 2));
        }
    }
};
