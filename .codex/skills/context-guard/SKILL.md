---
name: context-guard
description: >-
  Use when a session is long, work is handed off or resumed, a multi-step task
  reaches a milestone, or the user asks to compress context, 压缩上下文, or
  update PROJECT_STATE. Write a short durable snapshot to PROJECT_STATE.md
  and read it before continuing.
---

# Context Guard

把换会话后仍必须知道的事实压进仓库根目录的 `PROJECT_STATE.md`。稳定规则留在 `AGENTS.md`。

`.claude/skills/context-guard/SKILL.md`、`.grok/skills/context-guard/SKILL.md`、`.codex/skills/context-guard/SKILL.md` 是同一份说明。改一处时同步另外两处。

## 何时读取

非琐碎任务开工时先读 `PROJECT_STATE.md`。

- 与用户当前要求冲突时，以用户当前要求为准。
- 与 `AGENTS.md` 的稳定规则冲突时，以 `AGENTS.md` 为准。
- 文件缺失、或条目是「（空）」时，不要把占位当成事实。

## 何时重写

满足任一条件就重写 `PROJECT_STATE.md`（覆盖，不追加成长日志）：

- 用户要求压缩、交接、收尾或续作
- 一个多步任务完成了一个里程碑，或本会话要停在未完成的工作上
- 会话已经长到新开的代理会漏掉已做决定、当前进度或下一步

琐碎的一次性改动不要写。

## 只保留这些

用下面的标题，每节几行即可：

- 当前目标
- 已确认决策
- 进行中
- 下一步（一条可执行的下一步）
- 关键路径（仓库内路径）
- 阻塞
- 最近更新（最多 5 条，最新在上，带日期）

没有内容的节写「（空）」。

## 不要写入

- 密钥、token、密码、连接串
- 聊天原文、命令大段输出、整文件粘贴
- 已放弃的尝试和未确认的猜测
- 属于 `AGENTS.md` 的长期规则（那些改 `AGENTS.md`，不写进这里）

写完后不要在回复里再贴出全文，除非用户要求看。
