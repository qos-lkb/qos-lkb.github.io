/** @deprecated Use admin-content-embed.js — kept for backward compatibility. */
(function (global) {
    'use strict';
    if (!global.AdminContentEmbed) {
        console.warn('admin-worksheet-embed.js: load admin-content-embed.js first.');
        return;
    }
    global.AdminWorksheetEmbed = global.AdminContentEmbed;
})(window);
