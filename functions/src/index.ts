/**
 * aiProxy — the only place the Anthropic API key is ever touched.
 *
 * The React app (src/lib/aiClient.ts) POSTs { task, payload } here. This
 * function builds a task-specific prompt, calls Claude, and returns
 * strictly-typed JSON back to the browser. Deploy with:
 *
 *   firebase functions:secrets:set ANTHROPIC_API_KEY
 *   firebase deploy --only functions
 *
 * Then set VITE_AI_FUNCTION_URL in the web app's .env to the printed
 * function URL. See SETUP.md for the full walkthrough.
 */

import { onRequest } from 'firebase-functions/v2/https';
import Anthropic from '@anthropic-ai/sdk';
import { getApps, getApp, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

const firebaseApp = getApps().length ? getApp() : initializeApp();

const CORPORATE_EMAIL_DOMAIN = '@amrutsoftware.com';
const FIRESTORE_DATABASE_ID = 'ai-studio-amrutcrmenterpri-21d4b3fe-9d3a-40be-887c-3c3e44436203';
const crmDb = () => getFirestore(firebaseApp, FIRESTORE_DATABASE_ID);

async function requireUserAdministrator(req: any): Promise<DecodedIdToken> {
  const bearer = String(req.headers.authorization || '');
  const idToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
  if (!idToken) throw new Error('UNAUTHENTICATED');

  const token = await getAuth(firebaseApp).verifyIdToken(idToken);
  const email = String(token.email || '').toLowerCase();
  if (email === 'abhay@amrutsoftware.com' && token.email_verified) return token;

  const mapping = await crmDb().collection('authProfiles').doc(token.uid).get();
  const crmUserId = String(mapping.data()?.crmUserId || token.uid);
  const profile = await crmDb().collection('users').doc(crmUserId).get();
  const role = String(profile.data()?.role || '');
  if (!profile.exists || !['CRM Administrator', 'Managing Director'].includes(role)) {
    throw new Error('FORBIDDEN');
  }
  return token;
}

/** Maps a verified Firebase identity to an existing active CRM user by email. */
export const authorizeCrmSession = onRequest(
  { cors: true, region: 'us-central1', timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, message: 'Use POST' });
      return;
    }

    try {
      const bearer = String(req.headers.authorization || '');
      const idToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
      if (!idToken) throw new Error('Authentication token is required.');

      const token = await getAuth(firebaseApp).verifyIdToken(idToken);
      const email = String(token.email || '').trim().toLowerCase();
      const provider = String(token.firebase?.sign_in_provider || '');
      if (!email.endsWith(CORPORATE_EMAIL_DOMAIN) || (provider === 'google.com' && !token.email_verified)) {
        res.status(403).json({ success: false, message: 'Use a verified @amrutsoftware.com account.' });
        return;
      }

      const db = crmDb();
      let users = await db.collection('users').where('email', '==', email).limit(2).get();
      if (users.empty && email === 'abhay@amrutsoftware.com' && token.email_verified) {
        await db.collection('users').doc(token.uid).set({
          id: token.uid,
          name: token.name || 'Abhay Bhalerao',
          employeeId: 'ADMIN-001',
          email,
          mobile: '',
          department: 'Management',
          role: 'Managing Director',
          territory: 'All',
          isActive: true,
          isOutOfOffice: false,
          vendorResponsibilities: [],
          eligibleForAutoAssignment: false,
          accountStatus: 'Active',
          isPasswordSet: provider === 'password',
          createdDate: new Date().toISOString(),
          modifiedDate: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
        users = await db.collection('users').where('email', '==', email).limit(2).get();
      }
      if (users.empty) {
        res.status(403).json({ success: false, message: 'Your email is not registered in CRM User Management.' });
        return;
      }
      if (users.size > 1) {
        res.status(409).json({ success: false, message: 'Duplicate CRM users exist for this email. Ask the administrator to merge them.' });
        return;
      }

      const crmUser = users.docs[0];
      const profile = crmUser.data();
      if (profile.isActive !== true) {
        res.status(403).json({ success: false, message: 'This CRM user has been deactivated.' });
        return;
      }

      // Public Firebase Email/Password sign-up must not claim a staff
      // profile by email alone. Trusted provisioned accounts have matching
      // IDs; legacy accounts already have a server-created mapping.
      const mappingRef = db.collection('authProfiles').doc(token.uid);
      const existingMapping = await mappingRef.get();
      if (token.uid !== crmUser.id && !token.email_verified && existingMapping.data()?.crmUserId !== crmUser.id) {
        res.status(403).json({ success: false, message: 'Verify your corporate email before accessing CRM.' });
        return;
      }

      await mappingRef.set({
        crmUserId: crmUser.id,
        email,
        provider: provider || 'unknown',
        authorizedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      await crmUser.ref.update({
        lastLogin: new Date().toISOString(),
        accountStatus: 'Active'
      });
      res.status(200).json({ success: true, crmUserId: crmUser.id });
    } catch (err: any) {
      console.error('[authorizeCrmSession] error:', err);
      res.status(401).json({ success: false, message: err?.message || 'Session authorization failed.' });
    }
  }
);

function asTrimmedString(value: unknown, maxLength: number): string {
  return String(value || '').trim().slice(0, maxLength);
}

// Update to whatever the current recommended model id is per
// https://docs.claude.com/en/docs/about-claude/models when you deploy.
const MODEL = 'claude-sonnet-4-5-20250929';

type AITask = 'score_lead' | 'classify_email' | 'summarize_thread' | 'chat' | 'campaign_copy' | 'next_best_action';

function buildPrompt(task: AITask, payload: any): { system: string; user: string } {
  switch (task) {
    case 'score_lead':
      return {
        system:
          'You are a B2B enterprise software sales analyst for an OEM/software reseller (Amrut Software). ' +
          'Score how likely a lead is to convert to a won deal, using BANT signals, source quality, and requirement clarity. ' +
          'Respond with ONLY a JSON object: {"score": number 0-100, "summary": string (<=25 words), ' +
          '"reasoning": string (<=60 words), "suggestedActions": string[] (2-4 short imperative actions)}.',
        user: `Lead record:\n${JSON.stringify(payload.lead, null, 2)}`
      };
    case 'classify_email':
      return {
        system:
          'You triage inbound business email for an enterprise software sales team. ' +
          'Classify the email and, if it implies a concrete follow-up, extract a suggested action. ' +
          'Respond with ONLY a JSON object: {"category": one of ["RFP / Quote Request","Meeting Request",' +
          '"BANT Signal","Vendor Inquiry","Delivery / Support","General"], "isHighPriority": boolean, ' +
          '"extractedAction": null | {"actionType": one of ["Create Calendar Event","Update Stage","Create Task","Log Activity"], ' +
          '"suggestedDate": ISO8601 string or null, "suggestedTitle": string, "confidenceScore": number 0-1}}.',
        user: `Email:\nFrom: ${payload.email?.from}\nSubject: ${payload.email?.subject}\nSnippet: ${payload.email?.snippet}\n\nToday's date: ${new Date().toISOString().split('T')[0]}`
      };
    case 'summarize_thread':
      return {
        system: 'Summarize this email thread for a busy salesperson in 2-3 sentences, focused on what they must do next. Respond with ONLY a JSON object: {"summary": string}.',
        user: JSON.stringify(payload.messages, null, 2)
      };
    case 'chat':
      return {
        system:
          'You are the AI assistant embedded in Amrut CRM, an enterprise software sales/services CRM. ' +
          'Answer concisely and practically using the CRM context summary provided. If you lack the data to answer, say so plainly. ' +
          'Respond with ONLY a JSON object: {"reply": string}.',
        user: `CRM context summary:\n${payload.contextSummary}\n\nConversation so far:\n${JSON.stringify(payload.turns, null, 2)}`
      };
    case 'campaign_copy':
      return {
        system:
          'You are a B2B demand-generation copywriter for an enterprise software reseller. Write concise, credible outbound copy (no hype, no exclamation marks). ' +
          'Respond with ONLY a JSON object: {"copy": string}.',
        user: `Channel: ${payload.brief?.channel}\nAudience: ${payload.brief?.audience}\nProduct: ${payload.brief?.product}\nGoal: ${payload.brief?.goal}`
      };
    case 'next_best_action':
      return {
        system:
          'You are a sales coach for enterprise software deals. Given this record, suggest 2-4 concrete next actions ranked by impact. ' +
          'Respond with ONLY a JSON object: {"actions": string[]}.',
        user: `${payload.entityType} record:\n${JSON.stringify(payload.entity, null, 2)}`
      };
    default:
      throw new Error(`Unknown AI task: ${task}`);
  }
}

export const aiProxy = onRequest(
  { cors: true, region: 'us-central1', timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const bearer = String(req.headers.authorization || '');
    const idToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
    try {
      if (!idToken) throw new Error('Missing token');
      await getAuth(firebaseApp).verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { task, payload } = req.body || {};
    if (!task) {
      res.status(400).json({ error: 'Missing "task" in request body' });
      return;
    }

    try {
      const { system, user } = buildPrompt(task, payload || {});
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('AI service is not configured.');
      const client = new Anthropic({ apiKey });

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: user }]
      });

      const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
      const raw = textBlock?.text?.trim() || '{}';

      // Claude sometimes wraps JSON in a fenced code block despite instructions — strip it defensively.
      const jsonText = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();

      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        parsed = { reply: raw, summary: raw, copy: raw };
      }

      res.status(200).json(parsed);
    } catch (err: any) {
      console.error('[aiProxy] error:', err);
      res.status(500).json({ error: err?.message || 'AI proxy failed' });
    }
  }
);

