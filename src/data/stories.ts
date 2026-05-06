export interface StoryFeature {
  title: string;
  description: string;
}

export interface StoryInterview {
  question: string;
  answer: string | string[];
}

export interface StorySection {
  title?: string;
  content: string | string[] | StoryInterview[];
  type: 'text' | 'interview' | 'feature-grid';
  features?: StoryFeature[];
}

export interface Story {
  id: string;
  name: string;
  slug: string;
  title: string;
  subtitle: string;
  hook: string; // The "Hook" for SEO landing
  heroQuote: string;
  image: string;
  role: string;
  avatar: string; // Small avatar for Q&A
  interviewer: {
    name: string;
    avatar: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  ctaPrimary: {
    text: string;
    link: string;
  };
  sections: StorySection[];
  faq: {
    question: string;
    answer: string;
  }[];
}

export const STORIES: Story[] = [
  {
    id: 'maya',
    name: 'Maya',
    slug: 'maya-tab-overload-mental-buffer',
    title: "Maya’s Story: The New Tab That Finally Let Her Breathe",
    subtitle: "For Maya, opening a new tab used to mean facing another wall of tools, links, and unfinished work. StartlyTab helped her create a calmer space before the next click.",
    hook: "Does opening a new tab feel like facing a wall of work? You aren't alone. Maya found a way to stop the tab ocean from swallowing her day.",
    heroQuote: "Every new tab used to feel like another wall of work. StartlyTab made it feel like someone was saying, breathe first.",
    image: '/images/redesign/Maya.png',
    avatar: '/images/redesign/Maya  Marketing Manager.webp',
    role: "Marketing Manager",
    interviewer: {
      name: "StartlyTab",
      avatar: "/icons/icon-64x64.png"
    },
    seo: {
      title: "Maya’s StartlyTab Story: A Mental Buffer for Too Many Browser Tabs",
      description: "Marketing manager Maya shares how StartlyTab helped her escape tab overload, reduce digital clutter, and start each workday with one clear priority.",
      keywords: "tab overload, too many browser tabs, new tab productivity, digital clutter, mental buffer, browser workspace",
    },
    ctaPrimary: {
      text: "Create Your Calm New Tab",
      link: "/signup"
    },
    sections: [
      {
        type: 'text',
        content: [
          "For Maya, the hardest part of the workday was not always the work itself.",
          "Sometimes, it was opening a new tab.",
          "“Before StartlyTab, every new tab felt like another wall of work,” she says. “It was full of tool links, dashboards, docs, calendars, boards, reports — all the things I was supposed to use to stay organized. But honestly, seeing all of it at once made me feel like I couldn’t breathe.”",
          "Maya works as a marketing manager at a growing software company. Her days move quickly: campaign planning, analytics reviews, creative feedback, Slack messages, customer research, landing pages, and last-minute requests.",
          "Like many people whose work happens in the browser, she did not just have too many tabs.",
          "She had too many open loops.",
          "That was why StartlyTab felt different.",
          "It did not ask her to build another strict productivity system. It gave her a softer place to land."
        ]
      },
      {
        title: "In the Beginning: Every New Tab Was a Tool Wall",
        type: 'interview',
        content: [
          {
            question: "What did your browser feel like before StartlyTab?",
            answer: [
              "Crowded. Not just visually crowded — mentally crowded.",
              "I already had too many tabs open. Then every time I opened a new tab, I would see this huge wall of tools and links. Project tools, analytics, documents, notes, calendars, task boards, dashboards.",
              "They were all useful. That was the problem.",
              "It felt like everything was shouting, “You should be doing this too.”",
              "So even before I chose what to work on, I was already overwhelmed."
            ]
          },
          {
            question: "Was the new tab page part of the stress?",
            answer: [
              "Yes. I didn’t realize how much until it changed.",
              "A new tab should feel like a clean starting point. For me, it felt like walking into a room where every wall was covered with sticky notes.",
              "I would open a tab to do one simple thing, then see a tool link, remember another task, open another page, check something else, and suddenly I was in the ocean again.",
              "Not because I lacked discipline. Because the environment kept pulling me in different directions."
            ]
          }
        ]
      },
      {
        title: "The Problem Wasn’t Laziness. It Was No Mental Buffer.",
        type: 'text',
        content: [
          "Maya had tried to “be more organized” before.",
          "She used bookmarks. She used folders. She pinned important pages. She tried to close tabs at the end of the day.",
          "But the pressure always came back.",
          "Her browser had become her workspace, her memory, her to-do list, and her anxiety board at the same time.",
          "**Q: What did you actually need?**",
          "**Maya:** I needed a buffer. I didn’t need another place telling me I had 47 things to do. I already knew that. I needed a moment between opening the browser and getting pulled into everything. Just a little space to ask: what matters today? That’s what StartlyTab gave me."
        ]
      },
      {
        title: "How StartlyTab Creates a Mental Buffer",
        type: 'feature-grid',
        content: "Product guidance",
        features: [
          {
            title: "Start with one important thing \n 首先，从一件重要的事情开始。",
            description: "Begin each day by choosing the one task that matters most, instead of staring at every unfinished tab from yesterday. \n 每天开始时，选择最重要的一项任务，而不是盯着昨天未完成的所有任务。"
          },
          {
            title: "Step out of the tab ocean \n 走出标签海洋",
            description: "When your browser gets crowded, StartlyTab gently reminds you to close what no longer needs your attention. \n 当您的浏览器窗口过多时，StartlyTab 会温柔地提醒您关闭不再需要您关注的窗口。"
          },
          {
            title: "Take human breaks \n 人性化的休息时间",
            description: "A calm new tab can remind you to walk, breathe, stretch, or make tea before jumping into the next task. \n 一个平静的新标签页可以提醒你在开始下一个任务之前散散步、深呼吸、伸展一下身体或泡杯茶。"
          }
        ]
      },
      {
        title: "The First Thing That Changed: One Important Thing",
        type: 'interview',
        content: [
          {
            question: "What felt different when you started using StartlyTab?",
            answer: [
              "It felt like StartlyTab understood my actual workday.",
              "A lot of productivity tools make you feel like you need to become a different person. StartlyTab didn’t do that.",
              "At the start of a new day, it gently brought me back to one question: what is the one most important thing I can complete today?",
              "Not ten things. Not my whole backlog. Not every tab I left open yesterday.",
              "One thing. That was surprisingly powerful."
            ]
          },
          {
            question: "Why did that matter so much?",
            answer: [
              "Because my mornings used to begin with yesterday’s stress.",
              "I would reopen my laptop and immediately see everything unfinished. Old tabs, half-read pages, campaign docs, reports I meant to check, competitor pages I didn’t want to lose.",
              "StartlyTab changed the tone of the day.",
              "Instead of, “Here is everything you failed to finish,” it felt more like, “Let’s just start with one thing.”",
              "That made the day feel possible."
            ]
          }
        ]
      },
      {
        title: "Coming Back After a Busy Hour",
        type: 'interview',
        content: [
          {
            question: "What happens when your day starts getting messy again?",
            answer: [
              "That’s where StartlyTab feels almost like a friend.",
              "I’ll be deep in work, opening things quickly, jumping between tasks, checking links people send me. Then I come back to a new tab and it gently reminds me to look at what I’ve opened.",
              "Sometimes it’s like: do you still need these tabs?",
              "And I realize, no, I don’t.",
              "I don’t need that pricing page anymore. I don’t need three versions of the same report. I don’t need the article I opened two hours ago just sitting there making me feel guilty.",
              "It helps me close the things that are no longer serving me."
            ]
          },
          {
            question: "You called it a friend. What do you mean by that?",
            answer: [
              "Not in a cute gimmicky way. I mean it feels supportive instead of demanding.",
              "It does not yell at me to optimize my life. It does not make me feel bad for being messy.",
              "It just gives me these small, kind interruptions before I fall too deep into the tab ocean.",
              "Like, “Hey, maybe close a few of these.” Or, “Maybe step away for a minute.” Or, “You’ve been staring at this for a while. Go get tea.”",
              "That sounds small, but during a real workday, those small moments matter."
            ]
          }
        ]
      },
      {
        title: "Maya’s Advice for Anyone Drowning in Tabs",
        type: 'interview',
        content: [
          {
            question: "What would you tell someone who feels overwhelmed every time they open a browser tab?",
            answer: [
              "First, don’t blame yourself. Too many tabs usually mean you’re trying to hold too much context in your head. That’s not a personal failure. That’s a system problem.",
              "Second, stop turning your new tab page into a wall of everything. You need access, yes. But you also need breathing room.",
              "And third, give yourself a place that helps you return to the day instead of getting swallowed by it."
            ]
          }
        ]
      }
    ],
    faq: [
      {
        question: "What is tab overload?",
        answer: "Tab overload happens when too many open browser tabs create visual clutter, mental pressure, and a constant sense of unfinished work."
      },
      {
        question: "Why do browser tabs feel overwhelming?",
        answer: "Browser tabs often represent more than web pages. They can become reminders, tasks, ideas, documents, tools, and decisions that have not been finished yet."
      },
      {
        question: "How does StartlyTab help with too many tabs?",
        answer: "StartlyTab creates a calmer new tab experience. It helps you start with one important thing, notice when your browser is getting crowded, and close tabs that no longer need your attention."
      },
      {
        question: "What is a mental buffer in a browser?",
        answer: "A mental buffer is a small pause between opening your browser and reacting to everything on your screen. It helps you choose what matters before jumping into more tools, tabs, or tasks."
      }
    ]
  },
  {
    id: 'daniel',
    name: 'Daniel',
    slug: 'daniel-workplace-frustration-emotional-buffer',
    title: "Daniel’s Story: When Work Frustration Doesn’t Go Away",
    subtitle: "Sometimes it’s not the workload — it’s the feeling you carry after one unfair moment. StartlyTab became a place where Daniel could react, reset, and understand himself better.",
    hook: "When One Comment Ruins Your Entire Workday. Dealing with workplace frustration using a custom new tab.",
    heroQuote: "One unfair comment from my manager can sit in my chest all day.",
    image: '/images/redesign/Daniel Interview.png',
    avatar: '/images/redesign/Daniel Operations Lead.webp',
    role: "Operations Lead",
    interviewer: {
      name: "StartlyTab",
      avatar: "/icons/icon-64x64.png"
    },
    seo: {
      title: "Daniel’s Story: Dealing with Workplace Frustration Using a Custom New Tab",
      description: "Daniel shares how StartlyTab helped him deal with workplace frustration, express emotions safely, and track mood changes through a personalized new tab experience.",
      keywords: "workplace frustration, work stress emotions, dealing with toxic manager, emotional burnout at work, custom new tab page, track mood at work, digital mental health tools, browser productivity emotional",
    },
    ctaPrimary: {
      text: "Create Your Own Emotional Buffer",
      link: "/signup"
    },
    sections: [
      {
        type: 'text',
        content: [
          "Everything Keeps Pulling Me Back to That Moment.",
          "There are days when Daniel finishes all his work. And still feels like he didn’t move on.",
          "“It’s weird,” he says. “I can reply to emails, join meetings, move projects forward… but part of me is still stuck in that one moment.”",
          "That moment is usually small. A comment in a meeting. A tone that feels off. A decision that quietly puts the blame in the wrong place.",
          "Nothing dramatic enough to call out. But heavy enough to stay."
        ]
      },
      {
        title: "In The Beginning: Work Didn’t End When Work Ended",
        type: 'interview',
        content: [
          {
            question: "What kind of situations affect you the most?",
            answer: [
              "It’s usually when something feels unfair, but not big enough to argue about.",
              "Like a manager making a comment that shifts responsibility. Or implying something without saying it directly.",
              "You can’t really push back without making things worse. So you just… take it. And then it stays with you."
            ]
          },
          {
            question: "What does that feel like during the day?",
            answer: [
              "It sits in your chest. You keep working, but your mind keeps replaying it.",
              "What I should have said. What they meant. Why it happened.",
              "Meanwhile, more work keeps coming in. More tabs, more messages, more tasks. But mentally, you’re still there."
            ]
          }
        ]
      },
      {
        title: "The Problem Wasn’t Work. It Was Carrying It",
        type: 'text',
        content: [
          "Daniel didn’t need another productivity tool. He was already organized.",
          "The problem was emotional carryover. His browser made it worse.",
          "Every new tab pulled him forward into more work — without giving him space to process what just happened.",
          "“I didn’t need to move faster. I needed somewhere to react.”"
        ]
      },
      {
        title: "Discovering a Different Kind of New Tab",
        type: 'interview',
        content: [
          {
            question: "What made StartlyTab feel different?",
            answer: [
              "It didn’t assume I was always calm and productive.",
              "Most tools are like, “Here’s your tasks. Stay focused. Be efficient.” But that’s not how real workdays feel.",
              "Sometimes you’re annoyed. Sometimes you’re angry. Sometimes you’re just done.",
              "StartlyTab gave me a place where that was… allowed."
            ]
          }
        ]
      },
      {
        title: "When “Gentle Encouragement” Isn’t Enough",
        type: 'text',
        content: [
          "At first, Daniel tried using softer prompts like “Take a deep breath” or “Stay positive.” But it didn’t work.",
          "**Q: Why didn’t that help?**",
          "**Daniel:** Because it didn’t match how I actually felt. If I’m frustrated and something tells me to “stay calm,” it just feels fake. Like it’s ignoring what just happened."
        ]
      },
      {
        title: "Custom Tone: Saying What You Actually Feel",
        type: 'interview',
        content: [
          {
            question: "What did you change?",
            answer: [
              "I wrote my own lines. Not polite ones. Real ones. Stuff I actually wanted to say in that moment.",
              "“If they can’t lead, that’s not your responsibility to fix.”",
              "“Bad management is not a reflection of your competence.”",
              "“You’re allowed to be annoyed. Just don’t stay there all day.”",
              "Honestly? Relieving. It felt like someone was on my side instead of correcting me."
            ]
          }
        ]
      },
      {
        title: "How StartlyTab Supports Your Real Workday",
        type: 'feature-grid',
        features: [
          {
            title: "Express What You Actually Feel",
            description: "Customize your new tab with your own tone — calm, blunt, sarcastic, or honest."
          },
          {
            title: "Track Your Emotional Patterns",
            description: "Simple emoji tracking reveals patterns you didn’t notice."
          },
          {
            title: "Reset Between Moments",
            description: "From frustration to focus — or just a short mental break."
          }
        ]
      },
      {
        title: "The Emoji He Didn’t Take Seriously — Until He Did",
        type: 'interview',
        content: [
          {
            question: "What made you start using the emoji?",
            answer: [
              "It was just easy. No journaling. No writing. Just click how I feel.",
              "After a week, StartlyTab showed me a simple mood trend. I thought my week was “fine.” But the data said otherwise.",
              "There were way more negative days than I expected. Certain people. Certain types of conversations. It wasn’t just in my head."
            ]
          }
        ]
      },
      {
        title: "A Small Escape: Cold Facts Between Chaos",
        type: 'interview',
        content: [
          {
            question: "Why did you add random “fun facts”?",
            answer: [
              "Because sometimes I just need a break from work thinking. Not motivation. Not productivity. Just… something unrelated. It resets your brain for a second."
            ]
          }
        ]
      },
      {
        title: "What StartlyTab Became for Him",
        type: 'interview',
        content: [
          {
            question: "If you had to describe it in one sentence?",
            answer: [
              "It’s the only place in my workday where I don’t have to pretend.",
              "People who carry things they don’t talk about—if you’ve ever had something small ruin your whole day, you’ll get it."
            ]
          }
        ]
      }
    ],
    faq: [
      {
        question: "How do you deal with workplace frustration?",
        answer: "Workplace frustration often comes from unresolved emotions. Tools like StartlyTab help by creating space to process reactions instead of suppressing them."
      },
      {
        question: "Can a browser tool help with emotional stress?",
        answer: "Yes. A personalized new tab can act as a mental reset point, helping users pause, reflect, and re-center during the workday."
      },
      {
        question: "What is an emotional buffer?",
        answer: "An emotional buffer is a space between an experience and your reaction, allowing you to process feelings before moving on."
      },
      {
        question: "Why track mood during work?",
        answer: "Mood tracking helps reveal patterns and triggers, making it easier to understand and manage emotional stress over time."
      }
    ]
  },
  {
    id: 'rachel',
    name: 'Rachel',
    slug: 'rachel-monday-blues-post-holiday-slump',
    title: "Rachel’s Story: When Monday Already Feels Too Heavy",
    subtitle: "Some weeks don’t start with energy — they start with resistance. StartlyTab helped Rachel begin her workday without fighting how she feels.",
    hook: "It’s Monday morning, and I already want to disappear for a while. Dealing with Monday Blues and Post-Holiday Slump.",
    heroQuote: "It’s Monday morning, and I already want to disappear for a while.",
    image: '/images/redesign/Rachel Interview.png',
    avatar: '/images/redesign/Rachel Account Manager.webp',
    role: "Account Manager",
    interviewer: {
      name: "StartlyTab",
      avatar: "/icons/icon-64x64.png"
    },
    seo: {
      title: "Rachel’s Story: Dealing with Monday Blues and Post-Holiday Slump",
      description: "Account manager Rachel shares how StartlyTab helped her cope with Monday blues, post-holiday burnout, and emotional fatigue by creating a softer start to the workweek.",
      keywords: "monday blues, post holiday slump, back to work anxiety, monday motivation low, burnout at work, emotional fatigue work, return to work after vacation, why do i feel tired after holiday",
    },
    ctaPrimary: {
      text: "Start Your Week Gently",
      link: "/signup"
    },
    sections: [
      {
        type: 'text',
        content: [
          "Starting the Week Already Exhausted.",
          "Rachel doesn’t hate her job. She doesn’t dread every meeting, or feel constantly overwhelmed.",
          "But there’s a very specific feeling she knows well. Monday morning.",
          "“I haven’t even replied to anything yet,” she says, “but the week already feels like it’s sitting on top of me.”",
          "Nothing is technically wrong. But something feels… heavy."
        ]
      },
      {
        title: "In The Beginning: The Quiet Resistance No One Talks About",
        type: 'interview',
        content: [
          {
            question: "What does a typical Monday feel like for you?",
            answer: [
              "It’s not panic. It’s not stress in the obvious sense. It’s more like resistance.",
              "I know what I need to do. I just don’t feel ready to start. Especially after a weekend, or worse, after a holiday.",
              "You come back, and your body is like… no."
            ]
          }
        ]
      },
      {
        title: "The Post-Holiday Reality",
        type: 'interview',
        content: [
          {
            question: "What about after a vacation?",
            answer: [
              "Honestly? Sometimes it’s worse. You’re supposed to feel recharged. But instead, everything feels slower.",
              "Your brain isn’t fully back yet. Your body isn’t on the same rhythm. And then work just… resumes at full speed. No transition.",
              "“That post-holiday slump is real. Your body and mind are both protesting.”"
            ]
          }
        ]
      },
      {
        title: "The Problem: Fighting Yourself Before Work Even Starts",
        type: 'text',
        content: [
          "Rachel tried the usual things. “Get back into routine”. “Start strong on Monday”. But those messages made it worse.",
          "**Q: Why didn’t that work?**",
          "**Rachel:** Because it assumes you’re ready. When something tells me to “be productive” when I already feel drained, it just creates more pressure. It feels like I’m already failing at 9am."
        ]
      },
      {
        title: "Discovering Something Softer",
        type: 'interview',
        content: [
          {
            question: "What felt different immediately?",
            answer: [
              "It didn’t try to push me. It didn’t say “let’s go” or “stay focused.”",
              "Instead, it felt like it understood where I was starting from. Permission instead of pressure."
            ]
          }
        ]
      },
      {
        title: "Rachel’s “Gentle Encouragement”",
        type: 'text',
        content: [
          "Rachel started customizing her StartlyTab messages for permission:",
          "“Give yourself permission to be half-present today.”",
          "“This is a soft landing, not a full sprint.”",
          "“Start slower than you think you should.”",
          "“It’s okay if today feels heavier than usual.”"
        ]
      },
      {
        title: "A Softer Way to Start Your Workday",
        type: 'feature-grid',
        features: [
          {
            title: "Start Where You Are",
            description: "Not every day needs full energy. StartlyTab meets you at your current state."
          },
          {
            title: "Customize Your Tone",
            description: "From gentle to honest, write prompts that actually match your mood."
          },
          {
            title: "Ease Into Work",
            description: "Turn your new tab into a transition space — not a pressure trigger."
          }
        ]
      },
      {
        title: "When the Week Feels Too Heavy",
        type: 'interview',
        content: [
          {
            question: "Why did that matter?",
            answer: [
              "Because it removed the guilt. Instead of feeling like I was behind, I felt like I was allowed to ease in.",
              "“You’re not the only one feeling this today.”",
              "“Energy comes back. You don’t have to force it right now.”",
              "“That post-holiday slump is real. Take it easy today — you’re not alone in this.”"
            ]
          }
        ]
      },
      {
        title: "The Subtle Shift: From Resistance to Starting",
        type: 'interview',
        content: [
          {
            question: "What changed after a few weeks?",
            answer: [
              "I stopped fighting the feeling. Before, I would try to push through it immediately. Now I let myself arrive first.",
              "A good Monday doesn’t mean I feel amazing. It means I don’t feel guilty for not feeling amazing. That’s enough."
            ]
          }
        ]
      }
    ],
    faq: [
      {
        question: "Why do I feel tired on Monday?",
        answer: "Monday fatigue is often caused by a shift in routine, sleep patterns, and mental context after the weekend."
      },
      {
        question: "What is post-holiday slump?",
        answer: "Post-holiday slump is a common emotional and physical reaction when returning to work after time off, often involving low motivation and fatigue."
      },
      {
        question: "Is it normal to not feel ready to work?",
        answer: "Yes. Many people experience resistance at the start of the week. It does not mean you are lazy or unmotivated."
      },
      {
        question: "How can I ease back into work?",
        answer: "Start slowly, reduce pressure, and focus on one small task. Tools like StartlyTab can help create a softer transition into the workday."
      }
    ]
  },
  {
    id: 'lena',
    name: 'Lena',
    slug: 'lena-project-manager-fragmented-workday',
    title: "Lena’s Story: A Day That Never Holds Together",
    subtitle: "Messages, meetings, and small requests keep breaking the day apart — until even opening your laptop feels heavy.",
    hook: "By the time I finally pause, I feel like I’ve been bracing all day. Trapped in a fragmented workday.",
    heroQuote: "By the time I finally pause, I feel like I’ve been bracing all day.",
    image: '/images/redesign/Lena Interview.png',
    avatar: '/images/redesign/Lena Project Manager.webp',
    role: "Project Manager",
    interviewer: {
      name: "StartlyTab",
      avatar: "/icons/icon-64x64.png"
    },
    seo: {
      title: "Lena’s Story: A Project Manager Trapped in a Fragmented Workday",
      description: "Lena shares how constant interruptions, meetings, and endless tasks left her exhausted — and how StartlyTab helped her pause, reset, and regain control.",
      keywords: "fragmented workday, constant interruptions at work, project manager burnout, context switching fatigue, too many meetings work, always busy but not productive, mental fatigue workday",
    },
    ctaPrimary: {
      text: "Find Your Pause Between Tasks",
      link: "/signup"
    },
    sections: [
      {
        type: 'text',
        content: [
          "When the Whole Day Feels Like One Long Interruption.",
          "Lena doesn’t remember the last time she had a full hour to do one thing. Not because her work isn’t important. But because it’s constantly interrupted.",
          "“Messages, meetings, quick requests, ‘just one thing’ — it never really stops,” she says.",
          "Her job is to keep everything moving. The problem is — everything moves through her."
        ]
      },
      {
        title: "In The Beginning: A Day That Keeps Breaking Apart",
        type: 'interview',
        content: [
          {
            question: "What does a normal workday look like?",
            answer: [
              "It starts with a plan. And then within an hour, that plan is gone.",
              "A message comes in. Then a meeting. Then someone needs something “quick.” By noon, I’ve touched ten things… but finished none."
            ]
          },
          {
            question: "Does it feel productive?",
            answer: [
              "In the moment, yes. You’re unblocking things. It feels like momentum.",
              "But after a few weeks, you realize something uncomfortable. The big things haven’t moved.",
              "“I was doing everything. But nothing actually moved forward.”"
            ]
          }
        ]
      },
      {
        title: "The Cost of Always Being “On”",
        type: 'text',
        content: [
          "The work doesn’t end when the laptop closes. Lena switches roles to parent, dinner, home stuff.",
          "“And sometimes I realize… I didn’t have a single moment today that was mine.”",
          "At some point, she stopped feeling like she was choosing what to do. She was just reacting all day."
        ]
      },
      {
        title: "Discovering the Pause She Didn’t Have",
        type: 'interview',
        content: [
          {
            question: "What felt different about StartlyTab?",
            answer: [
              "It interrupts the interruptions. In a day where everything pulls you forward, it gives you a moment to step back.",
              "Sometimes I open a new tab and it says: “A pause now might save you an hour later.” And the weird thing is… it’s always right."
            ]
          }
        ]
      },
      {
        title: "The Night She Tried to Push Through Everything",
        type: 'interview',
        content: [
          {
            question: "What happened that night?",
            answer: [
              "I had too many tabs open. My brain was all over the place. I opened a new tab and it said:",
              "“Your tabs are a mess. Your mind is too. Close a few — or I might do it for you.”",
              "It was honest. And I needed that. I closed things, simplified, and finished faster than I expected."
            ]
          }
        ]
      },
      {
        title: "Break the Cycle of Constant Interruption",
        type: 'feature-grid',
        features: [
          {
            title: "Interrupt the Interruptions",
            description: "When everything pulls your attention, StartlyTab gives you a moment back."
          },
          {
            title: "Reset Before You Burn Out",
            description: "Simple prompts help you pause before your energy is gone."
          },
          {
            title: "Work With Clarity, Not Chaos",
            description: "Less scattered tabs, less scattered thinking."
          }
        ]
      },
      {
        title: "The Idea She Didn’t Expect: Pausing = Speed",
        type: 'interview',
        content: [
          {
            question: "What changed over time?",
            answer: [
              "I realized pushing harder wasn’t making me faster. Stopping did. Even a short pause made everything clearer.",
              "“Sometimes the fastest way forward is to stop for a minute.”"
            ]
          }
        ]
      },
      {
        title: "Closing: Not Every Day Needs More Effort",
        type: 'text',
        content: [
          "Lena still has meetings and interruptions. But now, she has a way to pause and reset.",
          "“It doesn’t fix the chaos. But it helps me not become part of it.”",
          "“You don’t need more time. You need a moment that’s actually yours.”"
        ]
      }
    ],
    faq: [
      {
        question: "What is a fragmented workday?",
        answer: "A fragmented workday is when constant interruptions break your focus, making it hard to complete meaningful tasks."
      },
      {
        question: "Why do I feel busy but not productive?",
        answer: "Frequent context switching reduces deep work time, making progress slower even if you're constantly active."
      },
      {
        question: "How can I reduce interruptions at work?",
        answer: "While you can’t eliminate all interruptions, creating intentional pauses and reducing cognitive overload can help regain focus."
      },
      {
        question: "Can short breaks improve productivity?",
        answer: "Yes. Strategic pauses can improve clarity, reduce mental fatigue, and help you complete tasks more efficiently."
      }
    ]
  }
];



