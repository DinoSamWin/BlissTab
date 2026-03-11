import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..', 'src');
const OUTPUT_FILE = path.join(__dirname, '..', 'i18n_strings.csv');

// These are the core files used AFTER the user logs in
const INCLUDE_FILES = [
    'App.tsx',
    'Settings.tsx',
    'IntegrationGateways.tsx',
    'TrendHub.tsx',
    'DailyRhythm.tsx',
    'PreferenceInputModal.tsx',
    'GatewayEditModal.tsx',
    'SubscriptionPage.tsx',
    'SubscriptionUpsellModal.tsx',
    'VentingModePromo.tsx',
    'DebugInfo.tsx',
    'TheRhythmBlueprint.tsx'
];

// Always exclude these dynamic or static marketing files
const EXCLUDE_CONTENT_FILES = [
    'perspectiveSkeletons.ts',
    'perspectiveService.ts',
    'LandingOptimization.tsx', // Pre-login / Long marketing text
    'FAQScreen.tsx',
    'PrivacyPolicy.tsx',
    'TermsOfService.tsx',
    'SocialProof.tsx',
    'ExtensionInstallPrompt.tsx',
    'SemanticFooter.tsx'
];

const EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx'];

function isUIString(s) {
    if (!s || s.trim().length <= 1) return false;
    const trimmed = s.trim();

    // 1. Basic filtering (SVG, Tailwind, Units)
    if (/^[Mm][0-9. ,e-]+[A-Za-z0-9. ,e-]+$/.test(trimmed)) return false;
    if (trimmed.includes('items-') || trimmed.includes('justify-') || trimmed.includes('flex-')) return false;
    if (trimmed.includes('rounded-') || trimmed.includes('border-') || trimmed.includes('shadow-')) return false;
    if (/^[0-9]+(\.[0-9]+)?(px|rem|em|vh|vw|%)?$/.test(trimmed)) return false;

    // 2. Filter out Technical/Code strings
    if (trimmed.startsWith('[') && trimmed.includes(']')) return false;
    if (trimmed.toLowerCase().includes('console.') || trimmed.toLowerCase().includes('localstorage')) return false;
    if (trimmed.includes('=>') || trimmed.includes('&&') || trimmed.includes('||')) return false;
    if (trimmed.includes('serif') || trimmed.includes('sans-serif')) return false;
    if (trimmed.includes('linear-gradient') || trimmed.includes('rgba')) return false;

    // 3. Length check: Usually UI buttons and labels aren't extremely long
    // If it's a huge block of text (over 200 chars), it might be more "Content" than "UI"
    if (trimmed.length > 200 && !/[\u4e00-\u9fa5]/.test(trimmed)) return false;

    // 4. Content check
    if (/[\u4e00-\u9fa5]/.test(trimmed)) return true; // Chinese is almost always UI
    if (/[a-zA-Z]/.test(trimmed)) {
        if (trimmed.includes(' ')) return true; // Sentences
        if (/^[A-Z][A-Za-z]+$/.test(trimmed)) return true; // Capitalized labels
    }

    return false;
}

const strings = new Map();

function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'locales'].includes(item)) walk(fullPath);
        } else if (EXTENSIONS.includes(path.extname(item))) {
            const fileName = path.basename(item);
            if (INCLUDE_FILES.includes(fileName) && !EXCLUDE_CONTENT_FILES.includes(fileName)) {
                extractFromFile(fullPath);
            }
        }
    }
}

function generateKey(fileRelative, text) {
    const fileBase = path.basename(fileRelative, path.extname(fileRelative))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

    let slug = text
        .trim()
        .replace(/[\u4e00-\u9fa5]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 30);

    if (!slug) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        slug = `msg_${Math.abs(hash).toString(36).substring(0, 4)}`;
    }

    return `${fileBase}.${slug}`;
}

function extractFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    const jsxTextRegex = />([^<>{}\n\r]+)</g;
    let match;
    while ((match = jsxTextRegex.exec(content)) !== null) {
        const text = match[1].trim();
        if (isUIString(text)) addString(text, relativePath);
    }

    const attrRegex = /(?:placeholder|title|label|alt|caption)=["']([^"']+)["']/g;
    while ((match = attrRegex.exec(content)) !== null) {
        const text = match[1].trim();
        if (isUIString(text)) addString(text, relativePath);
    }

    const literalRegex = /["']([^"'\r\n]{3,})["']/g;
    while ((match = literalRegex.exec(content)) !== null) {
        const text = match[1].trim();
        if (isUIString(text)) addString(text, relativePath);
    }
}

function addString(text, file) {
    if (strings.has(text)) return;
    const isCn = /[\u4e00-\u9fa5]/.test(text);
    strings.set(text, {
        key: generateKey(file, text),
        zh: isCn ? text : '',
        en: isCn ? '' : text,
        file
    });
}

walk(ROOT_DIR);

const columns = ['key', 'zh', 'en', 'de', 'fr', 'es', 'it', 'ja', 'pl', 'pt', 'vi', 'ar'];
const csvHeader = columns.join(',') + '\n';
const sortedStrings = Array.from(strings.values()).sort((a, b) => a.file.localeCompare(b.file));

const csvRows = sortedStrings
    .map(s => {
        const row = [
            s.key,
            `"${s.zh.replace(/"/g, '""')}"`,
            `"${s.en.replace(/"/g, '""')}"`,
            '', '', '', '', '', '', '', '', ''
        ];
        return row.join(',');
    })
    .join('\n');

fs.writeFileSync(OUTPUT_FILE, csvHeader + csvRows);
console.log(`Core UI extracted. Only including Post-Login modules. Unique strings: ${strings.size}`);
