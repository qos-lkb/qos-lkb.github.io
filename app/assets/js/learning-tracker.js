(function (global) {
    'use strict';

    const { apiFetch, getUser, API_BASE } = global.ScienceApi;

    let sessionId = '';
    let queue = [];
    let flushTimer = null;
    let openSessions = {};
    const FLUSH_MS = 8000;
    const MAX_QUEUE = 40;

    function ensureSessionId() {
        if (sessionId) return sessionId;
        try {
            const key = 'science_sims_track_sid';
            sessionId = sessionStorage.getItem(key) || '';
            if (!sessionId) {
                sessionId = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                sessionStorage.setItem(key, sessionId);
            }
        } catch (e) {
            sessionId = 's' + Date.now();
        }
        return sessionId;
    }

    function canTrack() {
        return !!getUser();
    }

    function pushEvent(ev) {
        if (!canTrack()) return;
        queue.push(Object.assign({
            session_id: ensureSessionId(),
            created_at: new Date().toISOString(),
        }, ev));
        if (queue.length >= MAX_QUEUE) {
            flush();
        } else {
            scheduleFlush();
        }
    }

    function scheduleFlush() {
        if (flushTimer) return;
        flushTimer = setTimeout(() => {
            flushTimer = null;
            flush();
        }, FLUSH_MS);
    }

    async function flush() {
        if (!canTrack() || queue.length === 0) return;
        const batch = queue.splice(0, LA_MAX_EVENTS_BATCH || 50);
        try {
            await apiFetch('/learning/events', {
                method: 'POST',
                body: { events: batch },
            });
        } catch (e) {
            queue = batch.concat(queue).slice(0, 200);
        }
    }

    function trackPageView(path) {
        pushEvent({
            event_type: 'page_view',
            content_type: 'page',
            content_id: path,
            metadata: { path },
        });
    }

    function contentKey(type, id) {
        return type + ':' + id;
    }

    function trackContentOpen(type, id, meta) {
        const key = contentKey(type, id);
        openSessions[key] = {
            type,
            id,
            startedAt: Date.now(),
            meta: meta || {},
        };
        pushEvent({
            event_type: 'content_open',
            content_type: type,
            content_id: String(id),
            subject_id: meta && meta.subject_id != null ? meta.subject_id : null,
            topic_id: meta && meta.topic_id != null ? meta.topic_id : null,
            metadata: meta || {},
        });
    }

    function trackContentComplete(type, id, extra) {
        const key = contentKey(type, id);
        const sess = openSessions[key];
        let duration = 0;
        if (sess) {
            duration = Math.round((Date.now() - sess.startedAt) / 1000);
            delete openSessions[key];
        }
        const meta = Object.assign({}, sess && sess.meta ? sess.meta : {}, extra || {});
        pushEvent({
            event_type: 'content_complete',
            content_type: type,
            content_id: String(id),
            subject_id: meta.subject_id != null ? meta.subject_id : null,
            topic_id: meta.topic_id != null ? meta.topic_id : null,
            duration_seconds: duration || (extra && extra.duration_seconds) || null,
            metadata: meta,
        });
    }

    function trackSimulationOpen(slug, meta) {
        trackContentOpen('simulation', slug, meta);
        pushEvent({
            event_type: 'simulation_open',
            content_type: 'simulation',
            content_id: slug,
            subject_id: meta && meta.subject_id != null ? meta.subject_id : null,
            topic_id: meta && meta.topic_id != null ? meta.topic_id : null,
        });
    }

    function trackSimulationClose(slug, durationSeconds) {
        pushEvent({
            event_type: 'simulation_close',
            content_type: 'simulation',
            content_id: slug,
            duration_seconds: durationSeconds,
        });
        if (durationSeconds >= 120) {
            trackContentComplete('simulation', slug, { duration_seconds: durationSeconds });
        } else {
            const key = contentKey('simulation', slug);
            delete openSessions[key];
        }
    }

    function trackCourseTopic(subjectSlug, topicSlug, topicId) {
        pushEvent({
            event_type: 'course_topic_view',
            content_type: 'course',
            content_id: subjectSlug + '/' + topicSlug,
            topic_id: topicId || null,
            metadata: { subject_slug: subjectSlug, topic_slug: topicSlug },
        });
    }

    function bindScrollComplete(rootEl, type, id, meta, threshold) {
        if (!rootEl || !canTrack()) return;
        const thr = threshold || 0.8;
        let done = false;
        const minSeconds = (type === 'note' || type === 'worksheet') ? 60 : 30;

        function check() {
            if (done) return;
            const scrollable = rootEl.scrollHeight - rootEl.clientHeight;
            const ratio = scrollable > 0 ? rootEl.scrollTop / scrollable : 1;
            const sess = openSessions[contentKey(type, id)];
            const elapsed = sess ? (Date.now() - sess.startedAt) / 1000 : 0;
            if (ratio >= thr || elapsed >= minSeconds) {
                done = true;
                trackContentComplete(type, id, meta);
                rootEl.removeEventListener('scroll', check);
            }
        }
        rootEl.addEventListener('scroll', check, { passive: true });
        setTimeout(check, minSeconds * 1000);
    }

    function init() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flush();
        });
        window.addEventListener('pagehide', () => flush());
    }

    const LA_MAX_EVENTS_BATCH = 50;

    global.AppLearningTracker = {
        init,
        flush,
        trackPageView,
        trackContentOpen,
        trackContentComplete,
        trackSimulationOpen,
        trackSimulationClose,
        trackCourseTopic,
        bindScrollComplete,
        canTrack,
    };
})(window);
