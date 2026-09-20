// ==========================================================================
// Real Firebase Authentication wrapper.
//
// Design note: every signed-in Firebase Auth user's `uid` is set to match
// that user's existing CRM `usr_xxx` Firestore document id. Client SDKs
// cannot choose a custom uid (createUserWithEmailAndPassword always
// generates a random one), so account *creation* happens server-side via
// a Cloud Function that uses the Admin SDK (which can set an explicit
// uid): `activateInvitedUser` creates the Auth account for a
// newly-invited user the first time they set their password). Both live in
// /functions/src/index.ts.
//
// Once an account exists in Firebase Auth, everyday sign-in/sign-out/
// password-change all happen directly against the client SDK below — no
// Cloud Function round-trip needed for those.
//
// If neither function has been deployed/configured yet (VITE_*_FUNCTION_URL
// unset), the app still boots — see isFirebaseAuthProvisioningConfigured()
// — but first-time activation and demo provisioning will show a clear
// "not configured" message instead of failing silently.
// ==========================================================================

import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser
} from 'firebase/auth';

const ACTIVATE_USER_FUNCTION_URL: string = (import.meta as any).env?.VITE_ACTIVATE_USER_FUNCTION_URL || '';
const PROVISION_USER_FUNCTION_URL: string = (import.meta as any).env?.VITE_PROVISION_USER_FUNCTION_URL || '';
const AUTHORIZE_SESSION_FUNCTION_URL: string = (import.meta as any).env?.VITE_AUTHORIZE_SESSION_FUNCTION_URL || '';

export function isFirebaseAuthProvisioningConfigured(): boolean {
  return !!ACTIVATE_USER_FUNCTION_URL;
}


export interface AuthResult {
  success: boolean;
  message?: string;
  code?: string;
}

function friendlyAuthError(err: any): string {
  const code: string = err?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address doesn\'t look valid.';
    case 'auth/user-disabled':
      return 'This account has been disabled by the Administrator.';
    case 'auth/user-not-found':
      return 'No registered staff account found with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect password entered. Please check your credentials.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error reaching Firebase Authentication. Check your connection.';
    default:
      return err?.message || 'Sign-in failed. Please try again.';
  }
}

/**
 * Sign in an existing Firebase Auth account with email + password.
 */
export async function signIn(email: string, password: string): Promise<AuthResult & { user?: FirebaseUser }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const authorization = await authorizeCurrentSession(cred.user);
    if (!authorization.success) {
      await firebaseSignOut(auth);
      return authorization;
    }
    return { success: true, user: cred.user };
  } catch (err: any) {
    return { success: false, message: friendlyAuthError(err), code: err?.code };
  }
}

export async function authorizeCurrentSession(user: FirebaseUser): Promise<AuthResult & { crmUserId?: string }> {
  if (!AUTHORIZE_SESSION_FUNCTION_URL) {
    return { success: false, message: 'CRM session authorization is not configured.' };
  }
  try {
    const token = await user.getIdToken();
    const response = await fetch(AUTHORIZE_SESSION_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const body = await response.json().catch(() => ({}));
    return response.ok && body.success
      ? { success: true, crmUserId: body.crmUserId }
      : { success: false, message: body.message || `CRM authorization failed (${response.status}).` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'CRM authorization request failed.' };
  }
}

export async function signInWithGoogle(): Promise<AuthResult & { user?: FirebaseUser; crmUserId?: string }> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: 'amrutsoftware.com', prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const authorization = await authorizeCurrentSession(credential.user);
    if (!authorization.success) {
      await firebaseSignOut(auth);
      return authorization;
    }
    return { success: true, user: credential.user, crmUserId: authorization.crmUserId };
  } catch (err: any) {
    return { success: false, message: friendlyAuthError(err), code: err?.code };
  }
}

/**
 * Complete first-time activation for a user who exists as a Firestore CRM
 * user doc (isPasswordSet === false) but has no Firebase Auth account yet.
 * The client doesn't need to know that doc's id or even be signed in — the
 * `activateInvitedUser` Cloud Function looks the user up by email itself
 * (Admin SDK reads bypass Firestore's auth-gated security rules), validates
 * the activation code server-side, and creates the Firebase Auth account
 * with uid === that CRM user's Firestore doc id. We then sign in with the
 * new password.
 */
export async function activateAndSignIn(params: {
  email: string;
  newPassword: string;
  activationCode?: string;
}): Promise<AuthResult & { user?: FirebaseUser }> {
  if (!ACTIVATE_USER_FUNCTION_URL) {
    return {
      success: false,
      message: 'Account activation is unavailable. Ask your CRM administrator to provision your account.'
    };
  }
  try {
    const res = await fetch(ACTIVATE_USER_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email.trim(),
        newPassword: params.newPassword,
        activationCode: params.activationCode || ''
      })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) {
      return { success: false, message: body.message || `Activation failed (${res.status}).` };
    }
    // Account now exists in Firebase Auth with the requested password — sign in.
    return signIn(params.email, params.newPassword);
  } catch (err: any) {
    return { success: false, message: err?.message || 'Activation request failed. Check your connection.' };
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<AuthResult> {
  const user = auth.currentUser;
  if (!user || !user.email) return { success: false, message: 'You must be signed in to change your password.' };
  try {
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
      return { success: false, message: 'Current password does not match.' };
    }
    return { success: false, message: friendlyAuthError(err) };
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true, message: `Password reset email sent to ${email}.` };
  } catch (err: any) {
    return { success: false, message: friendlyAuthError(err) };
  }
}

export async function provisionUserAccount(profile: Record<string, unknown>): Promise<AuthResult & { userId?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) return { success: false, message: 'Administrator sign-in is required.' };
  if (!PROVISION_USER_FUNCTION_URL) return { success: false, message: 'User provisioning is not configured.' };

  try {
    const token = await currentUser.getIdToken();
    const response = await fetch(PROVISION_USER_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      return { success: false, message: body.message || `User provisioning failed (${response.status}).` };
    }
    await sendPasswordResetEmail(auth, String(profile.email));
    return { success: true, userId: body.userId, message: `Password setup email sent to ${profile.email}.` };
  } catch (err: any) {
    return { success: false, message: friendlyAuthError(err) };
  }
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Subscribe to Firebase Auth's sign-in state. Returns an unsubscribe fn.
 */
export function onAuthStateChanged(cb: (user: FirebaseUser | null) => void): () => void {
  return fbOnAuthStateChanged(auth, cb);
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}
