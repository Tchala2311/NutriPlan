# Email API Documentation

The NutriPlan application includes email sending capabilities with dual modes:
- **Development**: Mock email service (logs to console, no API key required)
- **Production**: Resend service (real email delivery with API key)

## Quick Start (Development)

No configuration needed. Emails are logged to console:

```bash
npm run dev
# Email endpoints work immediately with mock service
```

## Production Configuration

### Prerequisites

1. **Resend Account**: Sign up for a free account at [resend.com](https://resend.com)
2. **API Key**: Get your API key from the Resend dashboard

### Setup

Add your Resend API key to `.env.local` or production environment:

```bash
RESEND_API_KEY=re_your_api_key_here
WORKFLOW_DOC_RECIPIENT=tsem7354@gmail.com
```

Once configured, the email service automatically switches from mock to real Resend delivery.

## Email Service Modes

### Development Mode (Mock)
- **Enabled**: When `RESEND_API_KEY` is not configured
- **Behavior**: Logs emails to console, generates fake message IDs
- **Use Case**: Local testing, CI/CD pipelines without external API access

Console output example:
```
📧 [MOCK EMAIL]
   From: noreply@nutriplan.app
   To: user@example.com
   Subject: Email Subject
   HTML Length: 1234 chars
   ID: mock_1234567890_abc123def45
```

### Production Mode (Resend)
- **Enabled**: When `RESEND_API_KEY` is configured
- **Behavior**: Sends real emails through Resend API
- **Use Case**: Production deployments, real user communication

## API Endpoints

### POST `/api/email-send`

Send a custom email using the configured email service.

**Request Body:**

```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<h1>HTML Content</h1>",
  "from": "noreply@nutriplan.app"
}
```

**Parameters:**

- `to` (required): Recipient email address
- `subject` (required): Email subject line
- `html` (required): HTML content of the email
- `from` (optional): Sender email address (defaults to `noreply@nutriplan.app`)

**Response (Development Mode):**

Success (200):
```json
{
  "success": true,
  "id": "mock_1234567890_abc123def45",
  "note": "Using mock email service (RESEND_API_KEY not configured)"
}
```

**Response (Production Mode):**

Success (200):
```json
{
  "success": true,
  "id": "message-id-from-resend-123"
}
```

**Error Response:**

```json
{
  "error": "Error message describing what went wrong"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3001/api/email-send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Hello",
    "html": "<p>This is a test email</p>"
  }'
```

### POST `/api/email-send/workflow-doc`

Send the NutriPlan workflow documentation to an email address.

**Request Body:**

```json
{
  "to": "recipient@example.com"
}
```

**Parameters:**

- `to` (optional): Recipient email address
  - If not provided, uses `WORKFLOW_DOC_RECIPIENT` env variable
  - Defaults to `tsem7354@gmail.com`

**Response (Development Mode):**

Success (200):
```json
{
  "success": true,
  "id": "mock_1234567890_abc123def45",
  "message": "Workflow documentation sent to tsem7354@gmail.com",
  "note": "Using mock email service (RESEND_API_KEY not configured). In production, configure RESEND_API_KEY to send real emails."
}
```

**Response (Production Mode):**

Success (200):
```json
{
  "success": true,
  "id": "message-id-from-resend-123",
  "message": "Workflow documentation sent to tsem7354@gmail.com"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3001/api/email-send/workflow-doc \
  -H "Content-Type: application/json" \
  -d '{"to": "tsem7354@gmail.com"}'
```

## Sending Workflow Documentation

### Development Mode (Mock)

No configuration needed. Emails are logged to console:

```bash
npm run dev
# In another terminal:
node scripts/send-workflow-doc.js

# Output in dev server terminal:
# 📧 [MOCK EMAIL]
#    From: noreply@nutriplan.app
#    To: tsem7354@gmail.com
#    Subject: NutriPlan Development Workflow Documentation
#    HTML Length: 12345 chars
#    ID: mock_1234567890_abc123def45
```

### Using the Script

The `scripts/send-workflow-doc.js` script provides a convenient way to send the workflow documentation.

**Usage:**

```bash
# Development mode (no key needed, logs to console)
npm run dev
# In another terminal:
node scripts/send-workflow-doc.js

# Production mode (with RESEND_API_KEY configured)
node scripts/send-workflow-doc.js
node scripts/send-workflow-doc.js user@example.com  # Send to specific email
```

**Requirements:**

- Development server must be running: `npm run dev`
- For production delivery: `RESEND_API_KEY` must be configured in `.env.local`

### Using the API Directly

```javascript
async function sendWorkflowDoc(email) {
  const response = await fetch("/api/email-send/workflow-doc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: email }),
  });

  return response.json();
}

// Send to specific email
await sendWorkflowDoc("tsem7354@gmail.com");
```

## Workflow Documentation Content

The workflow documentation includes:

- Project overview and technology stack
- Local development setup instructions
- Development commands and utilities
- Project structure and file organization
- Code quality standards (formatting, linting, testing, TypeScript)
- CI/CD pipeline configuration
- API endpoint documentation
- Database migration guidelines
- Git workflow and commit conventions
- Deployment information
- Troubleshooting guide

## Error Handling

### Common Errors

**"Email service not configured"**
- Missing or invalid `RESEND_API_KEY`
- Check your `.env.local` file

**"Invalid email address"**
- Email format is invalid
- Verify the recipient email address

**"Failed to send email"**
- API request to Resend failed
- Check your Resend account and API key validity
- Verify the email address is not blocked

**Connection refused**
- Development server is not running
- Start the server with `npm run dev`

## Production Deployment

When deploying to production:

1. Set `RESEND_API_KEY` in your production environment variables
2. Optionally set `WORKFLOW_DOC_RECIPIENT` for the default recipient
3. The API routes will automatically use the production API key

## Security Considerations

- Never commit `.env.local` files with API keys
- Rotate API keys regularly
- Consider adding rate limiting for the email endpoints in production
- Validate email addresses before sending
- Store email audit logs if required for compliance

## Testing

### Development Testing (Mock Mode)

No Resend API key needed. Emails are logged to the dev server console:

```bash
# Terminal 1: Start the development server
npm run dev

# Terminal 2: Send test workflow doc (uses mock service)
node scripts/send-workflow-doc.js

# Watch dev server terminal output:
# 📧 [MOCK EMAIL]
#    From: noreply@nutriplan.app
#    To: tsem7354@gmail.com
#    Subject: NutriPlan Development Workflow Documentation
```

### cURL Testing

**Development Mode:**
```bash
curl -X POST http://localhost:3001/api/email-send/workflow-doc \
  -H "Content-Type: application/json" \
  -d '{}'

# Response:
# {"success":true,"id":"mock_...","message":"...","note":"Using mock email service..."}
```

**Production Mode (with RESEND_API_KEY):**
```bash
curl -X POST http://localhost:3001/api/email-send/workflow-doc \
  -H "Content-Type: application/json" \
  -d '{"to":"tsem7354@gmail.com"}'

# Response:
# {"success":true,"id":"resend-message-id-...","message":"..."}
```

### Email Verification

**Development:** Check dev server console for `📧 [MOCK EMAIL]` logs

**Production:** Once `RESEND_API_KEY` is configured, check recipient inbox for delivered emails

## Support

For issues with Resend:
- [Resend Documentation](https://resend.com/docs)
- [Resend Dashboard](https://app.resend.com)
- [Resend Support](https://resend.com/support)
