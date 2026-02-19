/**
 * ColorManager - Couleurs cohérentes par famille de concepts
 */
const ColorManager = {
    // Palette de couleurs pour les familles
    palette: [
        '#6c8aff', '#4ecdc4', '#ff6b6b', '#ffd93d',
        '#a29bfe', '#fd79a8', '#00b894', '#e17055',
        '#0984e3', '#d63031', '#00cec9', '#fdcb6e',
        '#6c5ce7', '#fab1a0', '#55efc4', '#74b9ff',
    ],

    _assignments: {},
    _index: 0,

    /**
     * Récupérer la couleur pour un nom de famille/groupe
     */
    get(family) {
        if (!family) return '#555';
        if (this._assignments[family]) {
            return this._assignments[family];
        }
        const color = this.palette[this._index % this.palette.length];
        this._assignments[family] = color;
        this._index++;
        return color;
    },

    /**
     * Récupérer la couleur avec opacité
     */
    getAlpha(family, alpha = 0.3) {
        const hex = this.get(family);
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    },

    /**
     * Assigner une couleur par niveau de profondeur
     */
    byDepth(depth) {
        return this.palette[depth % this.palette.length];
    },

    /**
     * Réinitialiser les assignations
     */
    reset() {
        this._assignments = {};
        this._index = 0;
    }
};
