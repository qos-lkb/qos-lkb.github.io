(function () {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('overlay');
    var btnSidebar = document.getElementById('btn-sidebar');
    var btnCollapse = document.getElementById('btn-sidebar-collapse');
    var btnExpand = document.getElementById('sidebar-expand');
    var storageKey = 'admin-sidebar-collapsed';

    function isMobile() {
        return window.matchMedia('(max-width: 767px)').matches;
    }

    function openMobileSidebar() {
        if (!sidebar) return;
        sidebar.classList.add('sidebar-open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('sidebar-open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function setDesktopCollapsed(collapsed) {
        if (!sidebar) return;
        if (collapsed) {
            sidebar.classList.add('sidebar-collapsed');
            document.body.classList.add('sidebar-is-collapsed');
        } else {
            sidebar.classList.remove('sidebar-collapsed');
            document.body.classList.remove('sidebar-is-collapsed');
        }
        try {
            localStorage.setItem(storageKey, collapsed ? '1' : '0');
        } catch (e) { /* ignore */ }
    }

    if (btnSidebar) {
        btnSidebar.addEventListener('click', function () {
            if (sidebar && sidebar.classList.contains('sidebar-open')) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }

    if (btnCollapse) {
        btnCollapse.addEventListener('click', function () {
            var collapsed = !sidebar.classList.contains('sidebar-collapsed');
            setDesktopCollapsed(collapsed);
        });
    }

    if (btnExpand) {
        btnExpand.addEventListener('click', function () {
            setDesktopCollapsed(false);
        });
    }

    window.addEventListener('resize', function () {
        if (!isMobile()) {
            closeMobileSidebar();
        }
    });

    if (!isMobile()) {
        try {
            if (localStorage.getItem(storageKey) === '1') {
                setDesktopCollapsed(true);
            }
        } catch (e) { /* ignore */ }
    }
})();
