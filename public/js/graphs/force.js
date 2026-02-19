/**
 * Force - Graphe force-directed
 * Les noeuds se repoussent, les liens attirent les noeuds connectés
 */
const ForceGraph = {
    svg: null,
    g: null,
    zoom: null,
    simulation: null,

    render(container, data) {
        d3.select(container).selectAll('*').remove();

        if (!data.nodes || data.nodes.length === 0) {
            d3.select(container).append('div')
                .style('padding', '40px')
                .style('color', '#999')
                .text('Aucun noeud à afficher.');
            return;
        }

        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        this.svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        this.g = this.svg.append('g');

        // Zoom et déplacement
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
        this.svg.call(this.zoom);

        // Construire la simulation
        this.simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30));

        // Liens
        const link = this.g.selectAll('.force-link')
            .data(data.links)
            .join('line')
            .attr('class', d => d.type === 'property' ? 'force-link force-link-property' : 'force-link')
            .style('stroke-width', 1.5);

        // Étiquettes des liens
        const linkLabel = this.g.selectAll('.link-label')
            .data(data.links.filter(d => d.label))
            .join('text')
            .attr('class', 'link-label')
            .text(d => d.label);

        // Noeuds
        const node = this.g.selectAll('.force-node')
            .data(data.nodes)
            .join('g')
            .attr('class', 'force-node')
            .call(this._drag(this.simulation))
            .on('click', (event, d) => {
                if (typeof App !== 'undefined') {
                    App.showInfo({ uri: d.id, name: d.label, comment: '' });
                }
            });

        node.append('circle')
            .attr('r', 8)
            .style('fill', d => ColorManager.get(d.group))
            .style('stroke', d => ColorManager.get(d.group))
            .style('stroke-width', '2px')
            .style('fill-opacity', 0.6)
            .style('cursor', 'pointer');

        node.append('text')
            .attr('class', 'node-label')
            .attr('dx', 12)
            .attr('dy', '.35em')
            .text(d => d.label)
            .style('font-size', '11px');

        // Infobulle
        const tooltip = d3.select(container).append('div')
            .attr('class', 'tooltip').style('display', 'none');

        node.on('mouseover', (event, d) => {
            tooltip
                .style('display', 'block')
                .style('left', (event.offsetX + 15) + 'px')
                .style('top', (event.offsetY - 10) + 'px')
                .html(`<strong>${d.label}</strong><br><span style="color:#999;font-size:10px">${d.group}</span>`);
        })
        .on('mouseout', () => tooltip.style('display', 'none'));

        // Mise à jour à chaque tick de la simulation
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            linkLabel
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    },

    _drag(simulation) {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    },

    zoomIn() { this.svg?.transition().call(this.zoom.scaleBy, 1.3); },
    zoomOut() { this.svg?.transition().call(this.zoom.scaleBy, 0.7); },
    resetZoom() {
        const rect = this.svg?.node()?.getBoundingClientRect();
        if (rect) {
            this.svg.transition().call(this.zoom.transform,
                d3.zoomIdentity.translate(0, 0).scale(1));
        }
    },

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
    }
};
