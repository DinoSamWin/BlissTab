export const SKELETONS: Record<string, Record<string, Record<string, string[]>>> = {
    'zh-CN': {
        kickstart: {
            micro_action: [
                "先把 {干扰物} 关掉，{动作} 5 分钟就好。",
                "醒来第一步：{动作}，别想太多。",
                "咖啡之前，先把 {小任务} 处理掉。",
                "今天不用完美，先完成 {一步}。"
            ],
            micro_story: [
                "现在这个时间点，{场景物} 还很安静。",
                "窗外刚亮，你只需要处理 {一件事}。",
                "早上的脑子有点慢，没关系。"
            ],
            sensory: [
                "咖啡升起的热气，是今天第一个 {形容词} 的形状。",
                "窗外的嘈杂声还很远，这里只有你。",
                "光线正好打在桌角，新的一天是具体的。"
            ],
            gentle_question: [
                "今天第一步，你想先搞定什么？",
                "现在这个点，什么最值得先做？"
            ],
            reframe: [
                "早起的意义不是赶时间，是拥有这片刻的控制权。",
                "不需要立刻进入战斗状态，慢慢滑行起飞就好。"
            ],
            witty: [
                "早起的鸟儿不一定有虫吃，但一定能比别人多喝一杯咖啡。",
                "闹钟响的时候很痛苦，但现在清醒的感觉还不错。"
            ],
            permission: [
                "如果还困，允许自己再发三分钟呆。",
                "慢慢来，这一天不需要急着开始。"
            ]
        },
        focus: {
            micro_action: [
                "只盯着 {一个文件/一个模块}，其他先别管。",
                "把 {干扰源} 放远点，专心 10 分钟。",
                "先做最不想做的那一步。",
                "现在只解决 {一个问题}。"
            ],
            reframe: [
                "不是效率低，是任务拆得不够小。",
                "你不需要全做完，只需要推进一点点。"
            ],
            gentle_question: [
                "如果只做一件事，应该是哪一件？",
                "现在最影响进度的，是哪一步？"
            ],
            micro_story: [
                "键盘敲击的声音如果是连贯的，那就是最好的白噪音。",
                "周围越吵，耳机里越安静。"
            ],
            sensory: [
                "键盘敲击的间隙，能听到 {环境音}。",
                "现在的屏幕亮度，刚好把世界隔绝在 {距离} 之外。",
                "空气里的灰尘在光柱里悬浮，时间是静止的。"
            ],
            permission: [
                "专注不代表不能走神，那是大脑在换气。",
                "如果卡住了，就先停下来，不要硬撞。"
            ],
            witty: [
                "手机屏幕最好现在看起来是黑的。",
                "假装自己是一个莫得感情的做事机器。"
            ]
        },
        lighten: {
            witty: [
                "别硬撑，{食物/饮品} 能救你一命。",
                "中午不用想太多，吃点东西再说。",
                "大脑有点罢工，允许的。"
            ],
            permission: [
                "这一段时间，本来就不适合拼命。",
                "现在慢一点，是正常的。"
            ],
            micro_story: [
                "这个点，大多数人都在摸鱼。",
                "屏幕亮着，但心已经在外面了。"
            ],
            gentle_question: [
                "现在最想吃的食物是什么？",
                "如果下午可以偷懒一小时，你会做什么？"
            ],
            reframe: [
                "休息不是浪费时间，是给下午充电。",
                "现在的松弛，是为了待会的紧绷。"
            ],
            micro_action: [
                "站起来伸个懒腰，听听骨头响的声音。",
                "去接杯水，顺便看看窗外。"
            ]
        },
        decompress: {
            permission: [
                "累了不是问题，是信号。",
                "现在不高效，也没关系。"
            ],
            reframe: [
                "下午的效率，本来就不靠硬扛。",
                "撑到现在，已经不错了。"
            ],
            micro_action: [
                "站起来走两步，再回来继续。",
                "把 {窗口/聊天工具} 关一个。"
            ],
            micro_story: [
                "阳光开始斜着照进来，这一天过半了。",
                "茶杯里的水凉了，该换一杯热的了。"
            ],
            gentle_question: [
                "今天最难的部分过去了吗？",
                "现在能不能把节奏放慢一档？"
            ],
            witty: [
                "下午三点，是合法的发呆时间。",
                "现在的工作效率低，是生理规律，不怪你。"
            ]
        },
        celebrate: {
            witty: [
                "下班前的大脑，已经不想配合了。",
                "恭喜达成成就：成功存活到下班。"
            ],
            micro_story: [
                "一天快结束了，事情也差不多了。",
                "现在这个点，可以开始收尾了。"
            ],
            permission: [
                "今天到这儿，就算完成。",
                "剩下的，明天再说。"
            ],
            reframe: [
                "不管做得怎么样，今天都结束了。",
                "收尾工作也是工作，不需要拼命。"
            ],
            micro_action: [
                "整理一下桌面，准备通过终点线。",
                "把明天要做的事写下来，然后忘掉它们。"
            ],
            gentle_question: [
                "今天有什么小事值得给自己点个赞？",
                "待会离开这里，第一件事想做什么？"
            ]
        },
        care: {
            micro_story: [
                "这个时间还在电脑前，真的不容易。",
                "灯还亮着，你已经很努力了。"
            ],
            sensory: [
                "城市的声音都沉下去了，只有屏幕醒着。",
                "杯子里的水凉了，但这行代码是温热的。",
                "窗玻璃映出模糊的影子，那是尚未休息的你。"
            ],
            permission: [
                "慢一点吧，不用再逼自己。",
                "今天做到这儿，也算交代了。"
            ],
            reframe: [
                "加班不代表你不行，只是事情太多。",
                "现在的坚持，是为了给自己一个交代。"
            ],
            micro_action: [
                "揉揉眼睛，深呼吸三次。",
                "喝口水，感受温热流过喉咙。"
            ],
            gentle_question: [
                "现在最需要照顾的是不是你的身体？",
                "如果现在停下来，会有多严重的后果？"
            ],
            witty: [
                // Normally empty for care, but keeping structure valid
            ]
        },
        sleep: {
            permission: [
                "今天可以结束了，去睡吧。",
                "事情不会跑，身体会。"
            ],
            micro_story: [
                "夜这么深了，屏幕还亮着。",
                "这个点，世界不会催你。"
            ],
            sensory: [
                "听到远处偶尔经过的车声，世界正在入睡。",
                "这种安静的重量，适合用来做梦，而不是思考。"
            ],
            gentle_question: [
                "现在睡下去，会更划算吗？",
                "今天有什么瞬间是值得留恋的？"
            ],
            reframe: [
                "睡眠是最好的重启键。",
                "现在的放弃，是为了明天的满血复活。"
            ],
            micro_action: [
                "关上屏幕，听听周围的声音。",
                "把手机调成静音，给自己一个安静的世界。"
            ],
            witty: [
                "熬夜并不能把昨天熬回来。",
                "被窝已经在呼唤你的名字了。"
            ]
        },
        weekend: {
            micro_story: [
                "今天不是工作日，节奏可以不一样。",
                "时间是自己的，不用赶。"
            ],
            permission: [
                "周末慢一点，是应该的。",
                "今天不做任何正事，也是一种正事。"
            ],
            witty: [
                "今天不高效，也不会出事。",
                "周六的闹钟，建议直接扔出窗外。"
            ],
            gentle_question: [
                "今天最想把时间浪费在什么上？",
                "如果不考虑有用，你想做什么？"
            ],
            micro_action: [
                "晒晒太阳，发发呆。",
                "找一本看不懂的书，催眠一下自己。"
            ],
            reframe: [
                "休息不是偷懒，是生活本来的样子。",
                "周末的意义，就是用来虚度时光的。"
            ]
        },
        custom_theme_content: {
            interesting: [
                "{Content}，这也许和此刻的你有点像。",
                "如果不看屏幕，{Content}。",
                "就像 {Theme} 里说的：{Content}。",
                "{Content}。"
            ],
            witty: [
                "如果要用 {Theme} 来解释现在，那就是：{Content}。",
                "生活有时候像 {Theme}：{Content}。"
            ],
            reframe: [
                "试着用 {Theme} 的逻辑看世界：{Content}。",
                "如果把你现在的状态带入 {Theme}：{Content}。"
            ],
            gentle_question: [
                "如果是 {Theme}，会怎么处理现在的焦虑？",
                "此刻的安静，让你想到了 {Theme} 的哪一部分？"
            ]
        }
    },
    'en-US': {
        // Simple fallback for English to avoid crashes
        kickstart: {
            micro_action: ["Turn off {distractions}, just {action} for 5 mins."],
            micro_story: ["It's quiet right now. Just handle {one_thing}."]
        },
        focus: {
            micro_action: ["Focus on {one_module} only."],
            reframe: ["You don't need to finish it all, just push a bit."]
        },
        // Fallbacks for other intents mapping to generic
        lighten: { witty: ["Take a break."] },
        decompress: { permission: ["It's okay to slow down."] },
        celebrate: { micro_story: ["Done for the day."] },
        care: { gentle_question: ["Are you okay?"] },
        sleep: { permission: ["Go to sleep."] },
        weekend: { micro_story: ["Enjoy the weekend."] }

    }
};

// Add Track B type support
export type PerspectiveTrack = 'A' | 'B';

export function getTrackForStyle(style: string): PerspectiveTrack {
    // Track B: Sensory, Micro Story (Observational), Witty (Atmospheric)
    if (['sensory', 'micro_story', 'witty'].includes(style)) return 'B';
    // Track A: Micro Action, Permission, Reframe, Gentle Question
    return 'A';
}

export function getSkeleton(intent: string, style: string, language: string = 'zh-CN'): string[] {
    const langLib = SKELETONS[language] || SKELETONS['zh-CN'];
    const intentLib = langLib[intent] || langLib['focus'];
    return intentLib[style] || Object.values(intentLib)[0] || ["Write a short, human perspective line."];
}

export function getCustomThemeSkeleton(style: string, language: string = 'zh-CN'): string[] {
    const langLib = SKELETONS[language] || SKELETONS['zh-CN'];
    const customLib = langLib['custom_theme_content'];
    if (!customLib) return ["{Content}"];

    return customLib[style] || customLib['interesting'] || ["{Content}"];
}
