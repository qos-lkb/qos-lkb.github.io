# 資料字典 | Data Dictionary

本文件由 [`update_data_dictionary.php`](update_data_dictionary.php) 自 [`schema.sql`](schema.sql) 自動產生；
亦可於後台 [`admin/data_dictionary.php`](admin/data_dictionary.php) 閱讀並重新產生。

```bash
php update_data_dictionary.php
```

> **注意**：本專案不使用 FOREIGN KEY；關聯由 PHP 應用層維護。

**最後更新**：2026-06-28 10:42 HKT

## 目錄 | Table of contents

- [Core: users, roles, permissions](#core-users-roles-permissions)
  - [`users`](#users)
  - [`roles`](#roles)
  - [`user_roles`](#user-roles)
  - [`permissions`](#permissions)
  - [`role_permissions`](#role-permissions)
- [Catalogue: subjects, topics, simulations, tags](#catalogue-subjects-topics-simulations-tags)
  - [`subjects`](#subjects)
  - [`topics`](#topics)
  - [`simulations`](#simulations)
  - [`tags`](#tags)
  - [`simulation_tags`](#simulation-tags)
- [API / auth helpers](#api-auth-helpers)
  - [`api_rate_limits`](#api-rate-limits)
- [Learning tools & science articles](#learning-tools-science-articles)
  - [`learning_tools`](#learning-tools)
  - [`quiz_questions`](#quiz-questions)
  - [`quiz_options`](#quiz-options)
  - [`science_articles`](#science-articles)
  - [`article_questions`](#article-questions)
  - [`article_options`](#article-options)
- [Learning notes & worksheets](#learning-notes-worksheets)
  - [`learning_notes`](#learning-notes)
  - [`worksheets`](#worksheets)
- [Self-study courses: videos & curriculum items](#self-study-courses-videos-curriculum-items)
  - [`learning_videos`](#learning-videos)
  - [`topic_learning_items`](#topic-learning-items)
- [Question banks](#question-banks)
  - [`question_banks`](#question-banks)
  - [`qb_questions`](#qb-questions)
  - [`qb_mcq_options`](#qb-mcq-options)
  - [`qb_question_parts`](#qb-question-parts)
  - [`qb_fill_blanks`](#qb-fill-blanks)
  - [`qb_question_media`](#qb-question-media)
- [Classes & SDL / adaptive learning](#classes-sdl-adaptive-learning)
  - [`classes`](#classes)
  - [`class_enrollments`](#class-enrollments)
  - [`student_profiles`](#student-profiles)
  - [`learning_events`](#learning-events)
  - [`learning_attempts`](#learning-attempts)
  - [`learning_responses`](#learning-responses)
  - [`topic_mastery`](#topic-mastery)
  - [`learning_goals`](#learning-goals)
  - [`content_bookmarks`](#content-bookmarks)
- [Worksheet assignments](#worksheet-assignments)
  - [`worksheet_assignments`](#worksheet-assignments)
  - [`worksheet_assignment_students`](#worksheet-assignment-students)
  - [`worksheet_submissions`](#worksheet-submissions)

## 概覽 | Overview

| 資料表 | 說明 | 引擎 |
|--------|------|------|
| `users` | 使用者帳戶（電郵、密碼雜湊、中英文名、啟用狀態） | InnoDB |
| `roles` | 角色定義（admin、teacher、student） | InnoDB |
| `user_roles` | 使用者與角色的多對多關聯 | InnoDB |
| `permissions` | 權限代碼與說明 | InnoDB |
| `role_permissions` | 角色與權限的多對多關聯 | InnoDB |
| `subjects` | 模擬／內容科目（slug、雙語名稱、排序） | InnoDB |
| `topics` | 科目下的課題／單元 | InnoDB |
| `simulations` | 互動模擬程式目錄與 HTML 路徑 | InnoDB |
| `tags` | 模擬標籤 | InnoDB |
| `simulation_tags` | 模擬與標籤的多對多關聯 | InnoDB |
| `api_rate_limits` | API 速率限制（如登入嘗試） | InnoDB |
| `learning_tools` | 互動學習工具（四選一 MCQ 集） | InnoDB |
| `quiz_questions` | 學習工具題目 | InnoDB |
| `quiz_options` | 學習工具 MCQ 選項 | InnoDB |
| `science_articles` | 科學文章（Markdown 內文） | InnoDB |
| `article_questions` | 文章理解題 | InnoDB |
| `article_options` | 文章理解題選項 | InnoDB |
| `learning_notes` | 學習筆記（Markdown） | InnoDB |
| `worksheets` | 工作紙（Markdown，可嵌入模擬／試題） | InnoDB |
| `learning_videos` | 自學課程嵌入影片（雙語 embed URL） | InnoDB |
| `topic_learning_items` | 課題混合編排（筆記、模擬、工作紙等排序） | InnoDB |
| `question_banks` | 試題庫 | InnoDB |
| `qb_questions` | 試題庫題目（多題型） | InnoDB |
| `qb_mcq_options` | 試題庫 MCQ 選項 | InnoDB |
| `qb_question_parts` | 長答子題 | InnoDB |
| `qb_fill_blanks` | 填充題可接受答案 | InnoDB |
| `qb_question_media` | 試題附件／圖片 | InnoDB |
| `classes` | 教師課程／班級（邀請碼） | InnoDB |
| `class_enrollments` | 學生選課紀錄（班別、班號、MOI） | InnoDB |
| `student_profiles` | 學生延伸資料（學號、級別、語言偏好） | InnoDB |
| `learning_events` | SDL 學習行為事件（頁面瀏覽、時數） | InnoDB |
| `learning_attempts` | 測驗／作答提交紀錄 | InnoDB |
| `learning_responses` | 單次作答的逐題回應 | InnoDB |
| `topic_mastery` | 課題掌握度分數 | InnoDB |
| `learning_goals` | 每週學習目標 | InnoDB |
| `content_bookmarks` | 使用者書籤 | InnoDB |
| `worksheet_assignments` | 工作紙派發（班級、截止、滿分） | InnoDB |
| `worksheet_assignment_students` | 派發對象（全班或指定學生） | InnoDB |
| `worksheet_submissions` | 學生提交、評分、自動計分 JSON | InnoDB |

## Core: users, roles, permissions

### `users`

使用者帳戶（電郵、密碼雜湊、中英文名、啟用狀態）

**引擎**：`InnoDB` · **欄位數**：9

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `email` | `VARCHAR(255)` | NO | — | — | — |
| `password_hash` | `VARCHAR(255)` | NO | — | — | — |
| `display_name` | `VARCHAR(255)` | NO | `''` | — | — |
| `name_zh` | `VARCHAR(255)` | NO | `''` | — | — |
| `name_en` | `VARCHAR(255)` | NO | `''` | — | — |
| `is_active` | `TINYINT(1)` | NO | `1` | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_users_email` | UNIQUE | `email` |

### `roles`

角色定義（admin、teacher、student）

**引擎**：`InnoDB` · **欄位數**：2

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `SMALLINT UNSIGNED` | NO | — | PK, AI | — |
| `name` | `VARCHAR(64)` | NO | — | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_roles_name` | UNIQUE | `name` |

### `user_roles`

使用者與角色的多對多關聯

**引擎**：`InnoDB` · **欄位數**：2

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `user_id` | `INT UNSIGNED` | NO | — | — | users.id |
| `role_id` | `SMALLINT UNSIGNED` | NO | — | — | roles.id |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `PRIMARY` | PRIMARY | `user_id,role_id` |
| `idx_user_roles_role` | KEY | `role_id` |

### `permissions`

權限代碼與說明

**引擎**：`InnoDB` · **欄位數**：3

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `SMALLINT UNSIGNED` | NO | — | PK, AI | — |
| `name` | `VARCHAR(96)` | NO | — | — | — |
| `description` | `VARCHAR(255) DEFAULT` | YES | `NULL` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_permissions_name` | UNIQUE | `name` |

### `role_permissions`

角色與權限的多對多關聯

**引擎**：`InnoDB` · **欄位數**：2

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `role_id` | `SMALLINT UNSIGNED` | NO | — | — | roles.id |
| `permission_id` | `SMALLINT UNSIGNED` | NO | — | — | permissions.id |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `PRIMARY` | PRIMARY | `role_id,permission_id` |
| `idx_rp_permission` | KEY | `permission_id` |

## Catalogue: subjects, topics, simulations, tags

### `subjects`

模擬／內容科目（slug、雙語名稱、排序）

**引擎**：`InnoDB` · **欄位數**：5

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `SMALLINT UNSIGNED` | NO | — | PK, AI | — |
| `slug` | `VARCHAR(128)` | NO | — | — | URL 識別碼（唯一） |
| `name_zh` | `VARCHAR(255)` | NO | `''` | — | — |
| `name_en` | `VARCHAR(255)` | NO | `''` | — | — |
| `sort_order` | `INT` | NO | `0` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_subjects_slug` | UNIQUE | `slug` |
| `idx_subjects_sort` | KEY | `sort_order` |

### `topics`

科目下的課題／單元

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `subject_id` | `SMALLINT UNSIGNED` | NO | — | — | subjects.id |
| `slug` | `VARCHAR(160)` | NO | — | — | URL 識別碼（唯一） |
| `name_zh` | `VARCHAR(255)` | NO | `''` | — | — |
| `name_en` | `VARCHAR(255)` | NO | `''` | — | — |
| `sort_order` | `INT` | NO | `0` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_topics_subject_slug` | UNIQUE | `subject_id,slug` |
| `idx_topics_subject_sort` | KEY | `subject_id,sort_order` |

### `simulations`

互動模擬程式目錄與 HTML 路徑

**引擎**：`InnoDB` · **欄位數**：14

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `owner_user_id` | `INT UNSIGNED` | YES | — | — | 內容擁有者 users.id |
| `slug` | `VARCHAR(200)` | NO | — | — | URL 識別碼（唯一） |
| `title_zh` | `VARCHAR(512)` | NO | `''` | — | — |
| `title_en` | `VARCHAR(512)` | NO | `''` | — | — |
| `html` | `LONGTEXT` | NO | — | — | — |
| `screenshot_path` | `VARCHAR(512)` | YES | — | — | — |
| `subject_id` | `SMALLINT UNSIGNED` | YES | — | — | subjects.id |
| `topic_id` | `INT UNSIGNED` | YES | — | — | topics.id |
| `list_sort_order` | `INT` | NO | `0` | — | — |
| `status` | `ENUM('draft', 'published')` | NO | `'draft'` | — | 狀態（見 ENUM 值） |
| `last_updated` | `DATE` | YES | — | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_simulations_slug` | UNIQUE | `slug` |
| `idx_sim_owner` | KEY | `owner_user_id` |
| `idx_sim_subject_topic` | KEY | `subject_id,topic_id` |
| `idx_sim_status` | KEY | `status` |
| `idx_sim_list_sort` | KEY | `subject_id,topic_id,list_sort_order` |

### `tags`

模擬標籤

**引擎**：`InnoDB` · **欄位數**：3

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `name` | `VARCHAR(128)` | NO | — | — | — |
| `slug` | `VARCHAR(160)` | NO | — | — | URL 識別碼（唯一） |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_tags_slug` | UNIQUE | `slug` |
| `idx_tags_name` | KEY | `name` |

### `simulation_tags`

模擬與標籤的多對多關聯

**引擎**：`InnoDB` · **欄位數**：2

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `simulation_id` | `INT UNSIGNED` | NO | — | — | — |
| `tag_id` | `INT UNSIGNED` | NO | — | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `PRIMARY` | PRIMARY | `simulation_id,tag_id` |
| `idx_st_tag` | KEY | `tag_id` |

## API / auth helpers

### `api_rate_limits`

API 速率限制（如登入嘗試）

**引擎**：`InnoDB` · **欄位數**：4

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `rate_key` | `VARCHAR(128)` | NO | — | — | — |
| `attempt_count` | `INT UNSIGNED` | NO | `1` | — | — |
| `window_start` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_api_rate_limits_key` | UNIQUE | `rate_key` |

## Learning tools & science articles

### `learning_tools`

互動學習工具（四選一 MCQ 集）

**引擎**：`InnoDB` · **欄位數**：14

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `slug` | `VARCHAR(190)` | NO | — | — | URL 識別碼（唯一） |
| `title_zh` | `VARCHAR(255)` | NO | `''` | — | — |
| `title_en` | `VARCHAR(255)` | NO | `''` | — | — |
| `description_zh` | `TEXT` | YES | — | — | — |
| `description_en` | `TEXT` | YES | — | — | — |
| `subject_id` | `INT UNSIGNED` | YES | — | — | subjects.id |
| `topic_id` | `INT UNSIGNED` | YES | — | — | topics.id |
| `owner_user_id` | `INT UNSIGNED` | YES | — | — | 內容擁有者 users.id |
| `linked_simulation_id` | `INT UNSIGNED` | YES | — | — | — |
| `list_sort_order` | `INT` | NO | `0` | — | — |
| `status` | `ENUM('draft', 'pending_review', 'published')` | NO | `'draft'` | — | 狀態（見 ENUM 值） |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_learning_tools_slug` | UNIQUE | `slug` |
| `idx_learning_tools_status` | KEY | `status` |
| `idx_learning_tools_owner` | KEY | `owner_user_id` |
| `idx_learning_tools_subject` | KEY | `subject_id` |
| `idx_learning_tools_topic` | KEY | `topic_id` |
| `idx_learning_tools_simulation` | KEY | `linked_simulation_id` |

### `quiz_questions`

學習工具題目

**引擎**：`InnoDB` · **欄位數**：7

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `learning_tool_id` | `INT UNSIGNED` | NO | — | — | — |
| `sort_order` | `INT` | NO | `0` | — | — |
| `stem_zh` | `TEXT` | NO | — | — | — |
| `stem_en` | `TEXT` | NO | — | — | — |
| `explanation_zh` | `TEXT` | YES | — | — | — |
| `explanation_en` | `TEXT` | YES | — | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_quiz_questions_tool` | KEY | `learning_tool_id` |

### `quiz_options`

學習工具 MCQ 選項

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `question_id` | `INT UNSIGNED` | NO | — | — | 題目 id（依上下文） |
| `sort_order` | `TINYINT UNSIGNED` | NO | `0` | — | — |
| `text_zh` | `VARCHAR(512)` | NO | `''` | — | — |
| `text_en` | `VARCHAR(512)` | NO | `''` | — | — |
| `is_correct` | `TINYINT(1)` | NO | `0` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_quiz_options_question` | KEY | `question_id` |

### `science_articles`

科學文章（Markdown 內文）

**引擎**：`InnoDB` · **欄位數**：14

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `slug` | `VARCHAR(190)` | NO | — | — | URL 識別碼（唯一） |
| `title_zh` | `VARCHAR(255)` | NO | `''` | — | — |
| `title_en` | `VARCHAR(255)` | NO | `''` | — | — |
| `body_zh` | `MEDIUMTEXT` | NO | — | — | — |
| `body_en` | `MEDIUMTEXT` | NO | — | — | — |
| `subject_id` | `INT UNSIGNED` | YES | — | — | subjects.id |
| `topic_id` | `INT UNSIGNED` | YES | — | — | topics.id |
| `owner_user_id` | `INT UNSIGNED` | YES | — | — | 內容擁有者 users.id |
| `reading_time_minutes` | `TINYINT UNSIGNED` | YES | — | — | — |
| `list_sort_order` | `INT` | NO | `0` | — | — |
| `status` | `ENUM('draft', 'pending_review', 'published')` | NO | `'draft'` | — | 狀態（見 ENUM 值） |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_science_articles_slug` | UNIQUE | `slug` |
| `idx_science_articles_status` | KEY | `status` |
| `idx_science_articles_owner` | KEY | `owner_user_id` |
| `idx_science_articles_subject` | KEY | `subject_id` |
| `idx_science_articles_topic` | KEY | `topic_id` |

### `article_questions`

文章理解題

**引擎**：`InnoDB` · **欄位數**：7

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `article_id` | `INT UNSIGNED` | NO | — | — | — |
| `sort_order` | `INT` | NO | `0` | — | — |
| `stem_zh` | `TEXT` | NO | — | — | — |
| `stem_en` | `TEXT` | NO | — | — | — |
| `explanation_zh` | `TEXT` | YES | — | — | — |
| `explanation_en` | `TEXT` | YES | — | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_article_questions_article` | KEY | `article_id` |

### `article_options`

文章理解題選項

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `question_id` | `INT UNSIGNED` | NO | — | — | 題目 id（依上下文） |
| `sort_order` | `TINYINT UNSIGNED` | NO | `0` | — | — |
| `text_zh` | `VARCHAR(512)` | NO | `''` | — | — |
| `text_en` | `VARCHAR(512)` | NO | `''` | — | — |
| `is_correct` | `TINYINT(1)` | NO | `0` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_article_options_question` | KEY | `question_id` |

## Learning notes & worksheets

### `learning_notes`

學習筆記（Markdown）

**引擎**：`InnoDB` · **欄位數**：14

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `slug` | `VARCHAR(190)` | NO | — | — | URL 識別碼（唯一） |
| `title_zh` | `VARCHAR(255)` | NO | `''` | — | — |
| `title_en` | `VARCHAR(255)` | NO | `''` | — | — |
| `body_zh` | `MEDIUMTEXT` | NO | — | — | — |
| `body_en` | `MEDIUMTEXT` | NO | — | — | — |
| `subject_id` | `INT UNSIGNED` | YES | — | — | subjects.id |
| `topic_id` | `INT UNSIGNED` | YES | — | — | topics.id |
| `owner_user_id` | `INT UNSIGNED` | YES | — | — | 內容擁有者 users.id |
| `reading_time_minutes` | `TINYINT UNSIGNED` | YES | — | — | — |
| `list_sort_order` | `INT` | NO | `0` | — | — |
| `status` | `ENUM('draft', 'pending_review', 'published')` | NO | `'draft'` | — | 狀態（見 ENUM 值） |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_learning_notes_slug` | UNIQUE | `slug` |
| `idx_learning_notes_status` | KEY | `status` |
| `idx_learning_notes_owner` | KEY | `owner_user_id` |
| `idx_learning_notes_subject` | KEY | `subject_id` |
| `idx_learning_notes_topic` | KEY | `topic_id` |

### `worksheets`

工作紙（Markdown，可嵌入模擬／試題）

**引擎**：`InnoDB` · **欄位數**：15

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `slug` | `VARCHAR(190)` | NO | — | — | URL 識別碼（唯一） |
| `title_zh` | `VARCHAR(255)` | NO | `''` | — | — |
| `title_en` | `VARCHAR(255)` | NO | `''` | — | — |
| `description_zh` | `TEXT` | YES | — | — | — |
| `description_en` | `TEXT` | YES | — | — | — |
| `body_zh` | `MEDIUMTEXT` | NO | — | — | — |
| `body_en` | `MEDIUMTEXT` | NO | — | — | — |
| `subject_id` | `INT UNSIGNED` | YES | — | — | subjects.id |
| `topic_id` | `INT UNSIGNED` | YES | — | — | topics.id |
| `owner_user_id` | `INT UNSIGNED` | YES | — | — | 內容擁有者 users.id |
| `list_sort_order` | `INT` | NO | `0` | — | — |
| `status` | `ENUM('draft', 'pending_review', 'published')` | NO | `'draft'` | — | 狀態（見 ENUM 值） |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_worksheets_slug` | UNIQUE | `slug` |
| `idx_worksheets_status` | KEY | `status` |
| `idx_worksheets_owner` | KEY | `owner_user_id` |
| `idx_worksheets_subject` | KEY | `subject_id` |
| `idx_worksheets_topic` | KEY | `topic_id` |

## Self-study courses: videos & curriculum items

### `learning_videos`

自學課程嵌入影片（雙語 embed URL）

**引擎**：`InnoDB` · **欄位數**：17

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `slug` | `VARCHAR(190)` | NO | — | — | URL 識別碼（唯一） |
| `title_zh` | `VARCHAR(255)` | NO | `''` | — | — |
| `title_en` | `VARCHAR(255)` | NO | `''` | — | — |
| `embed_url` | `VARCHAR(512)` | NO | `''` | — | — |
| `provider` | `VARCHAR(32)` | NO | `'youtube'` | — | — |
| `embed_url_zh` | `VARCHAR(512) DEFAULT` | YES | `NULL` | — | — |
| `provider_zh` | `VARCHAR(32) DEFAULT` | YES | `NULL` | — | — |
| `embed_url_en` | `VARCHAR(512) DEFAULT` | YES | `NULL` | — | — |
| `provider_en` | `VARCHAR(32) DEFAULT` | YES | `NULL` | — | — |
| `subject_id` | `INT UNSIGNED` | YES | — | — | subjects.id |
| `topic_id` | `INT UNSIGNED` | YES | — | — | topics.id |
| `owner_user_id` | `INT UNSIGNED` | YES | — | — | 內容擁有者 users.id |
| `duration_minutes` | `TINYINT UNSIGNED` | YES | — | — | — |
| `status` | `ENUM('draft', 'pending_review', 'published')` | NO | `'draft'` | — | 狀態（見 ENUM 值） |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_learning_videos_slug` | UNIQUE | `slug` |
| `idx_learning_videos_status` | KEY | `status` |
| `idx_learning_videos_owner` | KEY | `owner_user_id` |
| `idx_learning_videos_subject` | KEY | `subject_id` |
| `idx_learning_videos_topic` | KEY | `topic_id` |

### `topic_learning_items`

課題混合編排（筆記、模擬、工作紙等排序）

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `topic_id` | `INT UNSIGNED` | NO | — | — | topics.id |
| `content_type` | `ENUM('note', 'simulation', 'worksheet', 'article', 'learning_tool', 'video')` | NO | — | — | — |
| `content_id` | `INT UNSIGNED` | NO | — | — | — |
| `sort_order` | `INT` | NO | `0` | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_topic_learning_item` | UNIQUE | `topic_id,content_type,content_id` |
| `idx_topic_learning_items_topic` | KEY | `topic_id` |
| `idx_topic_learning_items_sort` | KEY | `topic_id,sort_order` |

## Question banks

### `question_banks`

試題庫

**引擎**：`InnoDB` · **欄位數**：13

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `slug` | `VARCHAR(190)` | NO | — | — | URL 識別碼（唯一） |
| `title_zh` | `VARCHAR(255)` | NO | `''` | — | — |
| `title_en` | `VARCHAR(255)` | NO | `''` | — | — |
| `description_zh` | `TEXT` | YES | — | — | — |
| `description_en` | `TEXT` | YES | — | — | — |
| `subject_id` | `INT UNSIGNED` | YES | — | — | subjects.id |
| `topic_id` | `INT UNSIGNED` | YES | — | — | topics.id |
| `owner_user_id` | `INT UNSIGNED` | YES | — | — | 內容擁有者 users.id |
| `list_sort_order` | `INT` | NO | `0` | — | — |
| `status` | `ENUM('draft', 'pending_review', 'published')` | NO | `'draft'` | — | 狀態（見 ENUM 值） |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_question_banks_slug` | UNIQUE | `slug` |
| `idx_question_banks_status` | KEY | `status` |
| `idx_question_banks_owner` | KEY | `owner_user_id` |
| `idx_question_banks_subject` | KEY | `subject_id` |
| `idx_question_banks_topic` | KEY | `topic_id` |

### `qb_questions`

試題庫題目（多題型）

**引擎**：`InnoDB` · **欄位數**：19

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `bank_id` | `INT UNSIGNED` | NO | — | — | question_banks.id |
| `question_code` | `VARCHAR(64) DEFAULT` | YES | `NULL` | — | — |
| `question_type` | `ENUM('mcq', 'short_answer', 'long_answer', 'fill_blank', 'true_false')` | NO | — | — | — |
| `subject_id` | `INT UNSIGNED DEFAULT` | YES | `NULL` | — | subjects.id |
| `topic_id` | `INT UNSIGNED DEFAULT` | YES | `NULL` | — | topics.id |
| `difficulty` | `ENUM('easy', 'medium', 'hard') DEFAULT` | YES | `NULL` | — | — |
| `source_zh` | `VARCHAR(512) DEFAULT` | YES | `NULL` | — | — |
| `source_en` | `VARCHAR(512) DEFAULT` | YES | `NULL` | — | — |
| `content_format` | `ENUM('markdown', 'plain')` | NO | `'markdown'` | — | — |
| `sort_order` | `INT` | NO | `0` | — | — |
| `default_score` | `DECIMAL(6,2) DEFAULT` | YES | `NULL` | — | — |
| `stem_zh` | `MEDIUMTEXT` | NO | — | — | — |
| `stem_en` | `MEDIUMTEXT` | NO | — | — | — |
| `explanation_zh` | `MEDIUMTEXT` | YES | — | — | — |
| `explanation_en` | `MEDIUMTEXT` | YES | — | — | — |
| `model_answer_zh` | `MEDIUMTEXT` | YES | — | — | — |
| `model_answer_en` | `MEDIUMTEXT` | YES | — | — | — |
| `true_false_answer` | `TINYINT(1)` | YES | — | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_qb_questions_code` | UNIQUE | `question_code` |
| `idx_qb_questions_bank` | KEY | `bank_id` |
| `idx_qb_questions_type` | KEY | `question_type` |
| `idx_qb_questions_subject` | KEY | `subject_id` |
| `idx_qb_questions_topic` | KEY | `topic_id` |
| `idx_qb_questions_difficulty` | KEY | `difficulty` |

### `qb_mcq_options`

試題庫 MCQ 選項

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `question_id` | `INT UNSIGNED` | NO | — | — | 題目 id（依上下文） |
| `sort_order` | `TINYINT UNSIGNED` | NO | `0` | — | — |
| `text_zh` | `TEXT` | NO | — | — | — |
| `text_en` | `TEXT` | NO | — | — | — |
| `is_correct` | `TINYINT(1)` | NO | `0` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_qb_mcq_options_question` | KEY | `question_id` |

### `qb_question_parts`

長答子題

**引擎**：`InnoDB` · **欄位數**：9

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `question_id` | `INT UNSIGNED` | NO | — | — | 題目 id（依上下文） |
| `part_label` | `VARCHAR(16)` | NO | `'a'` | — | — |
| `sort_order` | `TINYINT UNSIGNED` | NO | `0` | — | — |
| `prompt_zh` | `MEDIUMTEXT` | NO | — | — | — |
| `prompt_en` | `MEDIUMTEXT` | NO | — | — | — |
| `model_answer_zh` | `MEDIUMTEXT` | YES | — | — | — |
| `model_answer_en` | `MEDIUMTEXT` | YES | — | — | — |
| `marks` | `TINYINT UNSIGNED` | YES | — | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_qb_question_parts_question` | KEY | `question_id` |

### `qb_fill_blanks`

填充題可接受答案

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `question_id` | `INT UNSIGNED` | NO | — | — | 題目 id（依上下文） |
| `blank_index` | `TINYINT UNSIGNED` | NO | `1` | — | — |
| `acceptable_answer_zh` | `TEXT` | NO | — | — | — |
| `acceptable_answer_en` | `TEXT` | NO | — | — | — |
| `sort_order` | `TINYINT UNSIGNED` | NO | `0` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_qb_fill_blanks_question` | KEY | `question_id` |

### `qb_question_media`

試題附件／圖片

**引擎**：`InnoDB` · **欄位數**：12

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `question_id` | `INT UNSIGNED` | NO | — | — | 題目 id（依上下文） |
| `media_role` | `ENUM('stem', 'option', 'part', 'explanation', 'answer', 'general')` | NO | `'general'` | — | — |
| `related_sort` | `TINYINT UNSIGNED DEFAULT` | YES | `NULL` | — | — |
| `file_path` | `VARCHAR(512)` | NO | — | — | — |
| `original_name` | `VARCHAR(255)` | NO | `''` | — | — |
| `mime_type` | `VARCHAR(128)` | NO | `'image/jpeg'` | — | — |
| `file_size` | `INT UNSIGNED` | NO | `0` | — | — |
| `alt_zh` | `VARCHAR(255) DEFAULT` | YES | `NULL` | — | — |
| `alt_en` | `VARCHAR(255) DEFAULT` | YES | `NULL` | — | — |
| `sort_order` | `TINYINT UNSIGNED` | NO | `0` | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_qb_question_media_question` | KEY | `question_id` |

## Classes & SDL / adaptive learning

### `classes`

教師課程／班級（邀請碼）

**引擎**：`InnoDB` · **欄位數**：9

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `name` | `VARCHAR(255)` | NO | — | — | — |
| `school_year` | `VARCHAR(32)` | NO | `''` | — | — |
| `subject_id` | `INT UNSIGNED` | YES | — | — | subjects.id |
| `invite_code` | `VARCHAR(32)` | NO | — | — | 班級邀請／註冊碼 |
| `teacher_user_id` | `INT UNSIGNED` | NO | — | — | — |
| `is_active` | `TINYINT(1)` | NO | `1` | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_classes_invite` | UNIQUE | `invite_code` |
| `idx_classes_teacher` | KEY | `teacher_user_id` |
| `idx_classes_subject` | KEY | `subject_id` |
| `idx_classes_active` | KEY | `is_active` |

### `class_enrollments`

學生選課紀錄（班別、班號、MOI）

**引擎**：`InnoDB` · **欄位數**：8

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `class_id` | `INT UNSIGNED` | NO | — | — | classes.id |
| `user_id` | `INT UNSIGNED` | NO | — | — | users.id |
| `status` | `ENUM('active', 'pending', 'left')` | NO | `'active'` | — | 狀態（見 ENUM 值） |
| `form_class` | `VARCHAR(16)` | YES | — | — | — |
| `class_no` | `SMALLINT UNSIGNED` | YES | — | — | — |
| `moi` | `ENUM('E', 'C')` | YES | — | — | 應考語言：E=英文、C=中文 |
| `joined_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_class_enrollment` | UNIQUE | `class_id,user_id` |
| `idx_enrollments_user` | KEY | `user_id` |
| `idx_enrollments_class` | KEY | `class_id` |

### `student_profiles`

學生延伸資料（學號、級別、語言偏好）

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `user_id` | `INT UNSIGNED` | NO | — | PK | users.id |
| `student_number` | `VARCHAR(64)` | YES | — | — | — |
| `form_level` | `ENUM('1', '2', '3', '4', '5', '6')` | YES | — | — | — |
| `preferred_lang` | `ENUM('zh', 'en')` | NO | `'zh'` | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

### `learning_events`

SDL 學習行為事件（頁面瀏覽、時數）

**引擎**：`InnoDB` · **欄位數**：11

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `BIGINT UNSIGNED` | NO | — | PK, AI | — |
| `user_id` | `INT UNSIGNED` | NO | — | — | users.id |
| `session_id` | `VARCHAR(64)` | NO | `''` | — | — |
| `event_type` | `VARCHAR(64)` | NO | — | — | — |
| `content_type` | `VARCHAR(32)` | YES | — | — | — |
| `content_id` | `VARCHAR(190)` | YES | — | — | — |
| `subject_id` | `INT UNSIGNED` | YES | — | — | subjects.id |
| `topic_id` | `INT UNSIGNED` | YES | — | — | topics.id |
| `duration_seconds` | `INT UNSIGNED` | YES | — | — | — |
| `metadata` | `JSON` | YES | — | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_learning_events_user` | KEY | `user_id` |
| `idx_learning_events_user_created` | KEY | `user_id,created_at` |
| `idx_learning_events_type` | KEY | `event_type` |
| `idx_learning_events_topic` | KEY | `user_id,topic_id` |

### `learning_attempts`

測驗／作答提交紀錄

**引擎**：`InnoDB` · **欄位數**：10

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `BIGINT UNSIGNED` | NO | — | PK, AI | — |
| `user_id` | `INT UNSIGNED` | NO | — | — | users.id |
| `source_type` | `ENUM('learning_tool', 'article', 'question_bank')` | NO | — | — | — |
| `source_id` | `INT UNSIGNED` | NO | — | — | — |
| `subject_id` | `INT UNSIGNED` | YES | — | — | subjects.id |
| `topic_id` | `INT UNSIGNED` | YES | — | — | topics.id |
| `score` | `SMALLINT UNSIGNED` | NO | `0` | — | — |
| `max_score` | `SMALLINT UNSIGNED` | NO | `0` | — | — |
| `started_at` | `TIMESTAMP` | YES | — | — | — |
| `submitted_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_attempts_user` | KEY | `user_id` |
| `idx_attempts_user_submitted` | KEY | `user_id,submitted_at` |
| `idx_attempts_source` | KEY | `source_type,source_id` |
| `idx_attempts_topic` | KEY | `user_id,topic_id` |

### `learning_responses`

單次作答的逐題回應

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `BIGINT UNSIGNED` | NO | — | PK, AI | — |
| `attempt_id` | `BIGINT UNSIGNED` | NO | — | — | — |
| `question_id` | `INT UNSIGNED` | NO | — | — | 題目 id（依上下文） |
| `selected_option_index` | `TINYINT` | YES | — | — | — |
| `is_correct` | `TINYINT(1)` | NO | `0` | — | — |
| `response_text` | `TEXT` | YES | — | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_responses_attempt` | KEY | `attempt_id` |
| `idx_responses_question` | KEY | `question_id` |

### `topic_mastery`

課題掌握度分數

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `user_id` | `INT UNSIGNED` | NO | — | — | users.id |
| `topic_id` | `INT UNSIGNED` | NO | — | — | topics.id |
| `mastery_score` | `DECIMAL(5,2)` | NO | `0` | — | — |
| `attempt_count` | `INT UNSIGNED` | NO | `0` | — | — |
| `last_attempt_at` | `TIMESTAMP` | YES | — | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `PRIMARY` | PRIMARY | `user_id,topic_id` |
| `idx_mastery_topic` | KEY | `topic_id` |

### `learning_goals`

每週學習目標

**引擎**：`InnoDB` · **欄位數**：6

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `user_id` | `INT UNSIGNED` | NO | — | — | users.id |
| `goal_type` | `ENUM('weekly_minutes', 'weekly_items')` | NO | `'weekly_minutes'` | — | — |
| `target_value` | `INT UNSIGNED` | NO | `60` | — | — |
| `period_start` | `DATE` | NO | — | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_goals_user` | KEY | `user_id` |
| `idx_goals_user_period` | KEY | `user_id,period_start` |

### `content_bookmarks`

使用者書籤

**引擎**：`InnoDB` · **欄位數**：5

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `user_id` | `INT UNSIGNED` | NO | — | — | users.id |
| `content_type` | `VARCHAR(32)` | NO | — | — | — |
| `content_slug` | `VARCHAR(190)` | NO | — | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_bookmark` | UNIQUE | `user_id,content_type,content_slug` |
| `idx_bookmarks_user` | KEY | `user_id` |

## Worksheet assignments

### `worksheet_assignments`

工作紙派發（班級、截止、滿分）

**引擎**：`InnoDB` · **欄位數**：14

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `class_id` | `INT UNSIGNED` | NO | — | — | classes.id |
| `worksheet_id` | `INT UNSIGNED` | NO | — | — | worksheets.id |
| `assigned_by_user_id` | `INT UNSIGNED` | NO | — | — | — |
| `title_zh` | `VARCHAR(255)` | YES | — | — | — |
| `title_en` | `VARCHAR(255)` | YES | — | — | — |
| `instructions_zh` | `TEXT` | YES | — | — | — |
| `instructions_en` | `TEXT` | YES | — | — | — |
| `due_at` | `TIMESTAMP` | YES | — | — | — |
| `max_score` | `DECIMAL(6,2)` | NO | `100.00` | — | — |
| `status` | `ENUM('draft', 'active', 'closed')` | NO | `'active'` | — | 狀態（見 ENUM 值） |
| `assign_all` | `TINYINT(1)` | NO | `1` | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `idx_wa_class` | KEY | `class_id` |
| `idx_wa_worksheet` | KEY | `worksheet_id` |
| `idx_wa_status` | KEY | `status` |
| `idx_wa_teacher` | KEY | `assigned_by_user_id` |

### `worksheet_assignment_students`

派發對象（全班或指定學生）

**引擎**：`InnoDB` · **欄位數**：2

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `assignment_id` | `INT UNSIGNED` | NO | — | — | worksheet_assignments.id |
| `user_id` | `INT UNSIGNED` | NO | — | — | users.id |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `PRIMARY` | PRIMARY | `assignment_id,user_id` |
| `idx_was_user` | KEY | `user_id` |

### `worksheet_submissions`

學生提交、評分、自動計分 JSON

**引擎**：`InnoDB` · **欄位數**：15

| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |
|------|------|:----:|------|:---:|------|
| `id` | `INT UNSIGNED` | NO | — | PK, AI | — |
| `assignment_id` | `INT UNSIGNED` | NO | — | — | worksheet_assignments.id |
| `user_id` | `INT UNSIGNED` | NO | — | — | users.id |
| `status` | `ENUM('pending', 'submitted', 'graded')` | NO | `'pending'` | — | 狀態（見 ENUM 值） |
| `submitted_at` | `TIMESTAMP` | YES | — | — | — |
| `score` | `DECIMAL(6,2)` | YES | — | — | — |
| `feedback_zh` | `TEXT` | YES | — | — | — |
| `feedback_en` | `TEXT` | YES | — | — | — |
| `graded_by_user_id` | `INT UNSIGNED` | YES | — | — | — |
| `graded_at` | `TIMESTAMP` | YES | — | — | — |
| `student_comment` | `TEXT` | YES | — | — | — |
| `responses_json` | `JSON` | YES | — | — | 工作紙作答 JSON（自動計分） |
| `auto_score` | `DECIMAL(6,2)` | YES | — | — | — |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | — | — |

#### 索引 | Indexes

| 名稱 | 類型 | 欄位 |
|------|------|------|
| `uq_ws_submission` | UNIQUE | `assignment_id,user_id` |
| `idx_ws_sub_user` | KEY | `user_id` |
| `idx_ws_sub_status` | KEY | `status` |

---

## 相關文件

- [`schema.sql`](schema.sql) — 完整 DDL
- [`architecture.md`](architecture.md) — 架構與 API
- [`admin/data_dictionary.php`](admin/data_dictionary.php) — 後台閱讀器

