# Email API Documentation

The NutriPlan application includes email sending capabilities via the Resend email service.

## Configuration

### Prerequisites

1. **Resend Account**: Sign up for a free account at [resend.com](https://resend.com)
2. **API Key**: Get your API key from the Resend dashboard

### Setup

Add your Resend API key to `.env.local`:

```bash
RESEND_API_KEY=re_your_api_key_here
WORKFLOW_DOC_RECIPIENT=tsem7354@gmail.com
```

## API Endpoints

### POST `/api/email-send`

Send a custom email using Resend.

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

**Response:**

Success (200):
```json
{
  "success": true,
  "id": "message-id-123"
}
```

Error:
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

**Response:**

Success (200):
```json
{
  "success": true,
  "id": "message-id-123",
  "message": "Workflow documentation sent to recipient@example.com"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3001/api/email-send/workflow-doc \
  -H "Content-Type: application/json" \
  -d '{"to": "tsem7354@gmail.com"}'
```

## Sending Workflow Documentation

### Using the Script

The `scripts/send-workflow-doc.js` script provides a convenient way to send the workflow documentation.

**Usage:**

```bash
# Send to default recipient (from WORKFLOW_DOC_RECIPIENT)
node scripts/send-workflow-doc.js

# Send to specific email
node scripts/send-workflow-doc.js user@example.com
```

**Requirements:**

- Development server must be running: `npm run dev`
- `RESEND_API_KEY` must be configured in `.env.local`

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

To test the email functionality locally:

```bash
# Start the development server
npm run dev

# In another terminal, send a test email
node scripts/send-workflow-doc.js test@example.com
```

Check your test email inbox (or spam folder) to verify the email was delivered successfully.

## Support

For issues with Resend:
- [Resend Documentation](https://resend.com/docs)
- [Resend Dashboard](https://app.resend.com)
- [Resend Support](https://resend.com/support)
