import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { signIn, confirmSignIn, getSession, useAuthStore } from '@event-tickets/shared-auth';
import { UserRole } from '@event-tickets/shared-types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@event-tickets/shared-ui';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const completeSignIn = async () => {
    const session = await getSession();
    if (session?.tokens?.idToken) {
      const payload = session.tokens.idToken.payload;
      const groups = (payload['cognito:groups'] as string[] | undefined) || [];
      let role = UserRole.USER;
      if (groups.includes('admin')) role = UserRole.ADMIN;
      else if (groups.includes('greeter')) role = UserRole.GREETER;

      setAuthenticated({
        userId: payload['sub'] as string,
        email: (payload['email'] as string) || email,
        name: (payload['name'] as string) || '',
        role,
        groups,
        idToken: session.tokens.idToken.toString(),
      });
    }

    navigate(from, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        navigate('/auth/confirm', { state: { email } });
        return;
      }

      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setNeedsNewPassword(true);
        setLoading(false);
        return;
      }

      await completeSignIn();
    } catch (err: unknown) {
      setError((err as Error).message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await confirmSignIn(newPassword);
      await completeSignIn();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to set new password');
    } finally {
      setLoading(false);
    }
  };

  if (needsNewPassword) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Set New Password</CardTitle>
            <p className="text-center text-sm text-gray-500">You must set a new password to continue.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNewPassword} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Setting password...' : 'Set Password & Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center text-sm space-y-2">
              <Link to="/auth/forgot-password" className="text-blue-900 hover:underline block">
                Forgot password?
              </Link>
              <p className="text-gray-500">
                Don't have an account?{' '}
                <Link to="/auth/sign-up" className="text-blue-900 hover:underline">Sign up</Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
