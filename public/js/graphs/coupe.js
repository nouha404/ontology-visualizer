/**
 * Coupe - Cercles imbriqués zoomables (Circle Packing)
 * Racine = rectangle, enfants = cercles imbriqués
 * CLIQUER un cercle pour zoomer DEDANS (drill down)
 * CLIQUER le focus actuel (ou le fond) pour zoomer EN ARRIÈRE
 * Les labels apparaissent/disparaissent selon le niveau de zoom
 */
const CoupeGraph = {
    svg: null,
    g: null,
    focus: null,
    view: null,
    width: 0,
    height: 0,
    root: null,
    node: null,
    label: null,
    rootRect: null,
    rootLabel: null,
    tooltip: null,
    _container: null,

    render(container, data) {
        d3.select(container).selectAll('*').remove();
        this._container = container;

        const rect = container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        const size = Math.min(this.width, this.height) - 60;

        // Hiérarchie + layout pack
        this.root = d3.hierarchy(data)
            .sum(() => 1)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        d3.pack()
            .size([size, size])
            .padding(6)(this.root);

        this.focus = this.root;

        ColorManager.reset();

        // Créer le SVG
        this.svg = d3.select(container)
            .append('svg')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('width', this.width)
            .attr('height', this.height)
            .style('cursor', 'pointer')
            .on('click', () => this._zoomTo(this.root));

        // ===== RECTANGLE RACINE =====
        const rootR = this.root.r || size / 2;
        const cx = this.width / 2;
        const cy = this.height / 2;

        this.rootRect = this.svg.append('rect')
            .attr('class', 'coupe-rect')
            .attr('x', cx - rootR - 12)
            .attr('y', cy - rootR - 12)
            .attr('width', (rootR + 12) * 2)
            .attr('height', (rootR + 12) * 2)
            .style('fill', ColorManager.getAlpha(this.root.data.name, 0.06))
            .style('stroke', ColorManager.get(this.root.data.name))
            .style('stroke-width', '2px')
            .on('click', (event) => {
                event.stopPropagation();
                this._zoomTo(this.root);
            });

        this.rootLabel = this.svg.append('text')
            .attr('class', 'coupe-label')
            .attr('x', cx)
            .attr('y', cy - rootR - 18)
            .text(this.root.data.name)
            .style('fill', ColorManager.get(this.root.data.name))
            .style('font-size', '15px')
            .style('font-weight', '700');

        // ===== CERCLES IMBRIQUÉS =====
        const allNodes = this.root.descendants().slice(1);

        this.node = this.svg.selectAll('.coupe-circle')
            .data(allNodes)
            .join('circle')
            .attr('class', 'coupe-circle')
            .attr('cx', d => cx + (d.x - this.root.x))
            .attr('cy', d => cy + (d.y - this.root.y))
            .attr('r', d => d.r)
            .style('fill', d => {
                const fam = this._getFamily(d);
                return d.children
                    ? ColorManager.getAlpha(fam, 0.12)
                    : ColorManager.getAlpha(fam, 0.4);
            })
            .style('stroke', d => ColorManager.get(this._getFamily(d)))
            .style('stroke-width', d => d.children ? '2px' : '1.5px')
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                if (this.focus === d) {
                    // Déjà focalisé — zoomer en arrière vers le parent
                    this._zoomTo(d.parent || this.root);
                } else {
                    this._zoomTo(d);
                }
            })
            .on('mouseover', (event, d) => this._showTooltip(event, d))
            .on('mousemove', (event) => this._moveTooltip(event))
            .on('mouseout', () => this._hideTooltip());

        // ===== ÉTIQUETTES =====
        this.label = this.svg.selectAll('.coupe-text')
            .data(allNodes)
            .join('text')
            .attr('class', 'coupe-text')
            .attr('x', d => cx + (d.x - this.root.x))
            .attr('y', d => {
                if (d.children) return cy + (d.y - this.root.y) - d.r - 4;
                return cy + (d.y - this.root.y);
            })
            .attr('dy', d => d.children ? '0em' : '0.35em')
            .style('text-anchor', 'middle')
            .style('fill', d => d.children ? ColorManager.get(this._getFamily(d)) : '#ddd')
            .style('font-size', '11px')
            .style('font-weight', d => d.children ? '600' : '400')
            .style('pointer-events', 'none')
            .text(d => d.data.name)
            .style('display', d => this._shouldShowLabel(d, this.root) ? 'block' : 'none');

        // Div d'infobulle
        this.tooltip = d3.select(container)
            .append('div')
            .attr('class', 'tooltip')
            .style('display', 'none');

        // Stocker la vue initiale
        this.view = [this.root.x, this.root.y, this.root.r * 2.2];
    },

    // ===== ANIMATION DE ZOOM =====
    _zoomTo(d) {
        if (!d) return;
        this.focus = d;

        // Afficher le panneau d'info
        if (typeof App !== 'undefined') App.showInfo(d.data);

        const cx = this.width / 2;
        const cy = this.height / 2;
        const size = Math.min(this.width, this.height) - 60;

        // Vue cible : [centreX, centreY, diamètre]
        const targetDiam = d === this.root ? this.root.r * 2.2 : d.r * 2.5;
        const targetView = [d.x, d.y, targetDiam];

        const self = this;
        const i = d3.interpolateZoom(this.view, targetView);

        this.svg.transition()
            .duration(i.duration)
            .tween('zoom', () => {
                const interp = d3.interpolate(self.view, targetView);
                return (t) => {
                    const v = interp(t);
                    self.view = v;
                    const k = size / v[2]; // scale factor
                    const tx = cx - v[0] * k + self.root.x * k - self.root.x;
                    const ty = cy - v[1] * k + self.root.y * k - self.root.y;

                    // Déplacer et redimensionner les cercles
                    self.node
                        .attr('cx', n => cx + (n.x - v[0]) * k)
                        .attr('cy', n => cy + (n.y - v[1]) * k)
                        .attr('r', n => n.r * k);

                    // Déplacer et redimensionner les étiquettes
                    self.label
                        .attr('x', n => cx + (n.x - v[0]) * k)
                        .attr('y', n => {
                            const baseY = cy + (n.y - v[1]) * k;
                            if (n.children) return baseY - n.r * k - 4;
                            return baseY;
                        })
                        .style('font-size', n => {
                            const scaledR = n.r * k;
                            if (n.children) return Math.min(14, Math.max(9, scaledR / 3)) + 'px';
                            return Math.min(13, Math.max(8, scaledR / 2.5)) + 'px';
                        });

                    // Déplacer le rectangle racine + étiquette
                    const rootR = self.root.r * k;
                    const rootCX = cx + (self.root.x - v[0]) * k;
                    const rootCY = cy + (self.root.y - v[1]) * k;
                    self.rootRect
                        .attr('x', rootCX - rootR - 12)
                        .attr('y', rootCY - rootR - 12)
                        .attr('width', (rootR + 12) * 2)
                        .attr('height', (rootR + 12) * 2);
                    self.rootLabel
                        .attr('x', rootCX)
                        .attr('y', rootCY - rootR - 18);
                };
            })
            .on('end', () => {
                const k = size / self.view[2];
                // Afficher/masquer les étiquettes selon le zoom actuel
                self.label.style('display', n => {
                    const scaledR = n.r * k;
                    // Afficher l'étiquette si le cercle est assez grand à l'écran
                    if (n.children) return scaledR > 25 ? 'block' : 'none';
                    return scaledR > 14 ? 'block' : 'none';
                });
            });
    },

    _shouldShowLabel(d, focus) {
        // Initial : afficher seulement les étiquettes de profondeur 1 et les grandes feuilles
        if (d.parent === focus) return true;
        if (!d.children && d.r > 18) return true;
        return false;
    },

    _getFamily(d) {
        let node = d;
        while (node.parent && node.parent.parent) node = node.parent;
        return node.data.name;
    },

    _showTooltip(event, d) {
        const restrictions = d.data.restrictions || [];
        let html = `<strong>${d.data.name}</strong>`;
        if (d.data.comment) html += `<br><span style="color:#9599a6">${d.data.comment}</span>`;
        if (d.children) html += `<br><span style="color:#4ecdc4">${d.children.length} enfant(s)</span>`;
        if (d._children) html += `<br><span style="color:#ffd93d">${d._children.length} enfant(s) cachés</span>`;
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

    zoomIn() { this._manualZoom(1.4); },
    zoomOut() { this._manualZoom(0.6); },
    _manualZoom(factor) {
        if (!this.focus) return;
        // Zoomer en réduisant/agrandissant le diamètre de la vue
        const newDiam = this.view[2] / factor;
        const fakeNode = { x: this.view[0], y: this.view[1], r: newDiam / 2.5, data: this.focus.data };
        // Mettre à jour la vue directement
        const prevView = this.view;
        this.view = [prevView[0], prevView[1], newDiam];
        const size = Math.min(this.width, this.height) - 60;
        const cx = this.width / 2;
        const cy = this.height / 2;
        const k = size / newDiam;
        const self = this;

        this.node.transition().duration(300)
            .attr('cx', n => cx + (n.x - self.view[0]) * k)
            .attr('cy', n => cy + (n.y - self.view[1]) * k)
            .attr('r', n => n.r * k);

        this.label.transition().duration(300)
            .attr('x', n => cx + (n.x - self.view[0]) * k)
            .attr('y', n => {
                const baseY = cy + (n.y - self.view[1]) * k;
                if (n.children) return baseY - n.r * k - 4;
                return baseY;
            });

        const rootR = this.root.r * k;
        const rootCX = cx + (this.root.x - this.view[0]) * k;
        const rootCY = cy + (this.root.y - this.view[1]) * k;
        this.rootRect.transition().duration(300)
            .attr('x', rootCX - rootR - 12)
            .attr('y', rootCY - rootR - 12)
            .attr('width', (rootR + 12) * 2)
            .attr('height', (rootR + 12) * 2);
        this.rootLabel.transition().duration(300)
            .attr('x', rootCX)
            .attr('y', rootCY - rootR - 18);

        setTimeout(() => {
            this.label.style('display', n => {
                const sR = n.r * k;
                if (n.children) return sR > 25 ? 'block' : 'none';
                return sR > 14 ? 'block' : 'none';
            });
        }, 310);
    },

    resetZoom() {
        this._zoomTo(this.root);
    }
};
