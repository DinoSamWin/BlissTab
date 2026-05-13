import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  privacyChoiceItems,
  privacyCollectionCards,
  privacyHandlingItems,
  privacyLimitedUseStatement,
  privacyPolicyBadge,
  privacyPolicyIntro,
  privacyPolicyLastUpdated,
  privacyPolicyTitle,
  privacyProviderRows,
  privacyStorageItems,
} from "../src/privacyPolicyContent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCollectionCards() {
  return privacyCollectionCards
    .map(
      (card) => `                <div class="card">
                    <h3>${escapeHtml(card.title)}</h3>
                    <ul>
${card.items
  .map((item) => `                        <li>${escapeHtml(item)}</li>`)
  .join("\n")}
                    </ul>
                </div>`,
    )
    .join("\n");
}

function renderTextWithEmailLink(text) {
  const email = "support@startlytab.com";
  if (!text.includes(email)) {
    return escapeHtml(text);
  }

  const [before, ...rest] = text.split(email);
  return `${escapeHtml(before)}<a href="mailto:${email}">${email}</a>${escapeHtml(rest.join(email))}`;
}

function renderLabeledList(items) {
  return items
    .map(
      (item) =>
        `                    <li style="margin-bottom:1rem;"><strong>${escapeHtml(item.label)}:</strong> ${renderTextWithEmailLink(item.text)}</li>`,
    )
    .join("\n");
}

function renderProviderRows() {
  return privacyProviderRows
    .map(
      (row) => `                        <tr>
                            <td>${escapeHtml(row.party)}</td>
                            <td>${escapeHtml(row.reason)}</td>
                        </tr>`,
    )
    .join("\n");
}

function renderPrivacyHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(privacyPolicyTitle)} - StartlyTab</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=Poltawski+Nowy:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #FBFBFE;
            --text: #1A1A1E;
            --primary: #4F46E5;
            --primary-soft: rgba(79, 70, 229, 0.08);
            --secondary: #556071;
            --border: rgba(26, 26, 30, 0.08);
            --border-strong: rgba(26, 26, 30, 0.12);
            --card-bg: rgba(255, 255, 255, 0.72);
            --table-head: rgba(255, 255, 255, 0.58);
            --shadow: 0 22px 60px rgba(15, 23, 42, 0.06);
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #0A0A0B;
                --text: #F3F4F6;
                --primary: #A5B4FC;
                --primary-soft: rgba(129, 140, 248, 0.16);
                --secondary: rgba(243, 244, 246, 0.68);
                --border: rgba(255, 255, 255, 0.08);
                --border-strong: rgba(255, 255, 255, 0.12);
                --card-bg: rgba(255, 255, 255, 0.04);
                --table-head: rgba(255, 255, 255, 0.05);
                --shadow: 0 22px 60px rgba(0, 0, 0, 0.24);
            }
        }
        html {
            background:
                radial-gradient(circle at top left, rgba(211, 227, 236, 0.58), transparent 30%),
                radial-gradient(circle at top right, rgba(234, 233, 202, 0.45), transparent 34%),
                var(--bg);
        }
        body {
            font-family: 'Inter', sans-serif;
            background:
                radial-gradient(circle at top left, rgba(211, 227, 236, 0.52), transparent 28%),
                radial-gradient(circle at top right, rgba(234, 233, 202, 0.4), transparent 32%),
                var(--bg);
            color: var(--text);
            line-height: 1.7;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 1120px;
            margin: 0 auto;
            padding: 3rem 2rem 4.5rem;
        }
        header {
            border-bottom: 1px solid var(--border);
            padding-bottom: 2.8rem;
            margin-bottom: 3rem;
        }
        .badge {
            display: inline-block;
            padding: 0.5rem 0.95rem;
            background: var(--primary-soft);
            color: var(--primary);
            font-size: 0.72rem;
            font-weight: 600;
            border-radius: 2rem;
            text-transform: uppercase;
            letter-spacing: 0.2rem;
            margin-bottom: 1.5rem;
        }
        h1 {
            font-size: clamp(3.2rem, 6vw, 4.6rem);
            font-weight: 600;
            margin: 0 0 1rem 0;
            letter-spacing: -0.065em;
            line-height: 0.94;
        }
        .subtitle {
            max-width: 900px;
            font-size: 1.2rem;
            color: var(--secondary);
            font-weight: 400;
            line-height: 1.75;
        }
        section {
            margin-bottom: 4rem;
        }
        .section-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.6rem;
        }
        .number {
            width: 2.1rem;
            height: 2.1rem;
            background: linear-gradient(135deg, #5750e8 0%, #4338ca 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            border-radius: 0.9rem;
            font-size: 0.98rem;
            box-shadow: 0 12px 30px rgba(79, 70, 229, 0.18);
        }
        h2 {
            font-size: 1.95rem;
            font-weight: 600;
            margin: 0;
            letter-spacing: -0.04em;
        }
        .box {
            background: var(--card-bg);
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            backdrop-filter: blur(20px);
            padding: 1.8rem 2rem;
            border-radius: 1.8rem;
            margin-bottom: 1.5rem;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.4rem;
        }
        @media (max-width: 768px) {
            .container {
                padding: 2.5rem 1.25rem 3.25rem;
            }
            .grid {
                grid-template-columns: 1fr;
            }
            .subtitle {
                font-size: 1.05rem;
            }
            h2 {
                font-size: 1.6rem;
            }
        }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            backdrop-filter: blur(20px);
            padding: 1.55rem 1.6rem;
            border-radius: 1.8rem;
        }
        .card h3 {
            margin: 0 0 0.9rem 0;
            font-size: 1.15rem;
            font-weight: 600;
            letter-spacing: -0.02em;
        }
        .card ul {
            padding-left: 1.15rem;
            font-size: 1rem;
            line-height: 1.9;
            margin: 0;
            color: var(--secondary);
        }
        .shoutout {
            background: var(--primary-soft);
            border: 1px solid rgba(79, 70, 229, 0.14);
            color: #3937bf;
            padding: 1.3rem 1.45rem;
            border-radius: 1.5rem;
            font-weight: 500;
            font-size: 0.98rem;
            line-height: 1.8;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.96rem;
        }
        th, td {
            text-align: left;
            padding: 1.25rem;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
        }
        th {
            background: var(--table-head);
            font-weight: 600;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.16rem;
            color: var(--secondary);
        }
        td:first-child {
            width: 32%;
            font-weight: 600;
            color: var(--text);
        }
        td:last-child {
            color: var(--secondary);
            line-height: 1.8;
        }
        tbody tr:last-child td {
            border-bottom: none;
        }
        .footer-banner {
            background: linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(99, 102, 241, 0.05));
            color: var(--text);
            border: 1px solid rgba(79, 70, 229, 0.14);
            box-shadow: var(--shadow);
            backdrop-filter: blur(20px);
            padding: 2rem;
            border-radius: 1.8rem;
            text-align: left;
        }
        .footer-banner h3 {
            font-size: 1.55rem;
            font-weight: 600;
            margin: 0 0 0.75rem 0;
            letter-spacing: -0.03em;
        }
        .footer-banner p {
            margin: 0;
            color: var(--secondary);
            line-height: 1.8;
        }
        footer {
            margin-top: 1.5rem;
            padding-top: 1rem;
            text-align: left;
            font-size: 0.88rem;
            color: var(--secondary);
        }
        footer p {
            margin: 0.25rem 0;
        }
        a {
            color: var(--primary);
            font-weight: 600;
            text-decoration: none;
        }
        strong {
            color: var(--text);
            font-weight: 600;
        }
    </style>
