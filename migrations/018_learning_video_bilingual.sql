-- 學習影片：分別儲存中文及英文嵌入版本
ALTER TABLE learning_videos
    ADD COLUMN embed_url_zh VARCHAR(512) NULL DEFAULT NULL AFTER embed_url,
    ADD COLUMN provider_zh VARCHAR(32) NULL DEFAULT NULL AFTER provider,
    ADD COLUMN embed_url_en VARCHAR(512) NULL DEFAULT NULL AFTER embed_url_zh,
    ADD COLUMN provider_en VARCHAR(32) NULL DEFAULT NULL AFTER provider_zh;

UPDATE learning_videos
SET embed_url_zh = embed_url,
    provider_zh = provider,
    embed_url_en = embed_url,
    provider_en = provider
WHERE embed_url IS NOT NULL AND embed_url <> '';
