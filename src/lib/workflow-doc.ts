/**
 * Workflow documentation content that can be sent via email
 * Contains development workflow, processes, and guidelines
 */

export const WORKFLOW_DOC_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 10px;
    }
    h2 {
      color: #4f46e5;
      margin-top: 30px;
    }
    h3 {
      color: #6366f1;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border-left: 4px solid #4f46e5;
    }
    pre code {
      background: none;
      padding: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
      color: #1f2937;
    }
    ul, ol {
      margin: 15px 0;
      padding-left: 25px;
    }
    li {
      margin: 8px 0;
    }
    .command {
      background: #1f2937;
      color: #e5e7eb;
      padding: 15px;
      border-radius: 5px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      margin: 10px 0;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success {
      background: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>NutriPlan Development Workflow</h1>

    <div class="success">
      <strong>Welcome to the NutriPlan project!</strong> This document outlines the development workflow, processes, and best practices for contributing to NutriPlan.
    </div>

    <h2>Project Overview</h2>
    <p>NutriPlan is a Next.js-based nutrition and meal planning application built with:</p>
    <table>
      <tr>
        <th>Layer</th>
        <th>Technology</th>
      </tr>
      <tr>
        <td>Language</td>
        <td>TypeScript 5 (Node 22)</td>
      </tr>
      <tr>
        <td>Framework</td>
        <td>Next.js 15</td>
      </tr>
      <tr>
        <td>Database</td>
        <td>Supabase (PostgreSQL)</td>
      </tr>
      <tr>
        <td>Testing</td>
        <td>Vitest</td>
      </tr>
      <tr>
        <td>Linting</td>
        <td>ESLint + TypeScript ESLint</td>
      </tr>
      <tr>
        <td>Code Formatting</td>
        <td>Prettier</td>
      </tr>
      <tr>
        <td>CI/CD</td>
        <td>GitHub Actions</td>
      </tr>
    </table>

    <h2>Local Development Setup</h2>

    <h3>Prerequisites</h3>
    <ul>
      <li>Node.js 22+ (<a href="https://github.com/nvm-sh/nvm">nvm</a> recommended)</li>
      <li>npm 10+</li>
      <li>Git</li>
    </ul>

    <h3>Getting Started</h3>
    <div class="command">
git clone &lt;repo-url&gt;
cd nutriplan
npm install
    </div>

    <h3>Environment Configuration</h3>
    <p>Copy <code>.env.example</code> to <code>.env.local</code> and configure:</p>
    <ul>
      <li><strong>Supabase:</strong> Database URL and API keys</li>
      <li><strong>OAuth Providers:</strong> Yandex Client ID and Secret</li>
      <li><strong>AI Services:</strong> GigaChat authentication</li>
      <li><strong>Telegram Bot:</strong> Bot token and username</li>
      <li><strong>Email Service:</strong> Resend API key</li>
    </ul>

    <h2>Development Commands</h2>
    <table>
      <tr>
        <th>Command</th>
        <th>Description</th>
      </tr>
      <tr>
        <td><code>npm run dev</code></td>
        <td>Start dev server with hot reload (port 3001)</td>
      </tr>
      <tr>
        <td><code>npm run build</code></td>
        <td>Build for production</td>
      </tr>
      <tr>
        <td><code>npm start</code></td>
        <td>Start production server</td>
      </tr>
      <tr>
        <td><code>npm test</code></td>
        <td>Run tests once</td>
      </tr>
      <tr>
        <td><code>npm run test:watch</code></td>
        <td>Run tests in watch mode</td>
      </tr>
      <tr>
        <td><code>npm run lint</code></td>
        <td>Lint source and test files</td>
      </tr>
      <tr>
        <td><code>npm run format</code></td>
        <td>Auto-format all files with Prettier</td>
      </tr>
      <tr>
        <td><code>npm run format:check</code></td>
        <td>Check if files match Prettier formatting</td>
      </tr>
    </table>

    <h2>Project Structure</h2>
    <pre><code>
src/
  app/                      # Next.js app directory
    api/                    # API routes
      auth/                 # Authentication endpoints
      meal-plans/           # Meal planning endpoints
      shopping/             # Shopping list endpoints
      email-send/           # Email sending endpoint
      ...                   # Other API routes
    dashboard/              # Dashboard pages and layout
    components/             # Page-level components
    page.tsx                # Home page
  components/               # Reusable React components
    ui/                     # UI primitives
    ...                     # Feature components
  lib/                      # Utility libraries
    supabase/               # Supabase client setup
    ...                     # Other utilities
  middleware.ts             # Next.js middleware
.github/
  workflows/
    ci.yml                  # GitHub Actions CI pipeline
.env.example                # Environment variables template
.env.local                  # Local environment (git-ignored)
package.json                # Dependencies and scripts
tsconfig.json               # TypeScript configuration
tailwind.config.js          # Tailwind CSS configuration
    </code></pre>

    <h2>Code Quality Standards</h2>

    <h3>Formatting and Linting</h3>
    <p>All code must pass Prettier and ESLint checks:</p>
    <div class="command">
npm run format:check
npm run lint
    </div>

    <h3>Testing</h3>
    <p>Write tests for new features and bug fixes:</p>
    <div class="command">
npm test
    </div>

    <h3>TypeScript</h3>
    <p>All code must be written in TypeScript with proper type annotations. No <code>any</code> types unless absolutely necessary.</p>

    <h2>CI/CD Pipeline</h2>
    <p>GitHub Actions runs automatically on every push and pull request to <code>main</code>:</p>
    <ol>
      <li><strong>Format Check:</strong> <code>prettier --check</code></li>
      <li><strong>Linting:</strong> <code>eslint</code></li>
      <li><strong>Tests:</strong> <code>vitest run</code></li>
      <li><strong>Build:</strong> <code>npm run build</code></li>
    </ol>
    <p>All four steps must pass before merging to main.</p>

    <h2>API Endpoints</h2>

    <h3>Email Sending</h3>
    <p><strong>POST</strong> <code>/api/email-send</code></p>
    <p>Send emails using Resend service.</p>
    <p><strong>Request Body:</strong></p>
    <pre><code>{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "&lt;h1&gt;HTML Content&lt;/h1&gt;",
  "from": "noreply@nutriplan.app"  // optional
}</code></pre>
    <p><strong>Response:</strong></p>
    <pre><code>{
  "success": true,
  "id": "email-message-id"
}</code></pre>

    <h2>Database Migrations</h2>
    <p>Database migrations are stored in <code>supabase/migrations/</code> directory. Use Supabase CLI to manage migrations:</p>
    <div class="command">
supabase migration new &lt;migration_name&gt;
    </div>

    <h2>Git Workflow</h2>

    <h3>Branch Naming</h3>
    <ul>
      <li><code>feature/description</code> - New features</li>
      <li><code>fix/description</code> - Bug fixes</li>
      <li><code>chore/description</code> - Maintenance tasks</li>
      <li><code>docs/description</code> - Documentation updates</li>
    </ul>

    <h3>Commit Messages</h3>
    <p>Use conventional commit format:</p>
    <div class="command">
&lt;type&gt;(&lt;scope&gt;): &lt;subject&gt;

&lt;body&gt;

&lt;footer&gt;
    </div>
    <p>Types: <code>feat</code>, <code>fix</code>, <code>docs</code>, <code>style</code>, <code>refactor</code>, <code>perf</code>, <code>test</code>, <code>chore</code></p>

    <h2>Deployment</h2>
    <p>The application is deployed automatically on merges to main via GitHub Actions and Vercel.</p>

    <div class="note">
      <strong>Important:</strong> Never commit sensitive information like API keys or passwords. Use environment variables instead.
    </div>

    <h2>Troubleshooting</h2>

    <h3>Port Already in Use</h3>
    <p>If port 3001 is already in use, kill the process or modify the dev command in <code>package.json</code>.</p>

    <h3>Dependencies Issues</h3>
    <p>Clear npm cache and reinstall:</p>
    <div class="command">
rm -rf node_modules package-lock.json
npm install
    </div>

    <h3>TypeScript Errors</h3>
    <p>Ensure TypeScript version matches <code>package.json</code> and compile to check for errors:</p>
    <div class="command">
npx tsc --noEmit
    </div>

    <div class="footer">
      <p>Last updated: ${new Date().toLocaleDateString()}</p>
      <p>For questions or issues, please open an issue on GitHub or contact the development team.</p>
    </div>
  </div>
</body>
</html>
`;

export async function sendWorkflowDoc(email: string) {
  const response = await fetch("/api/email-send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: email,
      subject: "NutriPlan Development Workflow Documentation",
      html: WORKFLOW_DOC_HTML,
    }),
  });

  return response.json();
}
