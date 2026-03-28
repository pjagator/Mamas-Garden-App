import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Leaf, Mail, Lock, ArrowRight } from 'lucide-react'

interface AuthProps {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
  onOtp: (email: string) => Promise<void>
  onVerifyOtp: (email: string, token: string) => Promise<void>
  onResetPassword: (email: string) => Promise<void>
}

type AuthMode = 'signin' | 'signup' | 'otp' | 'verify-otp' | 'reset'

export function AuthPage({ onSignIn, onSignUp, onOtp, onVerifyOtp, onResetPassword }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      switch (mode) {
        case 'signin':
          await onSignIn(email, password)
          break
        case 'signup':
          await onSignUp(email, password)
          setMessage('Check your email to confirm your account.')
          break
        case 'otp':
          await onOtp(email)
          setMessage('Check your email for a 6-digit code.')
          setMode('verify-otp')
          break
        case 'verify-otp':
          await onVerifyOtp(email, otpCode)
          break
        case 'reset':
          await onResetPassword(email)
          setMessage('Password reset email sent.')
          break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-b from-green-deep via-green-mid to-green-deep flex flex-col items-center justify-center px-6 pt-safe">
      {/* Logo area */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-cream/10 flex items-center justify-center mx-auto mb-4">
          <Leaf className="w-8 h-8 text-cream" />
        </div>
        <h1 className="font-display text-3xl font-bold text-cream">
          Mama's Garden
        </h1>
        <p className="text-green-light/70 text-sm mt-2">
          A Tampa Bay garden journal
        </p>
      </div>

      {/* Auth card */}
      <Card className="w-full max-w-sm animate-slide-up">
        <CardHeader className="text-center">
          <CardTitle>
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create your garden'}
            {mode === 'otp' && 'Magic link'}
            {mode === 'verify-otp' && 'Enter your code'}
            {mode === 'reset' && 'Reset password'}
          </CardTitle>
          <CardDescription>
            {mode === 'signin' && 'Sign in to your garden journal'}
            {mode === 'signup' && 'Start cataloging your species'}
            {mode === 'otp' && "We'll email you a 6-digit code"}
            {mode === 'verify-otp' && 'Check your email for the code'}
            {mode === 'reset' && "We'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field (always shown) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light" />
                <Input
                  id="email"
                  type="email"
                  placeholder="gardener@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={mode === 'verify-otp'}
                />
              </div>
            </div>

            {/* Password field (signin/signup only) */}
            {(mode === 'signin' || mode === 'signup') && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {/* OTP code field */}
            {mode === 'verify-otp' && (
              <div className="space-y-2">
                <Label htmlFor="otp">6-digit code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-xl tracking-[0.3em]"
                  required
                />
              </div>
            )}

            {/* Messages */}
            {error && (
              <p className="text-terra text-sm text-center">{error}</p>
            )}
            {message && (
              <p className="text-green-mid text-sm text-center">{message}</p>
            )}

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                  Working...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === 'signin' && 'Sign in'}
                  {mode === 'signup' && 'Create account'}
                  {mode === 'otp' && 'Send code'}
                  {mode === 'verify-otp' && 'Verify'}
                  {mode === 'reset' && 'Send reset link'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            {/* Mode switchers */}
            <div className="space-y-2 pt-2">
              {mode === 'signin' && (
                <>
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                    className="block w-full text-sm text-green-mid hover:text-green-deep transition-colors text-center"
                  >
                    Don't have an account? <span className="font-medium">Sign up</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('otp'); setError(''); setMessage('') }}
                    className="block w-full text-sm text-ink-light hover:text-ink-mid transition-colors text-center"
                  >
                    Sign in with magic link
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(''); setMessage('') }}
                    className="block w-full text-sm text-ink-light hover:text-ink-mid transition-colors text-center"
                  >
                    Forgot password?
                  </button>
                </>
              )}
              {mode !== 'signin' && (
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(''); setMessage('') }}
                  className="block w-full text-sm text-green-mid hover:text-green-deep transition-colors text-center"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-green-light/40 text-xs mt-8 mb-4">
        Project Firebush v1.0
      </p>
    </div>
  )
}
