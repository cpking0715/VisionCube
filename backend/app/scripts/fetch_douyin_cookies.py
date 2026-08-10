"""用 playwright 刷新抖音新鲜 cookies（Netscape 格式），供 yt-dlp 解析使用。

抖音风控要求"新鲜 cookies"（不一定要登录）。playwright 打开抖音网页版
即可生成 ttwid 等有效 cookies。cookies 可能随时间失效，任务解析失败
（Fresh cookies are needed）时重新运行本脚本即可。

用法：
    python -m app.scripts.fetch_douyin_cookies
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

from app.core.config import settings

COOKIE_FILE = Path(settings.data_root) / "douyin_cookies.txt"
VIDEO_ID = "7634727122729377994"  # 仅用于触发完整风控 cookies，无副作用


async def main() -> int:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
        ])
        ctx = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            ),
            locale="zh-CN",
        )
        page = await ctx.new_page()
        try:
            await page.goto("https://www.douyin.com/", timeout=30000, wait_until="domcontentloaded")
            await page.wait_for_timeout(6000)  # 等待首页 JS 生成 cookies
        except Exception as e:
            print(f"page load warning: {e}")

        # 访问一个视频页，触发更完整的风控 cookies
        try:
            await page.goto(
                f"https://www.douyin.com/video/{VIDEO_ID}",
                timeout=30000, wait_until="domcontentloaded",
            )
            await page.wait_for_timeout(8000)
        except Exception as e:
            print(f"video page warning: {e}")

        cookies = await ctx.cookies()
        print(f"got {len(cookies)} cookies")
        if not cookies:
            print("NO COOKIES - douyin blocked the visit")
            await browser.close()
            return 1

        # 导出 Netscape 格式（session cookie 的 expires 写 0）
        COOKIE_FILE.parent.mkdir(parents=True, exist_ok=True)
        lines = ["# Netscape HTTP Cookie File"]
        for c in cookies:
            domain = c["domain"]
            if not domain.startswith("."):
                domain = "." + domain
            flag = "TRUE" if domain.startswith(".") else "FALSE"
            path = c.get("path", "/")
            secure = "TRUE" if c.get("secure") else "FALSE"
            expires = max(0, int(c.get("expires", 0)))
            lines.append(
                f"{domain}\t{flag}\t{path}\t{secure}\t{expires}\t{c['name']}\t{c['value']}"
            )
        COOKIE_FILE.write_text("\n".join(lines), encoding="utf-8")
        print(f"cookies saved: {COOKIE_FILE}")

        await browser.close()
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
