export interface SeoPageData {
    id: string;
    type: 'use-case' | 'compare' | 'feature' | 'workflow';
    slug: string;
    seo: {
        title: string;
        description: string;
    };
    hero: {
        eyebrow: string;
        title: string;
        subtitle: string;
        primaryCta: string;
        secondaryCta?: string;
    };
    problemSection: {
        title: string;
        description: string;
        items: string[];
    };
    transformationSection: {
        title: string;
        before: string;
        after: string;
        image?: string;
    };
    features: {
        title: string;
        description: string;
    }[];
    faq: {
        question: string;
        answer: string;
    }[];
}

export const SEO_PAGES: SeoPageData[] = [
    {
        id: "high-pressure-developers",
        type: "use-case",
        slug: "high-pressure-developers",
        seo: {
            title: "StartlyTab for High-Pressure Developers | Reduce Burnout",
            description: "A calmer browser experience designed specifically for software engineers facing context switching and high pressure."
        },
        hero: {
            eyebrow: "For Software Engineers",
            title: "Stop Drowning in Open Tabs and Jira Tickets",
            subtitle: "Your new tab is the only space you have between tasks. StartlyTab turns it into a mental reset button.",
            primaryCta: "Install Free",
            secondaryCta: "See Developer Workflow"
        },
        problemSection: {
            title: "The Developer's Reality",
            description: "Context switching isn't just inefficient—it's mentally exhausting.",
            items: [
                "Losing focus between PR reviews and coding",
                "Browser memory hogged by 100+ open tabs",
                "Feeling overwhelmed the moment a new tab opens"
            ]
        },
        transformationSection: {
            title: "From Chaos to Clarity",
            before: "A blinding white new tab with dozens of distracting shortcuts and unfinished tasks staring at you.",
            after: "A dark, calm environment that gently grounds you before you dive into the next complex problem.",
            image: "/images/redesign/Daniel Sample 1.webp"
        },
        features: [
            {
                title: "Dark Mode by Default",
                description: "Built to be easy on the eyes, matching your IDE environment perfectly."
            },
            {
                title: "Zero Distractions",
                description: "No news feeds, no notifications. Just the minimal tools you need to stay focused."
            }
        ],
        faq: [
            {
                question: "Will it slow down Chrome?",
                answer: "No. StartlyTab is incredibly lightweight and optimized to load instantly without hogging CPU or RAM."
            },
            {
                question: "Does it replace my current new tab?",
                answer: "Yes, it safely replaces the default Chrome new tab with a much calmer, privacy-focused experience."
            }
        ]
    },
    {
        id: "overwhelmed-designers",
        type: "use-case",
        slug: "overwhelmed-designers",
        seo: {
            title: "StartlyTab for Overwhelmed Designers | Find Creative Focus",
            description: "Protect your creative energy and find your flow state with a minimalist new tab designed for designers."
        },
        hero: {
            eyebrow: "For Creative Professionals",
            title: "Protect Your Creative Energy",
            subtitle: "Every time you open a new tab to find inspiration, you risk getting distracted. StartlyTab creates a barrier against digital noise.",
            primaryCta: "Install Free"
        },
        problemSection: {
            title: "The Creative Block",
            description: "Inspiration needs space to grow. Clutter kills it.",
            items: [
                "Too many Figma tabs and reference boards",
                "Digital fatigue from constant visual stimulation",
                "Losing track of deep work sessions"
            ]
        },
        transformationSection: {
            title: "Reclaiming Visual Peace",
            before: "A cluttered browser filled with Pinterest boards, Dribbble shots, and unread emails.",
            after: "A beautiful, minimalist sanctuary that clears your mind and helps you transition into a flow state.",
            image: "/images/redesign/maya sample.webp"
        },
        features: [
            {
                title: "Aesthetic Minimalism",
                description: "Carefully chosen typography and layouts that respect a designer's eye without demanding attention."
            },
            {
                title: "Mindful Check-ins",
                description: "Gentle prompts that help you step back and evaluate your stress levels during intense design sprints."
            }
        ],
        faq: [
            {
                question: "Can I customize the visual experience?",
                answer: "Yes, StartlyTab provides elegant, curated themes and settings to match your personal aesthetic."
            }
        ]
    },
    {
        id: "remote-work-sanctuary",
        type: "use-case",
        slug: "remote-work-sanctuary",
        seo: {
            title: "Build a Remote Work Sanctuary | StartlyTab",
            description: "Transform your chaotic browser into a calm, focused environment for remote work and digital wellness."
        },
        hero: {
            eyebrow: "Remote Work Wellness",
            title: "Create Boundaries When You Work Where You Sleep",
            subtitle: "StartlyTab helps you separate 'work mode' from 'life mode' directly inside your browser.",
            primaryCta: "Install Free"
        },
        problemSection: {
            title: "The Remote Dilemma",
            description: "When the office is your laptop, it's hard to turn work off.",
            items: [
                "Blurring lines between work hours and personal time",
                "Browser environments that trigger anxiety even on weekends",
                "Lack of physical transitions between tasks"
            ]
        },
        transformationSection: {
            title: "Building Digital Boundaries",
            before: "Opening your laptop feels like stepping immediately into a stressful office.",
            after: "Your browser becomes a sanctuary. Opening a new tab feels like taking a deep breath.",
            image: "/images/redesign/Rachel Sample.webp"
        },
        features: [
            {
                title: "Psychological Transitions",
                description: "StartlyTab acts as a mental buffer, helping you pause before jumping into work or winding down."
            },
            {
                title: "Emotional Workspaces",
                description: "A browser environment designed primarily for emotional regulation rather than just productivity."
            }
        ],
        faq: [
            {
                question: "Is it free to use?",
                answer: "StartlyTab offers a generous free tier with all the essential features you need to start finding calm."
            }
        ]
    },
    {
        id: "startlytab-vs-momentum",
        type: "compare",
        slug: "startlytab-vs-momentum",
        seo: {
            title: "StartlyTab vs Momentum | The Calmer Alternative",
            description: "Compare StartlyTab and Momentum. See why StartlyTab is the preferred choice for those seeking a truly calming new tab experience."
        },
        hero: {
            eyebrow: "Comparison",
            title: "StartlyTab vs Momentum",
            subtitle: "While Momentum focuses on productivity tracking and to-do lists, StartlyTab is designed strictly for emotional regulation and calm.",
            primaryCta: "Install Free",
            secondaryCta: "See the Difference"
        },
        problemSection: {
            title: "Why switch from Momentum?",
            description: "Sometimes 'productivity tools' just add more stress.",
            items: [
                "Tired of seeing a giant to-do list every time you open a tab",
                "Overwhelmed by high-contrast nature photos that demand attention",
                "Needing emotional support rather than task management"
            ]
        },
        transformationSection: {
            title: "From Task-Driven to Emotion-Driven",
            before: "A dashboard constantly asking you 'What is your main focus for today?' and pushing you to do more.",
            after: "A gentle space that asks 'How are you feeling?' and gives you permission to pause.",
            image: "/images/redesign/Lena Sample.webp"
        },
        features: [
            {
                title: "No Aggressive Task Tracking",
                description: "We don't put a massive to-do list in the center of your screen. Your new tab shouldn't be a source of guilt."
            },
            {
                title: "Subtle, Calming Aesthetics",
                description: "Instead of bright, distracting landscape photography, we use minimal, abstract visuals that don't compete for your attention."
            }
        ],
        faq: [
            {
                question: "Can I import my data from Momentum?",
                answer: "Since StartlyTab focuses on a different philosophy (calm over task tracking), we recommend starting fresh."
            }
        ]
    },
    {
        id: "gentle-check-ins",
        type: "feature",
        slug: "gentle-check-ins",
        seo: {
            title: "Gentle Check-ins for Work Anxiety | StartlyTab",
            description: "Reduce work anxiety with StartlyTab's gentle check-ins. A safe space in your browser to evaluate and manage your stress."
        },
        hero: {
            eyebrow: "Core Feature",
            title: "A Browser That Actually Checks In On You",
            subtitle: "Stop running on autopilot. StartlyTab uses gentle, non-intrusive prompts to help you reconnect with how you're actually feeling.",
            primaryCta: "Try Gentle Check-ins"
        },
        problemSection: {
            title: "The Problem with Autopilot",
            description: "We often don't realize we're stressed until we're completely burned out.",
            items: [
                "Holding your breath without realizing it while reading emails",
                "Tension building up in your shoulders throughout the day",
                "Mindlessly opening tabs to escape difficult work"
            ]
        },
        transformationSection: {
            title: "Awareness is the First Step",
            before: "Mindlessly scrolling and opening tabs in a state of low-level panic.",
            after: "Taking three seconds to acknowledge your stress level, taking a breath, and proceeding with intention.",
            image: "/images/redesign/homepage-1-pic.webp"
        },
        features: [
            {
                title: "Non-Intrusive Prompts",
                description: "The check-ins appear softly. No popups, no alarms. You can engage with them or completely ignore them."
            },
            {
                title: "Emotional Logging",
                description: "Briefly note your state of mind without complex tracking, helping you recognize patterns in your work week."
            }
        ],
        faq: [
            {
                question: "Are my emotional logs private?",
                answer: "Yes, absolutely. StartlyTab is built privacy-first. Your data is your own."
            }
        ]
    },
    {
        id: "minimalist-dashboard",
        type: "feature",
        slug: "minimalist-dashboard",
        seo: {
            title: "Minimalist New Tab Dashboard | StartlyTab",
            description: "Clear your mind with a beautifully minimalist new tab dashboard. Reduce visual clutter and digital fatigue."
        },
        hero: {
            eyebrow: "Core Feature",
            title: "Visual Silence for Your Browser",
            subtitle: "Remove the noise. StartlyTab provides a stunningly minimal workspace that gives your eyes and mind a rest.",
            primaryCta: "Install Free"
        },
        problemSection: {
            title: "Digital Clutter Causes Anxiety",
            description: "Your default new tab is designed to distract you, not calm you.",
            items: [
                "Articles and news feeds fighting for your attention",
                "Dozens of colorful app icons creating visual noise",
                "Cluttered bookmarks bars that remind you of unfinished work"
            ]
        },
        transformationSection: {
            title: "Embracing Empty Space",
            before: "A loud, chaotic interface that immediately drains your cognitive resources.",
            after: "A vast, calm, dark space that feels like taking off a heavy backpack.",
            image: "/images/redesign/homepage-3-pic-1.webp"
        },
        features: [
            {
                title: "True Dark Mode",
                description: "Deep, rich blacks and grays that dramatically reduce eye strain, especially during late-night sessions."
            },
            {
                title: "Hidden UI Elements",
                description: "Everything you need is accessible, but nothing is shown until you need it."
            }
        ],
        faq: [
            {
                question: "Can I still access my bookmarks easily?",
                answer: "Yes, StartlyTab allows elegant access to your essential bookmarks without cluttering the main view."
            }
        ]
    },
    {
        id: "ai-creative-companion",
        type: "feature",
        slug: "ai-creative-companion",
        seo: {
            title: "AI Companion for Creative Blocks | StartlyTab",
            description: "Break through creative blocks with StartlyTab's unique AI companion designed to spark synchronicity and new ideas."
        },
        hero: {
            eyebrow: "Core Feature",
            title: "An AI That Doesn't Give Orders",
            subtitle: "Unlike productivity bots, the StartlyTab AI acts as a poetic companion, offering sensory escapes and lateral thinking to break creative blocks.",
            primaryCta: "Meet Your Companion"
        },
        problemSection: {
            title: "The Productivity Trap",
            description: "When you're stuck, pushing harder usually makes it worse.",
            items: [
                "Staring at a blank page feeling increasingly anxious",
                "Standard AI tools just generating generic, robotic advice",
                "Needing a perspective shift, not a to-do list"
            ]
        },
        transformationSection: {
            title: "Embracing Synchronicity",
            before: "Frustration and rigid thinking keeping you trapped in a creative rut.",
            after: "A surprising, poetic prompt that makes you look out the window and shifts your entire perspective.",
            image: "/images/redesign/Rachel Sample.webp"
        },
        features: [
            {
                title: "Non-Linear Interventions",
                description: "The AI uses multi-dimensional observation axes to generate unique, soul-stirring interventions."
            },
            {
                title: "Context-Aware Escapes",
                description: "It notices your environment—like the time of day—to provide relevant micro-rituals."
            }
        ],
        faq: [
            {
                question: "Is this like ChatGPT?",
                answer: "No. It is explicitly designed NOT to be a helpful assistant. It's a creative companion meant to disrupt rigid thinking."
            }
        ]
    },
    {
        id: "tab-overload-relief",
        type: "workflow",
        slug: "tab-overload-relief",
        seo: {
            title: "Relief for Browser Tab Overload | StartlyTab Workflows",
            description: "Learn how to manage browser tab overload and regain control of your digital environment with StartlyTab."
        },
        hero: {
            eyebrow: "Workflow",
            title: "Surviving Browser Tab Overload",
            subtitle: "You have 84 tabs open across 4 windows. Here is how StartlyTab helps you breathe through the chaos.",
            primaryCta: "Install Free"
        },
        problemSection: {
            title: "The Weight of Open Tabs",
            description: "Every open tab is an unfinished task pulling at your subconscious.",
            items: [
                "Browser slowing to a crawl",
                "Fear of closing something important",
                "The physical sensation of overwhelm when looking at the tab bar"
            ]
        },
        transformationSection: {
            title: "Finding the Anchor",
            before: "Drowning in a sea of favicons, unable to find the one document you actually need.",
            after: "Opening a new StartlyTab and using it as a safe harbor to ground yourself before tackling the mess.",
            image: "/images/redesign/maya sample.webp"
        },
        features: [
            {
                title: "The 'Safe Room' Approach",
                description: "Treat the StartlyTab new tab as a neutral zone. When overwhelmed, open a new tab and just stare at the calm UI for 30 seconds."
            },
            {
                title: "Intentional Navigation",
                description: "Use our clean interface to decide exactly what you want to do next, rather than reacting to whatever tab happens to be open."
            }
        ],
        faq: [
            {
                question: "Does StartlyTab manage my other tabs?",
                answer: "StartlyTab focuses on providing a calm starting point. We believe the solution to tab overload is psychological grounding, not just another tab manager."
            }
        ]
    }
];
