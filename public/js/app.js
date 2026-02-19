/**
 * App - Contrôleur principal de l'application
 * Connecte les contrôles de la sidebar, les appels API et les rendus de graphes
 */
const App = {
    currentGraph: 'collapse',
    currentData: null,
    graphs: {
        collapse: CollapseGraph,
        radial: RadialGraph,
        coupe: CoupeGraph,
        force: ForceGraph,
    },

    init() {
        // Restaurer l'état de la session précédente
        StateManager.restoreFormState();
        this.currentGraph = StateManager.get('graph', 'collapse');

        // Lier les clics d'onglets — changer de graphe + recharger les données
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentGraph = tab.dataset.graph;
                StateManager.set('graph', this.currentGraph);
                // Force a besoin d'un format différent, donc recharger
                this.loadData();
            });
        });

        // Lier le bouton de rafraîchissement (toujours disponible)
        document.getElementById('btn-refresh')?.addEventListener('click', () => this.loadData());

        // RECHARGEMENT AUTO : chaque changement de select déclenche loadData automatiquement
        ['select-concept', 'select-depth', 'select-mode', 'select-property'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.loadData());
        });

        // Lier les boutons de zoom
        document.getElementById('btn-zoom-in')?.addEventListener('click', () => this._getGraph()?.zoomIn());
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => this._getGraph()?.zoomOut());
        document.getElementById('btn-reset')?.addEventListener('click', () => this._getGraph()?.resetZoom());

        // Chargement auto à l'initialisation
        this.loadData();
    },

    async loadData() {
        StateManager.saveFormState();

        const concept = document.getElementById('select-concept')?.value || '';
        const depth = document.getElementById('select-depth')?.value || '-1';
        const mode = document.getElementById('select-mode')?.value || 'hierarchy';
        const property = document.getElementById('select-property')?.value || '';

        const container = document.getElementById('graph-container');
        container.innerHTML = '<div style="padding:40px;color:#999;">Chargement...</div>';

        try {
            let data;

            if (this.currentGraph === 'force') {
                // Le graphe force a besoin du format noeuds/liens
                const url = `${API_BASE}&endpoint=force&concept=${encodeURIComponent(concept)}&depth=${depth}`;
                data = await this._fetch(url);
            } else if (mode === 'properties') {
                if (!concept) {
                    container.innerHTML = '<div style="padding:40px;color:#999;">Sélectionnez un concept pour voir ses propriétés.</div>';
                    return;
                }
                const url = `${API_BASE}&endpoint=concept-properties&concept=${encodeURIComponent(concept)}`;
                const props = await this._fetch(url);
                // Formater les propriétés en arbre pour les vues arborescentes
                data = this._propsToTree(concept, props);
            } else if (mode === 'prop-hierarchy') {
                const url = `${API_BASE}&endpoint=property-hierarchy&property=${encodeURIComponent(property)}`;
                const propData = await this._fetch(url);
                // la hiérarchie de propriétés retourne un tableau de racines
                data = Array.isArray(propData)
                    ? (propData.length === 1 ? propData[0] : { name: 'Properties', uri: '', children: propData })
                    : propData;
            } else if (mode === 'combined') {
                if (!concept) {
                    container.innerHTML = '<div style="padding:40px;color:#999;">Sélectionnez un concept pour la vue combinée.</div>';
                    return;
                }
                const url = `${API_BASE}&endpoint=combined&concept=${encodeURIComponent(concept)}&depth=${depth}`;
                const combined = await this._fetch(url);
                data = this._combinedToTree(combined);
            } else {
                // Par défaut : hiérarchie
                const url = `${API_BASE}&endpoint=hierarchy&concept=${encodeURIComponent(concept)}&depth=${depth}`;
                data = await this._fetch(url);
            }

            this.currentData = data;
            ColorManager.reset();
            this._renderCurrent();

        } catch (err) {
            container.innerHTML = `<div style="padding:40px;color:#ff6b6b;">Erreur: ${err.message}</div>`;
            console.error(err);
        }
    },

    _renderCurrent() {
        const container = document.getElementById('graph-container');
        if (!this.currentData) return;

        // Arrêter la simulation force si on change de vue
        if (ForceGraph.simulation) ForceGraph.destroy();

        const graph = this._getGraph();
        if (graph) {
            graph.render(container, this.currentData);
        }
    },

    _getGraph() {
        return this.graphs[this.currentGraph] || null;
    },

    async _fetch(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data;
    },

    /**
     * Convertir la liste de propriétés en arbre pour les vues arborescentes
     */
    _propsToTree(conceptUri, props) {
        const conceptName = this._localName(conceptUri);
        return {
            name: conceptName,
            uri: conceptUri,
            children: props.map(p => ({
                name: `${p.name}${p.range ? ' → ' + p.range : ''}`,
                uri: p.uri,
                comment: p.type + (p.transitive ? ', transitive' : '') + (p.inverseOf ? ', inverse: ' + p.inverseOf : ''),
                children: []
            }))
        };
    },

    /**
     * Convertir la vue combinée en arbre
     */
    _combinedToTree(combined) {
        const tree = combined.hierarchy;
        // Attacher les propriétés comme noeuds enfants spéciaux
        if (combined.properties && combined.properties.length > 0) {
            if (!tree.children) tree.children = [];
            tree.children.push({
                name: '[ Properties ]',
                uri: '',
                children: combined.properties.map(p => ({
                    name: `${p.name}${p.range ? ' → ' + p.range : ''}`,
                    uri: p.uri,
                    children: []
                }))
            });
        }
        return tree;
    },

    _localName(uri) {
        if (!uri) return '';
        const hash = uri.lastIndexOf('#');
        if (hash !== -1) return uri.substring(hash + 1);
        const slash = uri.lastIndexOf('/');
        if (slash !== -1) return uri.substring(slash + 1);
        return uri;
    },

    /**
     * Afficher les infos dans le panneau latéral
     */
    showInfo(data) {
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('info-title');
        const uri = document.getElementById('info-uri');
        const comment = document.getElementById('info-comment');
        const propsDiv = document.getElementById('info-properties');
        const restDiv = document.getElementById('info-restrictions');

        if (!panel) return;

        panel.style.display = 'block';
        title.textContent = data.name || '';
        uri.textContent = data.uri || '';
        comment.textContent = data.comment || '';

        // Propriétés
        propsDiv.innerHTML = '';
        if (data.properties && data.properties.length > 0) {
            propsDiv.innerHTML = '<strong style="font-size:12px;">Propriétés:</strong><br>';
            data.properties.forEach(p => {
                propsDiv.innerHTML += `<span class="prop-tag">${p.name}${p.range ? ' → ' + p.range : ''}</span>`;
            });
        }

        // Restrictions OWL
        restDiv.innerHTML = '';
        if (data.restrictions && data.restrictions.length > 0) {
            restDiv.innerHTML = '<strong style="font-size:12px;">Restrictions:</strong><br>';
            data.restrictions.forEach(r => {
                restDiv.innerHTML += `<span class="restriction-tag">${r.propertyLabel || ''} ${r.type || ''} ${r.valueLabel || ''}</span>`;
            });
        }
    }
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => App.init());
