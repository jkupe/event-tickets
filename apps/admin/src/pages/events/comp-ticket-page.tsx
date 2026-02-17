import { useParams, useNavigate } from 'react-router';
import { useIssueCompTicket, useEvent } from '@event-tickets/shared-api-client';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, LoadingSpinner } from '@event-tickets/shared-ui';
import { useState } from 'react';

export function CompTicketPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { data: eventData, isLoading } = useEvent(eventId);
  const issueComp = useIssueCompTicket(eventId!);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (isLoading) return <LoadingSpinner className="py-20" />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const form = new FormData(e.currentTarget);

    try {
      await issueComp.mutateAsync({
        userEmail: form.get('email') as string,
        userName: form.get('name') as string,
        quantity: parseInt(form.get('quantity') as string || '1', 10),
        reason: form.get('reason') as string,
      });
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to issue comp ticket');
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Issue Complimentary Ticket</CardTitle>
          <p className="text-sm text-gray-500">{eventData?.data?.name}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Recipient Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">Recipient Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" min="1" max="10" defaultValue="1" />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" name="reason" required rows={2} />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">Comp ticket issued successfully! A confirmation email has been sent.</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={issueComp.isPending}>
                {issueComp.isPending ? 'Issuing...' : 'Issue Comp Ticket'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Back</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
