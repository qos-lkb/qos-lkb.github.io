-- 擴充 learning_videos.provider 以支援更多嵌入平台（改為 VARCHAR，避免 ENUM 截斷）
ALTER TABLE learning_videos
    MODIFY provider VARCHAR(32) NOT NULL DEFAULT 'youtube';
