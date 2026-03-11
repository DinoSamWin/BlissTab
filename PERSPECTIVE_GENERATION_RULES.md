# StartlyTab 轻陪伴生成引擎 V1 规则表 (Perspective Generation Rules)

## 一、核心定位与产品原则 (Core Principles)
**StartlyTab turns passive context into emotionally aware micro-support.**
StartlyTab 不是聊天机器人，而是用户打开新标签页时“安静的陪伴者”。

1. **不说教 (No Preaching)**：不要告诉用户应该如何变好，不要像在分析心理状态。
2. **不诊断 (No Diagnosing)**：系统只感受情绪偏向，不给出诸如“你看起来很焦虑”的论断。
3. **永远轻一点 (Always Light)**：简短（1单句为主），优先短但不强行卡死，充满克制的高级感。
4. **不热血打鸡血 (No Motivational Quotes)**：放弃成功学和鸡汤，让每次交互只需轻轻接住用户的当前状态。

---

## 二、双轨分流 (Dual-Track Routing)
The system must support two distinct output routes:
1. **emotion_response**: 具有最高优先级，仅在用户有最近的显式情绪点击时触发。
2. **homepage_default**: 日常被动打开，不应直接承认或引用最近点击的 emoji 内容。

---

## 三、工作流架构 (Workflow Architecture)
从传统的“环境输入 -> 自由生成”，重构为 **6层流程式判断系统**，顺序如下：
`Raw Inputs` → `Scene Resolver` → `Intent Resolver` → `Emotion Bias Resolver` → `Response Strategy Selector` → `Constrained Generator`

**关键硬规则 (Hard Constraints)：**
The LLM must not resolve scene, intent, emotion bias, or strategy by itself. These must be resolved by deterministic rule-based modules before generation. The generator only receives structured upstream outputs.

---

## 四、输入层规范 (Raw Inputs Layer)
只收集客观事实信号，严禁在此暴露分钟级精确时间，也不要在输入层做初步推理。

1. **时间主信号 (Time Block)**：使用 `timeBlock` 作为核心时间信号。(`localMinute` 绝不能直接作为语义输入，只能用于内部时段计算)。
2. **环境状态 (Environment State)**：
   - `tabCount`: 标签页堆积数量。
   - `hasAudibleTab` / `audibleTabCount`: 识别环境声音来源状态。
   - `idleTime`: 闲置与离开重新打开的间隔。
3. **互动反馈 (Micro Interactions)**：
   - 用户近期点击的情绪类别。

（注：`sunday_reset`, `soft_weekend`, `holiday_drift` 等仅作为 `dayTone` 或 `calendarModifier` 附加给下游使用，而不是被视为系统骨干的独立场景输入）

---

## 五、场景层 (Scene Resolver - 核心前置)
必须最先执行的推理：将时间与状态映射到基础的场景底座上，避免场景过载。包含 **8个基础时间场景 + 3个覆盖场景**。

### 1. 基础时间场景 (Base Time Scenes - 固化为8个)
- `morning_buffer` (早晨缓冲)
- `workday_ramp_up` (工作日上午进入状态前)
- `late_morning_flow` (临近中午的心流)
- `midday_transition` (午间的转换与休憩)
- `afternoon_scatter` (午后的分散与精神下坠)
- `late_day_drag` (日暮拖延与困顿)
- `evening_exhale` (傍晚一天的收尾)
- `night_overhang` (深夜拖延)

### 2. 覆盖型优先场景 (Override Scenes - 高优)
- `quiet_return`: 离开较长时间后重新回到 StartlyTab。
- `overloaded_browser`: 标签页严重过载。
- `emotional_checkin`: 主动点击了情绪反馈表盘。

---

## 六、意图识别层 (Intent Resolver)
Scene 决定了“此时此地在哪”，Intent 决定了“系统要完成什么回应任务”：

- **Contextual Greeting**: 日常自然开页的温和呼应。
- **Gentle Re-entry**: 离开一段时间后重新返回的轻度接引。
- **Emotional Acknowledgment**: 对情绪选择的纯粹承接。
- **Soft Grounding**: 在信息过载冗杂或散漫时，尝试拉回一点定力。
- **Rhythm Mirroring**: 呼应特定时间的节律感。
- **Light Focus Support**: 为白天工作场景或 `overloaded_browser` 提供极轻的方向聚焦。
- **Soft Closure**: 给晚间 `late_day_drag` 或 `night_overhang` 轻收尾。

---

## 七、情绪偏向层 (Emotion Bias Resolver)
不进行确诊，仅输出当前状态最接近哪种情绪基调偏向（收拢至最稳的6大类）：
1. `positive`
2. `okay`
3. `tired`
4. `anxious`
5. `scattered`
6. `heavy`

---

## 八、回复策略层 (Response Strategy Selector)
控制生成行文的最终方向（6大策略）：

1. **Mirror (轻映照)**：不建议，只映照当下 (适合默认的时间场景)。
2. **Soothe (承接轻抚)**：接住情绪而不指导 (直接映射自 `emotional_checkin` 下的部分情绪)。
3. **Ground (温和拉回)**：把飘忽的注意力温和收拢到此时此地 (适合 `afternoon_scatter`)。
4. **Focus (极轻聚焦)**：微弱的方向感，帮用户收缩一点注意力 (适合 `overloaded_browser`)。
5. **Rhythm (节律呼应)**：呼应时间节点感 (适合 `morning_buffer`, `evening_exhale`)。
6. **Reentry (平稳接回 - 新增)**：为重返赋予安全感和连续感 (直接映射自 `quiet_return`)。

---

## 九、控制与生成规范 (Constrained Generation Rules)
生成引擎基于以上上游结构化数据输出最后一句短语。

1. **字数与格式**：主要控制在英文 **8–16 words** 或 中文 **12–24 characters**，极限不允许超 60 chars 也不低于 16 chars。永远是单句回应。优先短但不死板。
2. **语气词黑名单**：禁止使用感叹号 `!`。禁止治疗感指令 (如“加油”、“深呼吸放松一下”、“别灰心”、“你可以克服的”)。
3. **正反例对照 (Examples)**：
   - ❌ [通用套话，无视了环境信号] *"The afternoon is still here. You can re-enter it gently."* (这句太飘飘然)
   - ❌ [诊断与爹味说教] *"你看起来有点焦虑，不如先关掉多余的标签页放松一下。"*
   - ✅ [Reentry - 基于输入] *"Nothing’s crowded right now. You can ease back in."*
   - ✅ [Reentry - 基于输入] *"Back again. The afternoon hasn’t gone anywhere."*
   - ✅ [Reentry - 基于输入] *"You're back. No need to rush the next thing."*
   - ✅ [Focus - 基于输入] *"A lot is open. One thing is enough to begin."*
