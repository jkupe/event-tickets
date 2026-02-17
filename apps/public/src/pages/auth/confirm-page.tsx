import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { confirmSignUp } from '@event-tickets/shared-auth';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@event-tickets/shared-ui';

export function ConfirmPage() {
  const location = useLocation();
  const [email] = useState((location.state as { email?: string })?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmSignUp(email, code);
      navigate('/auth/sign-in', { state: { confirmed: true } });
    } catch (err: unknown) {
      setError((err as Error).message || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Verify Email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            We sent a verification code to <strong>{email}</strong>. Enter it below.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Verification Code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="123456" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
