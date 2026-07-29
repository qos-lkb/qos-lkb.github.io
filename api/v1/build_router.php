<?php

declare(strict_types=1);

use ScienceSims\Http\Router;

/**
 * Build the table-driven /api/v1 router for the given PDO connection.
 */
function api_v1_build_router(PDO $pdo): Router
{
    $router = new Router();
    $method = static fn (): string => strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    $router->addExact('GET', '/catalog', static fn () => api_handle_catalog($pdo));
    $router->addExact('GET', '/courses', static fn () => api_handle_courses_list($pdo));
    $router->addExact('GET', '/learning-tools', static fn () => api_handle_learning_tools_list_public($pdo));
    $router->addExact('GET', '/learning-tools/pending', static fn () => api_handle_learning_tools_pending($pdo));
    $router->addExact('GET', '/articles', static fn () => api_handle_articles_list_public($pdo));
    $router->addExact('GET', '/articles/pending', static fn () => api_handle_articles_pending($pdo));
    $router->addExact('GET', '/learning-notes', static fn () => api_handle_learning_notes_list_public($pdo));
    $router->addExact('GET', '/learning-notes/pending', static fn () => api_handle_learning_notes_pending($pdo));
    $router->addExact('GET', '/worksheets', static fn () => api_handle_worksheets_list_public($pdo));
    $router->addExact('GET', '/worksheets/pending', static fn () => api_handle_worksheets_pending($pdo));
    $router->addExact('GET', '/learning-videos', static fn () => api_handle_learning_videos_list_public($pdo));
    $router->addExact('GET', '/learning-videos/pending', static fn () => api_handle_learning_videos_pending($pdo));
    $router->addExact('GET', '/question-banks', static fn () => api_handle_question_banks_list_public($pdo));
    $router->addExact('GET', '/summer-homework', static fn () => api_handle_summer_homework_list($pdo));
    $router->addExact('GET', '/review-queue', static fn () => api_handle_review_queue($pdo));
    $router->addExact('POST', '/auth/login', static fn () => api_handle_auth_login($pdo));
    $router->addExact('POST', '/auth/register', static fn () => api_handle_auth_register($pdo));
    $router->addExact('POST', '/auth/dev-login', static fn () => api_handle_auth_dev_login($pdo));
    $router->addExact('POST', '/auth/logout', static fn () => api_handle_auth_logout($pdo));
    $router->addExact('POST', '/auth/stop-impersonation', static fn () => api_handle_auth_stop_impersonation($pdo));
    $router->addExact('GET', '/auth/me', static fn () => api_handle_auth_me($pdo));
    $router->addExact('GET', '/subjects', static fn () => api_handle_subjects($pdo));
    $router->addExact('GET', '/nav-menu', static fn () => api_handle_nav_menu($pdo));

    $router->addExact('GET', '/admin/dashboard', static fn () => api_handle_admin_dashboard($pdo));
    $router->addExact('GET', '/admin/school-overview', static fn () => api_handle_admin_school_overview($pdo));
    $router->addExact('GET', '/teacher/inbox/count', static fn () => api_handle_teacher_inbox_count($pdo));
    $router->addExact('GET', '/teacher/inbox', static fn () => api_handle_teacher_inbox($pdo));

    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/simulations', static fn () => api_handle_admin_simulations($pdo, $method()));
    $router->addExact('POST', '/admin/simulations/upload-html', static fn () => api_handle_admin_simulation_upload($pdo, 'html'));
    $router->addExact('POST', '/admin/simulations/upload-screenshot', static fn () => api_handle_admin_simulation_upload($pdo, 'screenshot'));
    $router->addMethods(['GET', 'POST'], '/simulations/contribute', static fn () => api_handle_simulations_contribute($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/learning-tools', static fn () => api_handle_admin_learning_tools($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/articles', static fn () => api_handle_admin_articles($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/learning-notes', static fn () => api_handle_admin_learning_notes($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/worksheets', static fn () => api_handle_admin_worksheets($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/learning-videos', static fn () => api_handle_admin_learning_videos($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/question-banks', static fn () => api_handle_admin_question_banks($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/summer-homework', static fn () => api_handle_admin_summer_homework($pdo, $method()));
    $router->addMethods(['GET', 'POST'], '/admin/nav-menu', static fn () => api_handle_admin_nav_menu($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/classes', static fn () => api_handle_admin_classes($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/topic-items', static fn () => api_handle_admin_topic_items($pdo, $method()));
    $router->addMethods(['GET', 'POST', 'DELETE'], '/admin/users', static fn () => api_handle_admin_users($pdo, $method()));
    $router->addMethods(['GET', 'PUT', 'POST'], '/admin/permissions', static fn () => api_handle_admin_permissions($pdo, $method()));

    $router->addExact('POST', '/admin/db/export', static fn () => api_handle_admin_db_export($pdo));
    $router->addExact('GET', '/admin/db/import-status', static fn () => api_handle_admin_db_import_status());
    $router->addExact('POST', '/admin/db/import', static fn () => api_handle_admin_db_import($pdo));
    $router->addExact('GET', '/admin/data-dictionary', static fn () => api_handle_admin_data_dictionary_get());
    $router->addExact('POST', '/admin/data-dictionary/regenerate', static fn () => api_handle_admin_data_dictionary_regenerate());
    $router->addExact('GET', '/admin/qsis/status', static fn () => api_handle_admin_qsis_status($pdo));
    $router->addExact('GET', '/admin/qsis/courses', static fn () => api_handle_admin_qsis_courses());
    $router->addExact('POST', '/admin/qsis/import', static fn () => api_handle_admin_qsis_import($pdo));

    $router->addMethods(['GET', 'POST'], '/admin/subjects', static fn () => api_handle_admin_subjects($pdo, $method()));
    $router->addExact('POST', '/admin/subjects/reorder', static fn () => api_handle_admin_subjects_reorder($pdo));

    $router->addExact('POST', '/auth/profile', static fn () => api_handle_auth_update_profile($pdo));
    $router->addExact('POST', '/auth/student-profile', static fn () => api_handle_student_profile_update($pdo));

    $router->addExact('POST', '/learning/events', static fn () => api_handle_learning_events($pdo));
    $router->addExact('GET', '/learning/events/summary', static fn () => api_handle_learning_events_summary($pdo));
    $router->addMethods(['GET', 'POST'], '/learning/attempts', static function () use ($pdo, $method): void {
        if ($method() === 'POST') {
            api_handle_learning_attempts_post($pdo);
            return;
        }
        api_handle_learning_attempts_list($pdo);
    });
    $router->addExact('GET', '/learning/mastery', static fn () => api_handle_learning_mastery($pdo));
    $router->addExact('GET', '/learning/progress', static fn () => api_handle_learning_progress($pdo));
    $router->addExact('GET', '/learning/dashboard', static fn () => api_handle_learning_dashboard($pdo));
    $router->addExact('POST', '/learning/goals', static fn () => api_handle_learning_goals_post($pdo));
    $router->addExact('GET', '/learning/recommendations', static fn () => api_handle_learning_recommendations($pdo));
    $router->addExact('GET', '/learning/adaptive-quiz', static fn () => api_handle_learning_adaptive_quiz($pdo));

    $router->addMethods(['GET', 'POST'], '/teacher/classes', static function () use ($pdo, $method): void {
        if ($method() === 'POST') {
            api_handle_teacher_class_create($pdo);
            return;
        }
        api_handle_teacher_classes_list($pdo);
    });
    $router->addExact('GET', '/teacher/worksheets', static fn () => api_handle_teacher_worksheets_list($pdo));
    $router->addExact('GET', '/student/worksheet-assignments', static fn () => api_handle_student_worksheet_assignments_list($pdo));

    // Pattern routes (order matters for overlapping patterns — more specific first)
    $router->addPattern('^GET /simulations/([^/]+)/html$', static fn (array $p) => api_handle_simulation_html($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /simulations/([^/]+)$', static fn (array $p) => api_handle_simulation_get($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /learning-tools/([^/]+)/answers$', static fn (array $p) => api_handle_learning_tool_answers($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /learning-tools/([^/]+)$', static fn (array $p) => api_handle_learning_tool_get($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /articles/([^/]+)/answers$', static fn (array $p) => api_handle_article_answers($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /articles/([^/]+)$', static fn (array $p) => api_handle_article_get($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /learning-notes/([^/]+)$', static fn (array $p) => api_handle_learning_note_get($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /worksheets/([^/]+)$', static fn (array $p) => api_handle_worksheet_get($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /learning-videos/([^/]+)$', static fn (array $p) => api_handle_learning_video_get($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /question-banks/([^/]+)/answers$', static fn (array $p) => api_handle_question_bank_answers($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /question-banks/([^/]+)$', static fn (array $p) => api_handle_question_bank_get($pdo, rawurldecode($p[1])));
    $router->addPattern('^POST /summer-homework/([^/]+)/submit$', static fn (array $p) => api_handle_summer_homework_submit($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /summer-homework/([^/]+)$', static fn (array $p) => api_handle_summer_homework_get($pdo, rawurldecode($p[1])));

    $router->addPattern('^POST /admin/summer-homework/attempts/(\d+)/marks$', static fn (array $p) => api_handle_admin_summer_homework_mark_attempt($pdo, (int) $p[1]));
    $router->addPattern('^POST /admin/summer-homework/(\d+)/media$', static fn (array $p) => api_handle_admin_summer_homework_media_upload($pdo, (int) $p[1]));
    $router->addPattern('^DELETE /admin/summer-homework/(\d+)/media/(\d+)$', static fn (array $p) => api_handle_admin_summer_homework_media_delete($pdo, (int) $p[1], (int) $p[2]));
    $router->addPattern('^POST /admin/summer-homework/(\d+)/import-questions$', static fn (array $p) => api_handle_admin_summer_homework_import_questions($pdo, (int) $p[1]));
    $router->addPattern('^GET /admin/summer-homework/(\d+)/analytics$', static fn (array $p) => api_handle_admin_summer_homework_analytics($pdo, (int) $p[1]));
    $router->addPattern('^GET /admin/summer-homework/(\d+)/attempts$', static fn (array $p) => api_handle_admin_summer_homework_attempts($pdo, (int) $p[1]));
    $router->addPattern('^GET /admin/summer-homework/(\d+)$', static fn (array $p) => api_handle_admin_summer_homework_get($pdo, (int) $p[1]));
    $router->addPattern('^GET /admin/classes/(\d+)/summer-homework\.csv$', static fn (array $p) => api_handle_admin_class_summer_homework_csv($pdo, (int) $p[1]));
    $router->addPattern('^GET /admin/classes/(\d+)/summer-homework$', static fn (array $p) => api_handle_admin_class_summer_homework($pdo, (int) $p[1]));
    $router->addPattern('^POST /admin/question-banks/(\d+)/media$', static fn (array $p) => api_handle_admin_question_bank_media_upload($pdo, (int) $p[1]));
    $router->addPattern('^DELETE /admin/question-banks/(\d+)/media/(\d+)$', static fn (array $p) => api_handle_admin_question_bank_media_delete($pdo, (int) $p[1], (int) $p[2]));
    $router->addPattern('^GET /admin/question-banks/(\d+)$', static fn (array $p) => api_handle_admin_question_bank_get($pdo, (int) $p[1]));

    $router->addPattern('^GET /courses/([^/]+)$', static fn (array $p) => api_handle_courses_subject($pdo, rawurldecode($p[1])));
    $router->addPattern('^GET /admin/topic-items/(\d+)/available/([^/]+)$', static fn (array $p) => api_handle_topic_items_available($pdo, (int) $p[1], rawurldecode($p[2])));
    $router->addPattern('^GET /admin/topic-items/(\d+)$', static fn (array $p) => api_handle_topic_items_list($pdo, (int) $p[1]));

    $router->addPattern(
        '^(GET|PATCH|PUT|POST|DELETE) /admin/users/(\d+)$',
        static fn (array $p) => api_handle_admin_user_item($pdo, (int) $p[2], strtoupper($p[1]))
    );
    $router->addPattern(
        '^POST /admin/users/(\d+)/inline$',
        static fn (array $p) => api_handle_admin_user_inline($pdo, (int) $p[1])
    );
    $router->addPattern(
        '^POST /admin/users/(\d+)/impersonate$',
        static fn (array $p) => api_handle_admin_user_impersonate($pdo, (int) $p[1])
    );

    $router->addPattern(
        '^(GET|PATCH|PUT|POST|DELETE) /admin/classes/(\d+)$',
        static fn (array $p) => api_handle_admin_class_item($pdo, (int) $p[2], strtoupper($p[1]))
    );
    $router->addPattern(
        '^POST /admin/classes/(\d+)/invite$',
        static fn (array $p) => api_handle_admin_class_invite($pdo, (int) $p[1])
    );
    $router->addPattern(
        '^POST /admin/classes/(\d+)/students$',
        static fn (array $p) => api_handle_admin_class_students($pdo, (int) $p[1], 'POST')
    );
    $router->addPattern(
        '^(PUT|PATCH|POST|DELETE) /admin/classes/(\d+)/students/(\d+)$',
        static fn (array $p) => api_handle_admin_class_student_item($pdo, (int) $p[2], (int) $p[3], strtoupper($p[1]))
    );

    $router->addPattern(
        '^(PATCH|PUT|POST|DELETE) /admin/subjects/(\d+)$',
        static fn (array $p) => api_handle_admin_subject_item($pdo, (int) $p[2], strtoupper($p[1]))
    );
    $router->addPattern(
        '^POST /admin/subjects/(\d+)/topics/reorder$',
        static fn (array $p) => api_handle_admin_subject_topics_reorder($pdo, (int) $p[1])
    );
    $router->addPattern(
        '^POST /admin/subjects/(\d+)/topics$',
        static fn (array $p) => api_handle_admin_subject_topics($pdo, (int) $p[1], 'POST')
    );
    $router->addPattern(
        '^(PATCH|PUT|POST|DELETE) /admin/topics/(\d+)$',
        static fn (array $p) => api_handle_admin_topic_item($pdo, (int) $p[2], strtoupper($p[1]))
    );

    $router->addPattern('^POST /review/learning-tools/(\d+)/publish$', static fn (array $p) => api_handle_review_lt_publish($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/learning-tools/(\d+)/reject$', static fn (array $p) => api_handle_review_lt_reject($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/articles/(\d+)/publish$', static fn (array $p) => api_handle_review_art_publish($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/articles/(\d+)/reject$', static fn (array $p) => api_handle_review_art_reject($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/learning-notes/(\d+)/publish$', static fn (array $p) => api_handle_review_ln_publish($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/learning-notes/(\d+)/reject$', static fn (array $p) => api_handle_review_ln_reject($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/worksheets/(\d+)/publish$', static fn (array $p) => api_handle_review_ws_publish($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/worksheets/(\d+)/reject$', static fn (array $p) => api_handle_review_ws_reject($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/learning-videos/(\d+)/publish$', static fn (array $p) => api_handle_review_lv_publish($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/learning-videos/(\d+)/reject$', static fn (array $p) => api_handle_review_lv_reject($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/question-banks/(\d+)/publish$', static fn (array $p) => api_handle_review_qb_publish($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/question-banks/(\d+)/reject$', static fn (array $p) => api_handle_review_qb_reject($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/summer-homework/(\d+)/publish$', static fn (array $p) => api_handle_review_sh_publish($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/summer-homework/(\d+)/reject$', static fn (array $p) => api_handle_review_sh_reject($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/simulations/(\d+)/publish$', static fn (array $p) => api_handle_review_sim_publish($pdo, (int) $p[1]));
    $router->addPattern('^POST /review/simulations/(\d+)/reject$', static fn (array $p) => api_handle_review_sim_reject($pdo, (int) $p[1]));

    $router->addPattern('^POST /teacher/classes/(\d+)/enroll$', static fn (array $p) => api_handle_teacher_class_enroll($pdo, (int) $p[1]));
    $router->addPattern('^POST /teacher/classes/(\d+)/invite$', static fn (array $p) => api_handle_teacher_class_invite($pdo, (int) $p[1]));
    $router->addPattern('^GET /teacher/classes/(\d+)/report\.csv$', static fn (array $p) => api_teacher_class_report_csv($pdo, (int) $p[1]));
    $router->addPattern('^GET /teacher/classes/(\d+)/report$', static fn (array $p) => api_handle_teacher_class_report($pdo, (int) $p[1]));
    $router->addPattern('^GET /teacher/classes/(\d+)/students/(\d+)$', static fn (array $p) => api_handle_teacher_class_student_detail($pdo, (int) $p[1], (int) $p[2]));
    $router->addPattern('^(GET|POST) /teacher/classes/(\d+)/worksheet-assignments$', static function (array $p) use ($pdo): void {
        api_handle_teacher_class_worksheet_assignments($pdo, (int) $p[2]);
    });
    $router->addPattern('^(GET|POST) /teacher/worksheet-assignments/(\d+)$', static function (array $p) use ($pdo): void {
        api_handle_teacher_worksheet_assignment_detail($pdo, (int) $p[2]);
    });
    $router->addPattern('^POST /teacher/worksheet-submissions/(\d+)/grade$', static fn (array $p) => api_handle_teacher_worksheet_submission_grade($pdo, (int) $p[1]));
    $router->addPattern('^GET /student/worksheet-assignments/(\d+)$', static fn (array $p) => api_handle_student_worksheet_assignment_get($pdo, (int) $p[1]));
    $router->addPattern('^POST /student/worksheet-assignments/(\d+)/submit$', static fn (array $p) => api_handle_student_worksheet_assignment_submit($pdo, (int) $p[1]));

    return $router;
}
