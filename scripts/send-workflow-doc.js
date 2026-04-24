#!/usr/bin/env node

/**
 * Script to send the workflow documentation to a specified email
 * Usage: node scripts/send-workflow-doc.js [email]
 *
 * Example:
 *   node scripts/send-workflow-doc.js tsem7354@gmail.com
 *   node scripts/send-workflow-doc.js  # Uses WORKFLOW_DOC_RECIPIENT from .env.local
 */

const http = require("http");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const recipientEmail =
  process.argv[2] ||
  process.env.WORKFLOW_DOC_RECIPIENT ||
  "tsem7354@gmail.com";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error("❌ Error: RESEND_API_KEY is not configured in .env.local");
  console.error("Please add your Resend API key to .env.local:");
  console.error("RESEND_API_KEY=re_xxxxxxxxxxxxx");
  process.exit(1);
}

console.log(`📧 Sending workflow documentation to ${recipientEmail}...`);

const requestData = JSON.stringify({
  to: recipientEmail,
});

const options = {
  hostname: "localhost",
  port: 3001,
  path: "/api/email-send/workflow-doc",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(requestData),
  },
};

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(data);

      if (response.success) {
        console.log(`✅ Success! Email sent.`);
        console.log(`   ID: ${response.id}`);
        console.log(`   To: ${recipientEmail}`);
        console.log(`   Message: ${response.message}`);
      } else {
        console.error(`❌ Error: ${response.error}`);
        process.exit(1);
      }
    } catch (e) {
      console.error("❌ Error: Could not parse response");
      console.error(data);
      process.exit(1);
    }
  });
});

req.on("error", (error) => {
  if (error.code === "ECONNREFUSED") {
    console.error(
      "❌ Error: Could not connect to http://localhost:3001"
    );
    console.error(
      "Make sure the development server is running: npm run dev"
    );
  } else {
    console.error(`❌ Error: ${error.message}`);
  }
  process.exit(1);
});

// Send the request
req.write(requestData);
req.end();
