(function (global) {
    'use strict';

    const SIDEBAR_KEY = 'science-sims-sidebar-collapsed';
    const mqDesktop = window.matchMedia('(min-width: 768px)');

    function isDesktop() {
        return mqDesktop.matches;
    }

    function applyDesktopSidebar(collapsed) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('sidebar-collapsed', collapsed);
        document.body.classList.toggle('sidebar-is-collapsed', collapsed);
        try {
            localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
        } catch (e) { /* ignore */ }
    }

    function applyMobileSidebar(open) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        if (!sidebar) return;
        sidebar.classList.toggle('sidebar-open', open);
        overlay?.classList.toggle('active', open);
        document.body.style.overflow = open ? 'hidden' : '';
        document.body.classList.toggle('sidebar-is-collapsed', !open);
    }

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || sidebar.style.display === 'none') return;
        if (isDesktop()) {
            applyDesktopSidebar(!sidebar.classList.contains('sidebar-collapsed'));
        } else {
            applyMobileSidebar(!sidebar.classList.contains('sidebar-open'));
        }
    }

    function closeMobileSidebar() {
        if (!isDesktop()) {
            applyMobileSidebar(false);
        }
    }

    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || sidebar.style.display === 'none') return;
        if (isDesktop()) {
            let collapsed = false;
            try {
                collapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
            } catch (e) { /* ignore */ }
            applyDesktopSidebar(collapsed);
        } else {
            applyMobileSidebar(false);
        }
    }

    function resetOnBreakpointChange() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        if (!sidebar) return;
        sidebar.classList.remove('sidebar-open', 'sidebar-collapsed');
        overlay?.classList.remove('active');
        document.body.classList.remove('sidebar-is-collapsed');
        document.body.style.overflow = '';
        initSidebar();
    }

    function init() {
        document.getElementById('btn-sidebar-collapse')?.addEventListener('click', toggleSidebar);
        document.getElementById('sidebar-expand')?.addEventListener('click', toggleSidebar);
        document.getElementById('btn-sidebar')?.addEventListener('click', toggleSidebar);
        document.getElementById('overlay')?.addEventListener('click', closeMobileSidebar);
        mqDesktop.addEventListener('change', resetOnBreakpointChange);
        initSidebar();
    }

    global.AppSidebar = {
        init,
        initSidebar,
        toggleSidebar,
        closeMobileSidebar,
    };
})(window);
