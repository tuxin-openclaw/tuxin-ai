"""
AI 服务模块
支持多个 AI 服务商:
  - volcano: 火山引擎 ARK API (豆包 doubao-seed-2-0-mini-260215)
  - mock:    本地 Mock，无需外部 API
通过 .env 文件配置: AI_PROVIDER=volcano
"""

import json
import logging
import os
from typing import List

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ========== 火山引擎 Provider ==========

class VolcanoProvider:
    """
    火山引擎 ARK API，通过 OpenAI SDK 兼容层调用
    文档: https://www.volcengine.com/docs/82379/1399008
    """

    def __init__(self):
        api_key = os.getenv("ARK_API_KEY", "")
        self.model = os.getenv("ARK_MODEL", "doubao-seed-2-0-mini-260215")

        if not api_key:
            raise RuntimeError("ARK_API_KEY 未配置，请在 .env 文件中设置")

        from openai import OpenAI
        self._client = OpenAI(
            base_url="https://ark.cn-beijing.volces.com/api/v3",
            api_key=api_key,
        )
        logger.info("火山引擎 ARK 已初始化, model=%s", self.model)

    def _chat(self, system: str, user: str) -> str:
        """同步调用 chat.completions（openai SDK 默认同步）"""
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.7,
            max_tokens=2048,
        )
        return response.choices[0].message.content or ""

    async def split_task(self, task_title: str, task_description: str = "") -> List[dict]:
        system = (
            "你是一个专业的项目管理助手。请将用户的任务拆解为 3-5 个可执行的子任务。"
            "严格按 JSON 数组格式返回，每个元素必须包含 title 和 description 字段。"
            "只返回 JSON 数组，不要添加任何其他文字或 markdown 代码块。"
        )
        desc_part = f"\n任务描述: {task_description}" if task_description else ""
        user = f"任务标题: {task_title}{desc_part}"

        import asyncio
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: self._chat(system, user)
        )
        result = result.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        subtasks = json.loads(result)
        if not isinstance(subtasks, list):
            raise ValueError(f"AI 返回格式错误，期望 JSON 数组，实际: {result[:200]}")
        return [
            {"title": s.get("title", "子任务"), "description": s.get("description", "")}
            for s in subtasks
        ]

    async def summarize_record(self, content: str) -> str:
        system = (
            "你是工作总结助手。将用户的工作内容整理为简洁的结构化总结，"
            "包含完成了哪些事、主要工作方向，适当使用 emoji，控制在 200 字以内。"
        )
        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, lambda: self._chat(system, f"请总结以下工作内容：\n\n{content}")
        )

    async def generate_report(self, records: List[dict], report_type: str = "weekly") -> str:
        type_label = {"weekly": "周报", "monthly": "月报", "yearly": "年度总结"}.get(report_type, "报告")
        if not records:
            return f"## {type_label}\n\n本周期暂无工作记录。"

        system = (
            f"你是专业的{type_label}撰写助手，根据用户提供的每日工作记录，"
            f"生成结构清晰的{type_label}，包含统计概览、重点工作、工作方向总结和改进建议。"
            "使用 markdown 格式和 emoji，让报告专业美观。"
        )
        records_text = "\n".join(
            f"【{r.get('date', '')}】\n{r.get('content', '')}"
            + (f"\nAI总结: {r['summary']}" if r.get("summary") else "")
            for r in records
        )
        user = f"请基于以下 {len(records)} 天的记录生成{type_label}：\n{records_text}"

        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, lambda: self._chat(system, user)
        )


# ========== Mock Provider ==========

def _mock_split_task_impl(title: str) -> List[dict]:
    if "开发" in title or "实现" in title or "功能" in title:
        return [
            {"title": f"需求分析: {title}", "description": "梳理具体需求和边界条件"},
            {"title": f"技术方案设计: {title}", "description": "确定技术选型和实现方案"},
            {"title": f"编码实现: {title}", "description": "按方案编写代码"},
            {"title": f"测试验证: {title}", "description": "编写测试并验证功能"},
            {"title": f"文档更新: {title}", "description": "更新相关文档和注释"},
        ]
    elif "学习" in title or "研究" in title:
        return [
            {"title": f"资料收集: {title}", "description": "搜集相关学习资料"},
            {"title": f"核心概念学习: {title}", "description": "理解核心原理和概念"},
            {"title": f"实践练习: {title}", "description": "通过实际操作加深理解"},
            {"title": f"总结笔记: {title}", "description": "整理学习笔记和心得"},
        ]
    elif "设计" in title:
        return [
            {"title": f"需求调研: {title}", "description": "了解用户需求和场景"},
            {"title": f"方案设计: {title}", "description": "设计整体方案"},
            {"title": f"细节打磨: {title}", "description": "完善细节和边界情况"},
            {"title": f"评审确认: {title}", "description": "组织评审并确认方案"},
        ]
    return [
        {"title": f"准备阶段: {title}", "description": "收集信息，明确目标"},
        {"title": f"执行阶段: {title}", "description": "开始执行核心工作"},
        {"title": f"检查收尾: {title}", "description": "检查成果，收尾总结"},
    ]


