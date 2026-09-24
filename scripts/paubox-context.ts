import { PLAY_OPTIONS, UPDATE_TYPE_OPTIONS } from "../lib/filters.ts";
import { SEGMENT_OPTIONS } from "../lib/segments.ts";

// Vendor context shared by the account and industry prompts. Product lineup is
// from paubox.com; the plays are this dashboard's own framing of it.
export const PAUBOX_CONTEXT = `The vendor is Paubox: HIPAA-compliant email security for
9,000+ healthcare organizations (SMB through enterprise), on Google Workspace and
Microsoft 365. Products:
- Paubox Email Suite: encrypted email that sends straight to the recipient's inbox (no portal)
- Inbound Email Security: generative-AI threat detection (phishing, BEC, spoofing)
- Data Loss Prevention: stops PHI leaving by email
- Email Archiving: compliance retention
- Paubox Marketing: HIPAA-compliant email marketing campaigns
- Paubox Email API: HIPAA-compliant transactional email for developers/apps
- Paubox Forms: secure patient intake forms

The customer success team runs a high-volume, opportunistic motion: most accounts
are quiet most of the time, and the job is to spot the few with a real reason to
talk now (expand, protect the renewal, or turn into an advocate).`;

export const PLAY_ENUM = PLAY_OPTIONS.map((p) => p.value);
export const UPDATE_TYPE_ENUM = UPDATE_TYPE_OPTIONS.map((t) => t.value);
export const SEGMENT_ENUM = SEGMENT_OPTIONS.map((s) => s.value);

export const TAXONOMY_TEXT = `updateType (pick exactly one):
${UPDATE_TYPE_OPTIONS.map((t) => `- "${t.value}" (${t.label})`).join("\n")}

play (the Paubox motion this points toward — pick exactly one):
${PLAY_OPTIONS.map((p) => `- "${p.value}" (${p.label})`).join("\n")}`;

export const SEGMENT_TEXT = SEGMENT_OPTIONS.map((s) => `- "${s.value}" (${s.label})`).join("\n");