</head>
<body>
    <!-- Generated from src/privacyPolicyContent.js -->
    <div class="container">
        <header>
            <div class="badge">${escapeHtml(privacyPolicyBadge)}</div>
            <h1>${escapeHtml(privacyPolicyTitle)}</h1>
            <p class="subtitle">${escapeHtml(privacyPolicyIntro)}</p>
        </header>

        <section>
            <div class="section-header">
                <div class="number">1</div>
                <h2>User Data Collection</h2>
            </div>
            <div class="grid">
${renderCollectionCards()}
            </div>
        </section>

        <section>
            <div class="section-header">
                <div class="number">2</div>
                <h2>User Data Handling & Processing</h2>
            </div>
            <div class="box">
                <ul style="padding-left:1.5rem; font-size:0.95rem;">
${renderLabeledList(privacyHandlingItems)}
                </ul>
            </div>
        </section>

        <section>
            <div class="section-header">
                <div class="number">3</div>
                <h2>User Data Storage & Retention</h2>
            </div>
            <div class="box">
                <ul style="padding-left:1.5rem; font-size:0.95rem;">
${renderLabeledList(privacyStorageItems)}
                </ul>
            </div>
        </section>

        <section>
            <div class="section-header">
                <div class="number">4</div>
                <h2>User Data Sharing</h2>
            </div>
            <div class="shoutout" style="margin-bottom:1.5rem;">
                We do not sell your personal data and we do not use it for personalized advertising, creditworthiness decisions, or data brokerage.
            </div>
            <div class="box">
                <table>
                    <thead>
                        <tr>
                            <th>Party</th>
                            <th>Why Data May Be Shared</th>
                        </tr>
                    </thead>
                    <tbody>
${renderProviderRows()}
                    </tbody>
                </table>
            </div>
        </section>

        <section>
            <div class="section-header">
                <div class="number">5</div>
                <h2>Your Choices</h2>
            </div>
            <div class="box">
                <ul style="padding-left:1.5rem; font-size:0.95rem;">
${renderLabeledList(privacyChoiceItems)}
                </ul>
            </div>
        </section>

        <div class="footer-banner">
            <h3>Chrome Limited Use</h3>
            <p>${escapeHtml(privacyLimitedUseStatement)}</p>
        </div>

        <footer>
            <p>Last updated: ${escapeHtml(privacyPolicyLastUpdated)}</p>
            <p><a href="mailto:support@startlytab.com">support@startlytab.com</a></p>
        </footer>
    </div>
</body>
</html>
`;
}

async function writeGeneratedFile(relativePath, html) {
  const targetPath = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, html, "utf8");
}

const html = renderPrivacyHtml();

await writeGeneratedFile("public/privacy.html", html);
await writeGeneratedFile("public/privacy/index.html", html);