class AIService:
    """AI 服务统一接口，根据配置分发到对应 Provider"""

    def __init__(self, provider: str = "mock"):
        self.provider = provider
        self._volcano: VolcanoProvider | None = None

        if provider == "volcano":
            self._volcano = VolcanoProvider()

    async def split_task(self, task_title: str, task_description: str = "") -> List[dict]:
        """AI 拆解任务为子任务"""
        if self.provider == "volcano" and self._volcano:
            return await self._volcano.split_task(task_title, task_description)
        return _mock_split_task_impl(task_title)

    async def summarize_record(self, content: str) -> str:
        """AI 总结工作记录"""
        if self.provider == "volcano" and self._volcano:
            return await self._volcano.summarize_record(content)
        return self._mock_summarize(content)

    async def generate_report(self, records: List[dict], report_type: str = "weekly") -> str:
        """AI 生成周报/月报"""
        if self.provider == "volcano" and self._volcano:
            return await self._volcano.generate_report(records, report_type)
        return self._mock_generate_report(records, report_type)

    # ========== Mock 实现 ==========

    def _mock_summarize(self, content: str) -> str:
        """Mock: 生成工作记录的结构化总结"""
        lines = [line.strip() for line in content.strip().split("\n") if line.strip()]
        total_items = len(lines)

        summary_parts = ["📋 **工作总结**\n"]

        if total_items == 0:
            return "暂无工作内容记录。"

        summary_parts.append(f"今日共完成 **{total_items}** 项工作：\n")

        for i, line in enumerate(lines[:5], 1):
            clean = line.lstrip("•-·→● 0123456789.、）)")
            summary_parts.append(f"  {i}. {clean}")

        if total_items > 5:
            summary_parts.append(f"\n  ... 及其他 {total_items - 5} 项工作")

        keywords = []
        keyword_map = {
            "开发": "开发", "代码": "编码", "测试": "测试", "部署": "部署",
            "设计": "设计", "会议": "沟通", "文档": "文档", "修复": "修复",
            "review": "代码评审", "需求": "需求分析", "优化": "优化",
        }
        for kw, label in keyword_map.items():
            if kw in content:
                keywords.append(label)

        if keywords:
            summary_parts.append(f"\n🏷️ **主要方向**: {', '.join(keywords[:4])}")

        return "\n".join(summary_parts)

    def _mock_generate_report(self, records: List[dict], report_type: str) -> str:
        """Mock: 生成周报/月报"""
        type_label = {"weekly": "周报", "monthly": "月报", "yearly": "年度总结"}.get(report_type, "报告")

        if not records:
            return f"## {type_label}\n\n本周期暂无工作记录。"

        report_parts = [f"## {type_label}\n"]

        # 统计信息
        report_parts.append(f"📊 **统计概览**")
        report_parts.append(f"- 记录天数: {len(records)} 天")

        total_content_lines = 0
        for r in records:
            total_content_lines += len([l for l in r.get("content", "").split("\n") if l.strip()])
        report_parts.append(f"- 工作条目: {total_content_lines} 条\n")

        # 每日概况
        report_parts.append("📅 **每日概况**\n")
        for r in records:
            record_date = r.get("date", "未知日期")
            summary = r.get("summary", "")
            if summary:
                # 取总结的前两行
                summary_lines = summary.strip().split("\n")
                brief = summary_lines[0] if summary_lines else "有工作记录"
            else:
                content_lines = [l.strip() for l in r.get("content", "").split("\n") if l.strip()]
                brief = content_lines[0] if content_lines else "有工作记录"
            report_parts.append(f"- **{record_date}**: {brief}")

        # 关键工作
        all_content = " ".join([r.get("content", "") for r in records])
        keywords = []
        keyword_map = {
            "开发": "开发", "测试": "测试", "部署": "部署", "设计": "设计",
            "修复": "Bug修复", "优化": "优化", "会议": "沟通协作", "文档": "文档",
        }
        for kw, label in keyword_map.items():
            if kw in all_content:
                keywords.append(label)

        if keywords:
            report_parts.append(f"\n🎯 **重点方向**: {', '.join(keywords)}")

        report_parts.append(f"\n💡 **AI建议**: 继续保持良好的工作节奏，建议关注高优先级任务的推进。")

        return "\n".join(report_parts)


# 全局单例 — 读取 .env 中的 AI_PROVIDER，默认 volcano
ai_service = AIService(provider=os.getenv("AI_PROVIDER", "volcano"))
