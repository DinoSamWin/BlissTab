# StartlyTab 中间层推理引擎 V2 (Intermediate Layer Tech Spec)

## 核心设计理念 (Core Philosophy)
中间层推理引擎 V2 的核心目标是从“LLM 全权做决策的自由拼装”迁移走向“**确定的强规则决策树 + 动态少样本 Prompt 生成器**”。

通过强规则将当前环境元数据映射到具体的词典命名空间，不仅大幅降低了 LLM 产生“拼接失败幻觉（Lost in the middle）”的概念，并且还能通过建立精确的“状态哈希”来实现前端文案的本地批量缓存。

## 1. 强规则优先级的模块化路由 (Decision Routing Tree)

为了避免不同状态特征组合下的潜在冲突（例如：极度干净的 Tab + 听着歌 + 下午深水区 + 刚刚结束长会议归来），我们引入了一套严格的优先级匹配路由层 (Priority-based Routing)。匹配执行从高到低：

*   **[P0] 异常保护兜底层 (System Fallback)**
    *   **判定逻辑**: `如果 isNetworkOffline == true`
    *   **应对策略**: 直接映射向离差或断网相关的 fallback 文案，不再向下流转。

*   **[P1] 极端行为层 / 交互强制阻断层 (Extreme Behavior & Interactive Actions)**
    *   **判定逻辑**: 例如发生 `Manual Refresh` 的连续短时内点击（1-5次打断），或者极其强烈的未消费情绪（新点击了 ☺️/😠），以及 `idleState == RETURN_LONG` 伴随着会议软件的静音（返回工位）。
    *   **应对策略**: 无条件满足这些“强干预”节点（如 `emotion_continuous_worsening` 或者 `reentry_exhausted`），因为此时用户正迫切需求同频的响应。

*   **[P2] 状态过载层及宏观压力 (State Overload & Macro Pressures)**
    *   **判定逻辑**: 处理 `tabCountLevel == OVERLOAD` (例如 >= 15 个 Tab) 结合不同 `timeBlock` 的特征，例如早上的焦虑（`time_morning_tab_overload_relief`）或下午的涣散/吐槽（`time_afternoon_tab_overload_triage`），或者是节假日即将到来的宏大压力周期。
    *   **应对策略**: 将数字环境转化为真实的同伴“吐槽”或是“解围”，消除眼前的沉重感。

*   **[P3] 常规时间基底 (Base Timeline Defaults)**
    *   **判定逻辑**: 所有以上的锋利特征均未命中。用户的状态属于平稳。
    *   **应对策略**: 仅基于 `timeBlock` (如 `MORNING_GOLDEN`, `AFTERNOON_SLUMP`) 进行时间轴流转陪伴。

## 2. 交互产出物的重新定义 (LLM Payload Specification)

以前系统生成的 Context 是一段描述文本，现在，中间层向 `Prompt Builder` 输出的是一个完整的**策略决策对象**，并通过 JSON String 序列化的形式注射给 LLM：
\`\`\`json
{
  "routing_result": {
    "namespace": "time_afternoon_tab_overload_triage",
    "intent_description": "运用毒舌或损友口吻，吐槽用户下午开太多Tab，强制劝其清理。"
  },
  "llm_injection": {
    "few_shot_pool": ["吐槽示例1原文", "吐槽示例2", "反讽示例3"],
    "dynamic_context": "It is currently 15:30. Tabs open: 24. Media playing: false."
  }
}
\`\`\`

并强行规约大批量 Prompt Generation，要求 LLM 返回的内容必须是 `JSON Array` 数组：
\`\`\`json
[
  "生成的变体 1",
  "生成的变体 2",
  "生成的变体 3"
]
\`\`\`

## 3. 防过期：防缓存击穿与智能前端控制 (Smart Cache & Invalidation)

为了平衡每次打开的 API 延迟（希望 0 秒展示状态）和环境失效时的尴尬（例如跨夜打开，却出现白天的文案），引入了“确定性哈希”判断。

1.  **特征拼接哈希化**: 通过将环境的核心硬因素常量进行字符串连接，生成当前瞬间的 `CurrentHash`（例：`AFTERNOON_SLUMP_OVERLOAD_ACTIVE_false`）。
2.  **前端本地对比**: 当用户由于页面重新加载、或手动打断、或打开新 Tab 请求组件时，读取 `StartlyTab_SmartCache_V2`。
3.  **直接消费 (Hit)**: 如果 `CurrentHash == CachedHash` 且本地预加载（Prefetching）池内 `Array` 的值大于 0，则 0 延迟弹出该缓存。
4.  **立刻废弃与强刷 (Miss)**: 如果 `CurrentHash != CachedHash` 或缓存为 0，这代表状态周期变迁或文案消耗完毕，这立刻强制走下层 Engine 流转，通过大模型接口再次抽取 `[3]` 条预缓存，并绑定新一轮的特征 Hash。