// =============================================================================
// Real Firebase Authentication provisioning
// -----------------------------------------------------------------------------
// Client SDKs can never choose a Firebase Auth account's uid — only the Admin
// SDK can. Both functions below use it to set uid === the corresponding CRM
// user's Firestore document id in the `users` collection, so the rest of the
// app can keep treating `currentUser.id` as a single stable identifier for
// both "which CRM records does this person own" and "who is signed in."
//
// Because these run with the Admin SDK, their Firestore reads bypass
// firestore.rules entirely — that's what lets an unauthenticated visitor
// safely activate their own account or sign in as a demo user without the
// `users` collection needing to be publicly readable.
// =============================================================================

/**
 * activateInvitedUser — first-time password setup for a user who exists as a
 * Firestore `users` doc (created by an Admin, directly or via bulk import)
 * but has no Firebase Auth account yet.
 *
 * Body: { email: string, newPassword: string, activationCode?: string }
 */
export const activateInvitedUser = onRequest(
  { cors: true, region: 'us-central1', timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, message: 'Use POST' });
      return;
    }

    const email = String(req.body?.email || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    const activationCode = String(req.body?.activationCode || '').trim();

    if (!email || !newPassword) {
      res.status(400).json({ success: false, message: 'Email and new password are required.' });
      return;
    }
    if (newPassword.length < 12) {
      res.status(400).json({ success: false, message: 'Password must be at least 12 characters long.' });
      return;
    }

    try {
      const db = crmDb();
      const snap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (snap.empty) {
        res.status(404).json({ success: false, message: 'No staff account found with this email address.' });
        return;
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as { tempActivationCode?: string; name?: string; isActive?: boolean };

      if (userData.isActive === false) {
        res.status(403).json({ success: false, message: 'This staff account has been deactivated by the Administrator.' });
        return;
      }

      const attemptRef = db.collection('activationAttempts').doc(userDoc.id);
      const submittedCode = activationCode.toUpperCase();
      const activationAllowed = await db.runTransaction(async transaction => {
        const [latestUser, attempts] = await Promise.all([transaction.get(userDoc.ref), transaction.get(attemptRef)]);
        const state = attempts.data() || {};
        const now = Date.now();
        if (Number(state.blockedUntil || 0) > now) return false;
        const storedCode = String(latestUser.data()?.tempActivationCode || '').trim().toUpperCase();
        if (storedCode.length >= 20 && submittedCode && storedCode === submittedCode) {
          transaction.delete(attemptRef);
          return true;
        }
        const failures = Number(state.failures || 0) + 1;
        transaction.set(attemptRef, {
          failures: failures >= 5 ? 0 : failures,
          blockedUntil: failures >= 5 ? now + 15 * 60 * 1000 : 0,
          updatedAt: FieldValue.serverTimestamp()
        });
        return false;
      });
      if (!activationAllowed) {
        res.status(403).json({ success: false, message: 'Invalid activation code or too many attempts. Wait 15 minutes if needed.' });
        return;
      }

      const uid = userDoc.id;
      try {
        await getAuth(firebaseApp).createUser({ uid, email, password: newPassword, displayName: userData.name || email });
      } catch (err: any) {
        if (err?.code === 'auth/uid-already-exists' || err?.code === 'auth/email-already-exists') {
          res.status(409).json({ success: false, message: 'This account is already activated. Use password reset instead.' });
          return;
        } else {
          throw err;
        }
      }

      await userDoc.ref.update({
        isPasswordSet: true,
        accountStatus: 'Active',
        tempActivationCode: FieldValue.delete(),
        passwordLastUpdated: FieldValue.serverTimestamp()
      });
      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('[activateInvitedUser] error:', err);
      res.status(500).json({ success: false, message: err?.message || 'Activation failed.' });
    }
  }
);

