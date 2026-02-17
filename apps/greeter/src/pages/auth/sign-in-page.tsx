import { useState } from 'react';
import { useNavigate } from 'react-router';
import { signIn, getSession, useAuthStore } from '@event-tickets/shared-auth';
import { UserRole } from '@event-tickets/shared-types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@event-tickets/shared-ui';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      const session = await getSession();
      if (!session?.tokens?.idToken) throw new Error('Failed to get session');

      const payload = session.tokens.idToken.payload;
      const groups = (payload['cognito:groups'] as string[] | undefined) || [];

      if (!groups.includes('admin') && !groups.includes('greeter')) {
        setError('Access denied. Greeter or admin privileges required.');
        setLoading(false);
        return;
      }

      let role = UserRole.GREETER;
      if (groups.includes('admin')) role = UserRole.ADMIN;

      setAuthenticated({
        userId: payload['sub'] as string,
        email: (payload['email'] as string) || email,
        name: (payload['name'] as string) || '',
        role,
        groups,
        idToken: session.tokens.idToken.toString(),
      });

      navigate('/scan', { replace: true });
    } catch (err: unknown) {
      setError((err as Error).message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Greeter Check-In</CardTitle>
          <p className="text-center text-sm text-gray-500">FBC Pittsfield</p>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
