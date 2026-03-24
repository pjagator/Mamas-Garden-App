// ── Auth ───────────────────────────────────────────────────────
import { sb } from './app.js';

let otpEmail = '';

function setAuthMsg(text, type) {
    const el = document.getElementById('auth-msg');
    el.textContent = text;
    el.className = 'auth-msg' + (type ? ' ' + type : '');
}

export function showAuthTab(tab) {
    document.getElementById('signin-form').style.display = tab === 'signin' ? 'block' : 'none';
    document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
    document.getElementById('magic-form').style.display  = tab === 'magic'  ? 'block' : 'none';
    document.getElementById('reset-form').style.display  = tab === 'reset'  ? 'block' : 'none';
    document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
    document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
    document.getElementById('tab-magic').classList.toggle('active', tab === 'magic');
    setAuthMsg('', '');
}

export async function handleSignIn() {
    const email    = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    if (!email || !password) { setAuthMsg('Please enter email and password.', ''); return; }
    const btn = document.getElementById('signin-btn');
    btn.disabled = true; btn.textContent = 'Signing in...';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setAuthMsg(error.message, ''); btn.disabled = false; btn.textContent = 'Sign in'; }
}

export async function handleSignUp() {
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    if (!email || !password) { setAuthMsg('Please fill in all fields.', ''); return; }
    if (password.length < 6) { setAuthMsg('Password must be at least 6 characters.', ''); return; }
    const btn = document.getElementById('signup-btn');
    btn.disabled = true; btn.textContent = 'Creating...';
    const { error } = await sb.auth.signUp({ email, password });
    btn.disabled = false; btn.textContent = 'Create account';
    if (error) setAuthMsg(error.message, '');
    else setAuthMsg('Check your email to confirm your account, then sign in.', 'success');
}

export async function handleSendCode() {
    const email = document.getElementById('magic-email').value.trim();
    if (!email) { setAuthMsg('Please enter your email.', ''); return; }
    const btn = document.getElementById('magic-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    const { error } = await sb.auth.signInWithOtp({ email });
    btn.disabled = false; btn.textContent = 'Send code';
    if (error) { setAuthMsg(error.message, ''); return; }
    otpEmail = email;
    document.getElementById('otp-section').style.display = 'block';
    document.getElementById('otp-code').focus();
    setAuthMsg('Code sent! Check your email.', 'success');
}

export async function handleVerifyCode() {
    const code = document.getElementById('otp-code').value.trim();
    if (!code || code.length < 6) { setAuthMsg('Please enter the code from your email.', ''); return; }
    const btn = document.getElementById('otp-btn');
    btn.disabled = true; btn.textContent = 'Verifying...';
    const { error } = await sb.auth.verifyOtp({ email: otpEmail, token: code, type: 'email' });
    btn.disabled = false; btn.textContent = 'Verify code';
    if (error) setAuthMsg(error.message, '');
}

export async function handlePasswordReset() {
    const email = document.getElementById('reset-email').value.trim();
    if (!email) { setAuthMsg('Please enter your email.', ''); return; }
    const btn = document.getElementById('reset-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    btn.disabled = false; btn.textContent = 'Send reset link';
    if (error) setAuthMsg(error.message, '');
    else setAuthMsg('Check your email for a password reset link!', 'success');
}

export async function handleSignOut() {
    await sb.auth.signOut();
}