/** Administrator-only creation of Auth, CRM profile, and company membership. */
export const provisionUser = onRequest(
  { cors: true, region: 'us-central1', timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, message: 'Use POST' });
      return;
    }

    try {
      await requireUserAdministrator(req);
    } catch (err: any) {
      const status = err?.message === 'FORBIDDEN' ? 403 : 401;
      res.status(status).json({ success: false, message: status === 403 ? 'Administrator access is required.' : 'Authentication required.' });
      return;
    }

    const input = req.body || {};
    const email = asTrimmedString(input.email, 254).toLowerCase();
    const name = asTrimmedString(input.name, 120);
    const employeeId = asTrimmedString(input.employeeId, 40);
    const role = asTrimmedString(input.role, 80);
    const department = asTrimmedString(input.department, 100);
    const companyId = asTrimmedString(input.companyId, 128);
    const reportingManagerId = asTrimmedString(input.reportingManagerId, 128);

    if (!email.endsWith(CORPORATE_EMAIL_DOMAIN)) {
      res.status(400).json({ success: false, message: `Only ${CORPORATE_EMAIL_DOMAIN} email addresses are allowed.` });
      return;
    }
    if (!name || !employeeId || !role || !department || !companyId) {
      res.status(400).json({ success: false, message: 'Name, employee ID, role, department, and company are required.' });
      return;
    }

    const db = crmDb();
    try {
      const [companyDoc, existingEmail, existingEmployee] = await Promise.all([
        db.collection('companies').doc(companyId).get(),
        db.collection('users').where('email', '==', email).limit(1).get(),
        db.collection('users').where('employeeId', '==', employeeId).limit(1).get()
      ]);
      if (!companyDoc.exists) {
        res.status(400).json({ success: false, message: 'Selected company does not exist.' });
        return;
      }
      if (!existingEmail.empty) {
        res.status(409).json({ success: false, message: 'A CRM user with this email already exists.' });
        return;
      }
      if (!existingEmployee.empty) {
        res.status(409).json({ success: false, message: 'This employee ID is already in use.' });
        return;
      }

      const company = companyDoc.data() || {};
      const uid = `usr_${randomUUID().replace(/-/g, '')}`;
      const now = new Date().toISOString();
      await getAuth(firebaseApp).createUser({ uid, email, displayName: name, emailVerified: false, disabled: false });

      try {
        const profile = {
          id: uid,
          name,
          employeeId,
          email,
          mobile: asTrimmedString(input.mobile, 40),
          department,
          role,
          ...(reportingManagerId ? { reportingManagerId } : {}),
          territory: asTrimmedString(input.territory, 100) || 'Pan India',
          isActive: true,
          isOutOfOffice: false,
          vendorResponsibilities: Array.isArray(input.vendorResponsibilities) ? input.vendorResponsibilities.map((v: unknown) => asTrimmedString(v, 128)).filter(Boolean) : [],
          eligibleForAutoAssignment: input.eligibleForAutoAssignment !== false,
          createdDate: now,
          modifiedDate: now,
          lastLogin: 'Never',
          isPasswordSet: false,
          accountStatus: 'Pending Activation',
          primaryCompanyId: companyId
        };
        const membershipId = `${companyId}_${uid}`;
        const batch = db.batch();
        batch.create(db.collection('users').doc(uid), profile);
        batch.create(db.collection('userMemberships').doc(membershipId), {
          id: membershipId,
          userId: uid,
          companyId,
          companyName: String(company.name || company.legalEntity || companyId),
          companyCode: String(company.code || ''),
          role,
          department,
          ...(reportingManagerId ? { reportingManagerId } : {}),
          territory: profile.territory,
          vendorResponsibilities: profile.vendorResponsibilities,
          isDefault: true,
          isActive: true
        });
        await batch.commit();
      } catch (writeError) {
        await getAuth(firebaseApp).deleteUser(uid).catch(() => undefined);
        throw writeError;
      }

      res.status(201).json({ success: true, userId: uid });
    } catch (err: any) {
      if (err?.code === 'auth/email-already-exists') {
        res.status(409).json({ success: false, message: 'A Firebase account with this email already exists.' });
        return;
      }
      console.error('[provisionUser] error:', err);
      res.status(500).json({ success: false, message: 'User provisioning failed.' });
    }
  }
);
