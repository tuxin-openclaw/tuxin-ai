"""
AI 服务模块
封装统一的 AI 调用接口，当前使用 Mock 实现
后续可替换为 OpenAI / Claude / 通义千问等真实 API
"""

import json
from typing import List
from datetime import date


class AIService:
    """AI 服务统一接口"""

    def __init__(self, provider: str = "mock"):
        self.provider = provider

    async def split_task(self, task_title: str, task_description: str = "") -> List[dict]:
        """
        AI 拆解任务为子任务
        返回: [{"title": "子任务标题", "description": "子任务描述"}, ...]
        """
        if self.provider == "mock":
            return self._mock_split_task(task_title, task_description)
        # 后续扩展真实 API 调用
        raise NotImplementedError(f"Provider {self.provider} not implemented")

    async def summarize_record(self, content: str) -> str:
        """
        AI 总结工作记录
        返回: 结构化总结文本
        """
        if self.provider == "mock":
            return self._mock_summarize(content)
        raise NotImplementedError(f"Provider {self.provider} not implemented")

    async def generate_report(self, records: List[dict], report_type: str = "weekly") -> str:
        """
        AI 生成周报/月报
        records: [{"date": "2024-01-01", "content": "...", "summary": "..."}, ...]
        report_type: weekly / monthly / yearly
        返回: 报告文本
        """
        if self.provider == "mock":
            return self._mock_generate_report(records, report_type)
        raise NotImplementedError(f"Provider {self.provider} not implemented")

    # ========== Mock 实现 ==========

    def _mock_split_task(self, title: str, description: str = "") -> List[dict]:
        """Mock: 根据任务标题智能拆解子任务"""
        # 模拟 AI 拆解逻辑，根据关键词生成合理的子任务
        subtasks = []

        if "开发" in title or "实现" in title or "功能" in title:
            subtasks = [
                {"title": f"需求分析: {title}", "description": "梳理具体需求和边界条件"},
                {"title": f"技术方案设计: {title}", "description": "确定技术选型和实现方案"},
                {"title": f"编码实现: {title}", "description": "按方案编写代码"},
                {"title": f"测试验证: {title}", "description": "编写测试并验证功能"},
                {"title": f"文档更新: {title}", "description": "更新相关文档和注释"},
            ]
        elif "学习" in title or "研究" in title:
            subtasks = [
                {"title": f"资料收集: {title}", "description": "搜集相关学习资料"},
                {"title": f"核心概念学习: {title}", "description": "理解核心原理和概念"},
                {"title": f"实践练习: {title}", "description": "通过实际操作加深理解"},
                {"title": f"总结笔记: {title}", "description": "整理学习笔记和心得"},
            ]
        elif "设计" in title:
            subtasks = [
                {"title": f"需求调研: {title}", "description": "了解用户需求和场景"},
                {"title": f"方案设计: {title}", "description": "设计整体方案"},
                {"title": f"细节打磨: {title}", "description": "完善细节和边界情况"},
                {"title": f"评审确认: {title}", "description": "组织评审并确认方案"},
            ]
        else:
            subtasks = [
                {"title": f"准备阶段: {title}", "description": "收集信息，明确目标"},
                {"title": f"执行阶段: {title}", "description": "开始执行核心工作"},
                {"title": f"检查收尾: {title}", "description": "检查成果，收尾总结"},
            ]

        return subtasks

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


# 全局单例
ai_service = AIService(provider="mock")
