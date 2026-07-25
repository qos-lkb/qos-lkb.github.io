import '../assets/css/tailwind.css';
import '../assets/css/app.css';
import '../../assets/css/user-menu.css';

async function bootMermaid() {
    try {
        const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')).default;
        const tidyTreeLayouts = (
            await import('https://cdn.jsdelivr.net/npm/@mermaid-js/layout-tidy-tree@0/dist/mermaid-layout-tidy-tree.esm.min.mjs')
        ).default;
        mermaid.registerLayoutLoaders(tidyTreeLayouts);
        window.mermaid = mermaid;
        window.__mermaidModuleReady = Promise.resolve();
    } catch (e) {
        console.warn('Mermaid load failed', e);
        window.__mermaidModuleReady = Promise.resolve();
    }
}

void bootMermaid();

import './modules/api.js';
import './modules/router.js';
import './modules/user-menu.js';
import './modules/sidebar.js';
import './modules/learning-tracker.js';
import './modules/auth.js';
import './modules/app-loader.js';
import './modules/admin-loader.js';
import './modules/app.js';
