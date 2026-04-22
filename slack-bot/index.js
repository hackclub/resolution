require('dotenv').config();
const Airtable = require('airtable');
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
const table = base(process.env.AIRTABLE_TABLE_ID);

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 30000;

const PATHWAY_LABELS = {
  PYTHON: 'Python',
  RUST: 'Rust',
  GAME_DEV: 'Game Dev',
  HARDWARE: 'Hardware',
  DESIGN: 'Design',
  GENERAL_CODING: 'General Coding'
};

// Track which records we've already notified so we don't DM twice
const notifiedRecords = new Set();

async function getSlackUserByEmail(email) {
  try {
    const result = await slack.users.lookupByEmail({ email });
    return result.user;
  } catch (err) {
    if (err.data?.error === 'users_not_found') {
      return null;
    }
    throw err;
  }
}

async function sendRejectionDM(slackUserId, { pathway, week, reason, codeUrl, recordId }) {
  const pathwayLabel = PATHWAY_LABELS[pathway] || pathway;
  const resubmitLink = `https://forms.hackclub.com/t/4AMqpmePugus?id=${recordId}`;

  const message =
    `Heya! Your Resolution ${pathwayLabel} Week ${week} project has been rejected for the following reason:\n\n` +
    `> ${reason}\n\n` +
    `Please fix this ASAP! Once you have, please resubmit with this link: ${resubmitLink}`;

  await slack.chat.postMessage({
    channel: slackUserId,
    text: message
  });
}

async function pollRejectedRecords() {
  try {
    const records = await table
      .select({
        filterByFormula: `AND({Rejected} = TRUE(), {Reject Reason} != "")`,
        fields: [
          'Email',
          'Pathway',
          'Week',
          'Reject Reason',
          'Code URL',
          'Slack ID'
        ]
      })
      .all();

    for (const record of records) {
      if (notifiedRecords.has(record.id)) continue;

      const email = record.get('Email');
      const pathway = record.get('Pathway');
      const week = record.get('Week');
      const reason = record.get('Reject Reason');
      const codeUrl = record.get('Code URL');
      let slackId = record.get('Slack ID');

      if (!reason || !pathway || !week) {
        notifiedRecords.add(record.id);
        continue;
      }

      // If no Slack ID field on Airtable, look up by email
      if (!slackId && email) {
        const slackUser = await getSlackUserByEmail(email);
        if (slackUser) {
          slackId = slackUser.id;
        }
      }

      if (!slackId) {
        console.log(`No Slack ID found for record ${record.id} (${email}), skipping DM`);
        notifiedRecords.add(record.id);
        continue;
      }

      try {
        await sendRejectionDM(slackId, {
          pathway,
          week,
          reason,
          codeUrl,
          recordId: record.id
        });
        console.log(`Sent rejection DM for record ${record.id} to ${slackId}`);
      } catch (err) {
        console.error(`Failed to DM ${slackId} for record ${record.id}:`, err.message);
      }

      notifiedRecords.add(record.id);
    }
  } catch (err) {
    console.error('Error polling Airtable:', err.message);
  }
}

async function main() {
  console.log('Resolution Slack Bot started');
  console.log(`Polling every ${POLL_INTERVAL / 1000}s`);

  // Initial poll
  await pollRejectedRecords();

  // Continue polling
  setInterval(pollRejectedRecords, POLL_INTERVAL);
}

main();
