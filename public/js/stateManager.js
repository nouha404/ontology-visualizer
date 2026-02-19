/**
 * StateManager - Préserver l'état entre les changements de visualisation
 */
const StateManager = {
    _state: {},

    set(key, value) {
        this._state[key] = value;
        // Persister dans sessionStorage
        try {
            sessionStorage.setItem('onto_state', JSON.stringify(this._state));
        } catch(e) {}
    },

    get(key, defaultValue = null) {
        return this._state[key] ?? defaultValue;
    },

    getAll() {
        return { ...this._state };
    },

    reset() {
        this._state = {};
        try { sessionStorage.removeItem('onto_state'); } catch(e) {}
    },

    restore() {
        try {
            const saved = sessionStorage.getItem('onto_state');
            if (saved) {
                this._state = JSON.parse(saved);
            }
        } catch(e) {}
    },

    // Sauvegarder l'état actuel du formulaire
    saveFormState() {
        const concept = document.getElementById('select-concept')?.value || '';
        const depth = document.getElementById('select-depth')?.value || '-1';
        const mode = document.getElementById('select-mode')?.value || 'hierarchy';
        const property = document.getElementById('select-property')?.value || '';
        const graph = document.querySelector('.tab.active')?.dataset.graph || 'collapse';

        this.set('concept', concept);
        this.set('depth', depth);
        this.set('mode', mode);
        this.set('property', property);
        this.set('graph', graph);
    },

    // Restaurer l'état du formulaire
    restoreFormState() {
        const setVal = (id, key) => {
            const el = document.getElementById(id);
            const val = this.get(key);
            if (el && val !== null) el.value = val;
        };

        setVal('select-concept', 'concept');
        setVal('select-depth', 'depth');
        setVal('select-mode', 'mode');
        setVal('select-property', 'property');

        const graph = this.get('graph', 'collapse');
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.graph === graph);
        });
    }
};

// Restaurer au chargement
StateManager.restore();
