#!/usr/bin/env python3
"""Convert book.txt plain text to Markdown (book.md)."""

import re
import sys
from pathlib import Path

FW = "\u3000"


def count_fw_spaces(line: str) -> int:
    n = 0
    for ch in line:
        if ch == FW:
            n += 1
        else:
            break
    return n


def is_watermark(line: str) -> bool:
    return "doosho.com" in line


def is_step(line: str) -> bool:
    return bool(re.match(r"^STEP\s+(ONE|TWO|THREE|FOUR|FIVE|SIX)\b", line.strip()))


def is_chapter(line: str) -> bool:
    return bool(re.match(r"^第[一二三四五六七八九十百千零\d]+章", line.strip()))


def is_feynman_chapter(line: str) -> bool:
    s = line.strip()
    return s.startswith("费曼技巧：") or s.startswith("费曼学习")


def is_special_heading(line: str) -> bool:
    s = line.strip()
    return s in {"前言", "后记", "图书在版编目（CIP）数据"}


def is_keywords(line: str) -> bool:
    return line.strip().startswith("关键词：")


def is_list_item(line: str) -> bool:
    s = line.strip()
    return bool(
        re.match(r"^(第[一二三四五六七八九十]+)[，,]", s)
        or re.match(r"^\d+\.", s)
        or re.match(r"^[A-Z．\.]", s)
        or s.startswith(("★", "▲"))
    )


def is_likely_section_title(line: str, prev: str, nxt: str) -> bool:
    s = line.strip()
    if not s or len(s) > 45:
        return False
    if is_step(s) or is_chapter(s) or is_feynman_chapter(s) or is_special_heading(s):
        return True
    if is_keywords(s):
        return False
    if s.endswith(("。", "！", "？", "，", "；", "：", "）", "」", "』", "”", '"')):
        return False
    if re.search(r"[。！？]", s):
        return False
    if is_list_item(s):
        return False
    if prev.strip() or nxt.strip():
        return False
    if len(s) < 2:
        return False
    # Subsection titles in body (e.g. 两种学习，你是哪一种？)
    return True


def heading_level(line: str, in_toc: bool) -> int | None:
    s = line.strip()
    indent = count_fw_spaces(line)

    if in_toc:
        if indent == 1 and is_step(s):
            return 2
        if indent == 2 and (is_chapter(s) or is_feynman_chapter(s)):
            return 3
        if indent == 3:
            return 4
        if indent == 1 and s == "后记":
            return 3
        return None

    if is_step(s):
        return 2
    if is_chapter(s) or is_feynman_chapter(s):
        return 3
    if is_special_heading(s):
        return 2 if s != "图书在版编目（CIP）数据" else 3
    return None


def format_line(line: str) -> str:
    s = line.strip()
    if s.startswith("——"):
        return f"> {s}"
    if is_keywords(s):
        return f"**{s}**"
    if s.startswith("★"):
        return f"- **{s[1:].strip()}**"
    if s.startswith("▲"):
        return f"- {s[1:].strip()}"
    m = re.match(r"^(第[一二三四五六七八九十]+)[，,](.+)$", s)
    if m:
        return f"**{m.group(1)}，**{m.group(2)}"
    return line.rstrip()


def convert(lines: list[str]) -> str:
    out: list[str] = []
    in_toc = True
    title_written = False
    cip_block = False
    skip_until = 0

    i = 0
    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip("\n\r")

        if i < skip_until:
            i += 1
            continue

        if is_watermark(line):
            i += 1
            continue

        stripped = line.strip()

        # Skip duplicate title block before CIP
        if stripped == "费曼学习法：用输出倒逼输入 - 尹红心、李伟著" and title_written:
            i += 1
            while i < len(lines) and not lines[i].strip():
                i += 1
            continue

        # End TOC at first watermark or CIP
        if in_toc and (stripped == "图书在版编目（CIP）数据" or is_watermark(line)):
            in_toc = False
            out.append("")
            out.append("---")
            out.append("")

        if not stripped:
            if out and out[-1] != "":
                out.append("")
            i += 1
            continue

        # Book title (first line)
        if not title_written and stripped.startswith("费曼学习法"):
            out.append(f"# {stripped}")
            out.append("")
            title_written = True
            i += 1
            continue

        if in_toc and stripped == "后记" and count_fw_spaces(line) >= 2:
            out.append("### 后记")
            out.append("")
            i += 1
            continue

        hl = heading_level(line, in_toc)
        if hl:
            prefix = "#" * hl
            out.append(f"{prefix} {stripped}")
            out.append("")
            if stripped == "图书在版编目（CIP）数据":
                cip_block = True
            i += 1
            continue

        if cip_block and stripped.startswith("江苏凤凰文艺版图书"):
            out.append(stripped)
            out.append("")
            out.append("---")
            out.append("")
            cip_block = False
            i += 1
            continue

        if cip_block:
            out.append(stripped)
            i += 1
            continue

        prev = lines[i - 1].strip() if i > 0 else ""
        nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""

        if is_likely_section_title(line, prev, nxt):
            out.append(f"#### {stripped}")
            out.append("")
            i += 1
            continue

        out.append(format_line(line))
        i += 1

    # Collapse excessive blank lines
    text = "\n".join(out)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip() + "\n"


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "book.txt")
    dst = Path(sys.argv[2] if len(sys.argv) > 2 else "book.md")

    if not src.exists() or src.stat().st_size == 0:
        print(f"Error: {src} is missing or empty. Save book.txt first.", file=sys.stderr)
        sys.exit(1)

    lines = src.read_text(encoding="utf-8").splitlines()
    md = convert(lines)
    dst.write_text(md, encoding="utf-8")
    print(f"Wrote {dst} ({len(md):,} chars, {md.count(chr(10)):,} lines)")


if __name__ == "__main__":
    main()
