import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { signIn, getSession, useAuthStore } from '@event-tickets/shared-auth';
import { UserRole } from '@event-tickets/shared-types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@event-tickets/shared-ui';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

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
    } catch (err: unknown) {
      setError((err as Error).message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

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
