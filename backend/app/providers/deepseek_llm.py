"""DeepSeek LLM Provider（OpenAI 兼容 API）

DeepSeek 提供 OpenAI 兼容的 API 接口，可直接使用 openai SDK 调用。
文档：https://platform.deepseek.com/api-docs/
"""
import json
import logging

from openai import OpenAI

from app.core.config import settings
from app.providers.base import LlmProvider

logger = logging.getLogger(__name__)


class DeepSeekLlm(LlmProvider):
    """DeepSeek LLM（OpenAI 兼容）"""

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url or "https://api.deepseek.com/v1",
            timeout=120.0,  # 避免网络黑洞时挂起过久（默认 600s * 2 重试）
            max_retries=1,
        )
        self.model = settings.llm_model or "deepseek-chat"

    def complete(self, prompt: str, *, json_mode: bool = False) -> str:
        """
        调用 LLM 完成文本生成
        
        Args:
            prompt: 提示词
            json_mode: 是否启用 JSON 模式（强制输出 JSON 格式）
        
        Returns:
            生成的文本
        """
        logger.info(f"调用 DeepSeek LLM，模型: {self.model}，JSON 模式: {json_mode}")
        
        messages = [
            {"role": "system", "content": "你是一个专业的短视频内容分析助手。"},
            {"role": "user", "content": prompt},
        ]
        
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
        }
        
        # 启用 JSON 模式
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        
        try:
            response = self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            
            logger.info(f"LLM 生成完成，长度: {len(content)} 字符")
            
            # 如果是 JSON 模式，验证一下是否能解析
            if json_mode:
                try:
                    json.loads(content)
                except json.JSONDecodeError as e:
                    logger.warning(f"LLM 输出不是有效 JSON: {e}")
                    # 尝试提取 JSON 部分
                    content = self._extract_json(content)
            
            return content
            
        except Exception as e:
            logger.error(f"DeepSeek LLM 调用失败: {e}")
            raise

    def _extract_json(self, text: str) -> str:
        """
        从文本中提取 JSON 部分
        
        有时 LLM 会在 JSON 前后添加说明文字，需要提取出来
        """
        # 查找第一个 { 和最后一个 }
        start = text.find("{")
        end = text.rfind("}")
        
        if start != -1 and end != -1 and end > start:
            return text[start:end+1]
        
        # 查找数组
        start = text.find("[")
        end = text.rfind("]")
        
        if start != -1 and end != -1 and end > start:
            return text[start:end+1]
        
        return text

    def rewrite_script(self, transcript: str, industry: str, product_brief: str = "") -> list[str]:
        """
        改写脚本（保留爆款结构，迁移到目标行业）
        
        Args:
            transcript: 原始转录文本
            industry: 目标行业
            product_brief: 产品卖点描述
        
        Returns:
            改写后的脚本列表（1-3 个版本）
        """
        prompt = f"""请保留以下爆款文案的结构和节奏，将其改写为{industry}领域的内容。

原始文案：
{transcript}

目标行业：{industry}
产品卖点：{product_brief or '无特定卖点'}

要求：
1. 保留原文的钩子（hook）、痛点、论证、转化结构
2. 将内容替换为{industry}相关的场景和话术
3. 保持口语化、节奏感强
4. 输出 2-3 个改写版本

请以 JSON 格式输出：{{"scripts": ["版本1", "版本2", ...]}}"""
        
        result = self.complete(prompt, json_mode=True)
        data = json.loads(result)
        return data.get("scripts", [])

    def analyze_structure(self, transcript: str) -> dict:
        """
        分析爆款文案结构
        
        Args:
            transcript: 转录文本
        
        Returns:
            结构分析结果
        """
        prompt = f"""请分析以下爆款短视频文案的结构：

{transcript}

请分析以下维度：
1. hook（开场钩子）：类型（提问/冲突/数据/悬念）、原文、时长
2. pain_points（痛点）：列出 2-3 个
3. selling_points（卖点）：列出 2-3 个
4. structure（段落结构）：每段的角色、情绪、节奏
5. rhythm（节奏）：总时长、句均时长、情绪曲线、高潮位置
6. cta（行动号召）：类型、原文
7. hashtags（话题标签）：推荐 3-5 个

请以 JSON 格式输出。"""
        
        result = self.complete(prompt, json_mode=True)
        return json.loads(result)
