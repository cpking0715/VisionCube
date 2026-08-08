"""任务相关 Pydantic schema（阶段 1 占位）。

阶段 1 的最小实现中，请求体/响应 schema 类内联定义在 app/api/tasks.py
（TaskCreate / ScriptConfirm / _task_out），保持端点与 schema 就近可读；
本文件保留包结构占位，后续需要独立 schema（如分页、SSE 事件模型）时再迁移至此。
"""
