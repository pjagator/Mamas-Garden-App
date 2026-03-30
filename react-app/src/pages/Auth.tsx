import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import type { AuthTab } from '@/types'

export default function Auth() {
  const { signIn, signUp, sendOtp, verifyOtp, resetPassword } = useAuth()
  const [tab, setTab] = useState<AuthTab>('signin')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Please enter email and password.'); return }
    setLoading(true)
    const error = await signIn(email, password)
    setLoading(false)
    if (error) toast.error(error)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Please fill in all fields.'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return }
    setLoading(true)
    const error = await signUp(email, password)
    setLoading(false)
    if (error) toast.error(error)
    else toast.success('Check your email to confirm your account, then sign in.')
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!otpEmail) { toast.error('Please enter your email.'); return }
    setLoading(true)
    const error = await sendOtp(otpEmail)
    setLoading(false)
    if (error) { toast.error(error); return }
    setOtpSent(true)
    toast.success('Code sent! Check your email.')
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode || otpCode.length < 6) { toast.error('Please enter the 6-digit code.'); return }
    setLoading(true)
    const error = await verifyOtp(otpEmail, otpCode)
    setLoading(false)
    if (error) toast.error(error)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetEmail) { toast.error('Please enter your email.'); return }
    setLoading(true)
    const error = await resetPassword(resetEmail)
    setLoading(false)
    if (error) toast.error(error)
    else toast.success('Check your email for a password reset link!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary-mid to-sage flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <img src="/logo.svg" alt="" className="w-20 h-20 mx-auto mb-2" />
        <h1 className="font-display text-4xl font-bold text-white mb-2">Tampa Garden</h1>
        <p className="text-sage-light text-sm italic font-display">A botanical journal</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as AuthTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="magic">Code</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input id="signin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input id="signin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <button type="button" onClick={() => setTab('reset')} className="text-xs text-ink-light hover:text-primary w-full text-center mt-2 min-h-0 min-w-0">
                Forgot password?
              </button>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          )}

          {tab === 'magic' && (
            <form onSubmit={otpSent ? handleVerifyCode : handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-email">Email</Label>
                <Input id="otp-email" type="email" value={otpEmail} onChange={e => setOtpEmail(e.target.value)} placeholder="your@email.com" disabled={otpSent} />
              </div>
              {otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="otp-code">6-digit code</Label>
                  <Input id="otp-code" type="text" inputMode="numeric" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="000000" autoFocus />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : otpSent ? 'Verify code' : 'Send code'}
              </Button>
            </form>
          )}

          {tab === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="your@email.com" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
              <button type="button" onClick={() => setTab('signin')} className="text-xs text-ink-light hover:text-primary w-full text-center mt-2 min-h-0 min-w-0">
                Back to sign in
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
