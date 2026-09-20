import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { signInWithGoogle } from '../../lib/firebaseAuth';
import { 
  ShieldCheck, 
  Key, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  UserCheck, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Building2,
  Check,
  HelpCircle
} from 'lucide-react';

interface AuthScreenProps {
  initialEmail?: string;
  initialMode?: 'signin' | 'activate' | 'reset';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ 
  initialEmail = '', 
  initialMode = 'signin' 
}) => {
  const {
    loginWithCredentials,
    setupFirstTimePassword,
    requestPasswordReset,
    showToast
  } = useCRM();

  const [mode, setMode] = useState<'signin' | 'activate' | 'reset'>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check URL params for activation link
  useEffect(() => {
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(hashQuery || window.location.search);
    const action = params.get('action');
    const paramEmail = params.get('email');
    const paramCode = params.get('code');
    if (action === 'activate' || paramCode) {
      setMode('activate');
      if (paramEmail) setEmail(paramEmail);
      if (paramCode) setActivationCode(paramCode);
    }
  }, []);

  // Password validation checks
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const strengthScore = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const getStrengthLabel = () => {
    if (strengthScore <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
    if (strengthScore <= 3) return { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-600' };
    if (strengthScore === 4) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' };
    return { label: 'Strong & Secure', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  // Handle Standard Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg('Please enter your registered corporate email.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    const res = await loginWithCredentials(email, password);
    setIsLoading(false);
    if (!res.success) {
      if (res.requiresPasswordSetup) {
        setMode('activate');
        setErrorMsg(res.message || 'First-time login detected. Please choose your permanent password to activate your account.');
      } else {
        setErrorMsg(res.message || 'Invalid credentials.');
      }
    }
  };

  // Handle First-Time Password Decision & Activation
  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your corporate email.');
      return;
    }
    if (!activationCode.trim()) {
      setErrorMsg('Please provide your invitation/activation code.');
      return;
    }
    if (!hasMinLength) {
      setErrorMsg('Password must be at least 12 characters long.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    const res = await setupFirstTimePassword(email, password, activationCode);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.message || 'Failed to activate account.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showToast('Enter your corporate email above first, then click "Forgot Password?" again.', 'info');
      return;
    }
    const res = await requestPasswordReset(email);
    showToast(res.message || (res.success ? 'Password reset email sent.' : 'Could not send reset email.'), res.success ? 'success' : 'error');
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    const result = await signInWithGoogle();
    setIsLoading(false);
    if (!result.success) {
      setErrorMsg(result.message || 'Google sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#111328] flex flex-col justify-between text-gray-100 antialiased selection:bg-[#F25C05] selection:text-white">
      {/* Background Decorative Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#222448] rounded-full blur-3xl opacity-60"></div>
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-[#F25C05] rounded-full blur-3xl opacity-10"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-[#2b2e5c] rounded-full blur-3xl opacity-40"></div>
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F25C05] to-[#ff7d33] flex items-center justify-center shadow-lg shadow-[#F25C05]/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">AMRUT</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F25C05] text-white px-1.5 py-0.5 rounded">CRM</span>
            </div>
            <p className="text-xs text-gray-400">Enterprise Software Sales & Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#1D1F3D] px-3.5 py-1.5 rounded-full border border-gray-700/50 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Enterprise RBAC & SSO Ready</span>
        </div>
      </header>

      {/* Main Authentication Card Container */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-center gap-8">
        
        {/* Left Side: Authentication Form Card */}
        <div className="w-full max-w-md bg-[#1B1D3A] border border-gray-700/60 rounded-2xl p-7 shadow-2xl backdrop-blur-xl">
          {/* Card Tabs */}
          <div className="flex rounded-xl bg-[#111328] p-1 mb-6 border border-gray-800">
            <button
              id="auth_tab_signin"
              onClick={() => { setMode('signin'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-[#222448] text-white shadow-sm font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              id="auth_tab_activate"
              onClick={() => { setMode('activate'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'activate'
                  ? 'bg-[#F25C05] text-white shadow-sm font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>First-Time Setup</span>
            </button>
          </div>

          {/* Mode Header */}
          <div className="mb-6">
            {mode === 'signin' ? (
              <>
                <h1 className="text-xl font-bold text-white tracking-tight">Staff Sign In</h1>
                <p className="text-xs text-gray-400 mt-1">
                  Access your role-based CRM dashboard, pipeline, and customer records.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F25C05]/15 text-[#F25C05] text-xs font-semibold mb-2 border border-[#F25C05]/30">
                  <Key className="w-3.5 h-3.5" />
                  <span>Account Activation Flow</span>
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">Set Your First-Time Password</h1>
                <p className="text-xs text-gray-400 mt-1">
                  Newly invited or imported users choose their permanent password here on their first login.
                </p>
              </>
            )}
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form: Standard Sign In */}
          {mode === 'signin' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-2.5 px-4 rounded-xl text-sm border border-gray-300 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <span className="w-5 h-5 grid place-items-center rounded-full bg-white text-[#4285F4] font-black">G</span>
                <span>Continue with Google</span>
              </button>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="h-px bg-gray-700 flex-1" />
                <span>or use email and password</span>
                <span className="h-px bg-gray-700 flex-1" />
              </div>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Corporate Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signin_email_input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@amrutsoftware.com"
                    required
                    className="w-full bg-[#111328] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] transition-colors"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-end text-[11px]">
                  <button
                    type="button"
                    onClick={() => setMode('activate')}
                    className="text-[#F25C05] hover:underline font-semibold"
                  >
                    First time signing in? &rarr;
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] text-[#F25C05] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signin_password_input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-[#111328] border border-gray-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn_signin_submit"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-[#F25C05] hover:bg-[#d95204] text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-[#F25C05]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            </div>
          )}

          {/* Form: First-Time Setup Wizard */}
          {mode === 'activate' && (
            <form onSubmit={handleFirstTimeSetup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Corporate Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="setup_email_input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya.sharma@amrutsoftware.com"
                    required
                    className="w-full bg-[#111328] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-300">
                    Invitation / Activation Code
                  </label>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="setup_activation_code_input"
                    type="text"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="Enter the code from your invitation"
                    required
                    className="w-full bg-[#111328] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#F25C05] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Choose New Permanent Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="setup_new_password_input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 12 characters"
                    required
                    className="w-full bg-[#111328] border border-gray-700/80 rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Strength:</span>
                      <span className={`font-semibold ${getStrengthLabel().text}`}>
                        {getStrengthLabel().label}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-full flex-1 rounded-full transition-all ${
                            level <= strengthScore ? getStrengthLabel().color : 'bg-gray-800'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Requirements checklist */}
                    <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {hasMinLength ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                        <span>8+ Characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUpper && hasLower ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {hasUpper && hasLower ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                        <span>Upper & Lowercase</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {hasNumber ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                        <span>At least 1 Number</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {hasSpecial ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                        <span>Special Symbol (!@#$)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Confirm Permanent Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="setup_confirm_password_input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    required
                    className="w-full bg-[#111328] border border-gray-700/80 rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-[11px] mt-1 ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                    {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match yet'}
                  </p>
                )}
              </div>

              <button
                id="btn_setup_submit"
                type="submit"
                disabled={isLoading || !passwordsMatch || !hasMinLength}
                className="w-full mt-2 bg-gradient-to-r from-[#F25C05] to-[#ff7a29] hover:from-[#d95204] hover:to-[#f25c05] text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-[#F25C05]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Configuring Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Password & Launch CRM</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Security Note */}
          <div className="mt-6 pt-4 border-t border-gray-800 text-[11px] text-gray-400 flex items-center gap-2 justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-Bit Encrypted Session & Audit Trail Logging</span>
          </div>
        </div>

        {/* Right Side: onboarding information */}
        <div className="w-full max-w-md flex flex-col gap-4">
          {/* Workflow Guide Card */}
          <div className="bg-[#1D1F3D]/60 border border-gray-800 rounded-xl p-4 text-xs text-gray-400 space-y-2">
            <div className="flex items-center gap-1.5 text-gray-200 font-semibold">
              <HelpCircle className="w-4 h-4 text-[#F25C05]" />
              <span>How User Onboarding Works</span>
            </div>
            <p className="leading-relaxed">
              When an Admin creates or imports a user, the system generates an <strong>Activation Token</strong>. On first sign-in, the user enters their email and is guided to configure their permanent password before accessing CRM accounts and pipeline data.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 border-t border-gray-800">
        <p>© 2026 Amrut Software. Enterprise CRM Platform.</p>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <span>Single Sign-On (SSO) Support</span>
          <span>•</span>
          <span>Role-Based Data Privacy</span>
          <span>•</span>
          <span>Full Audit Logging</span>
        </div>
      </footer>
    </div>
  );
};
