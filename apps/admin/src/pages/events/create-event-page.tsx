import { useNavigate } from 'react-router';
import { useCreateEvent } from '@event-tickets/shared-api-client';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@event-tickets/shared-ui';
import { useState } from 'react';

export function CreateEventPage() {
  const navigate = useNavigate();
  const createEvent = useCreateEvent();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);

    try {
      const result = await createEvent.mutateAsync({
        name: form.get('name') as string,
        description: form.get('description') as string,
        date: new Date(form.get('date') as string).toISOString(),
        endDate: new Date(form.get('endDate') as string).toISOString(),
        location: form.get('location') as string,
        price: Math.round(parseFloat(form.get('price') as string || '0') * 100),
        capacity: form.get('capacity') ? parseInt(form.get('capacity') as string, 10) : null,
        imageUrl: (form.get('imageUrl') as string) || null,
      });
      navigate(`/events/${result.data.id}`);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create event');
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Event Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" required rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Start Date & Time</Label>
                <Input id="date" name="date" type="datetime-local" required />
              </div>
              <div>
                <Label htmlFor="endDate">End Date & Time</Label>
                <Input id="endDate" name="endDate" type="datetime-local" required />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue="0" />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity (leave blank for unlimited)</Label>
                <Input id="capacity" name="capacity" type="number" min="1" />
              </div>
            </div>
            <div>
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <Input id="imageUrl" name="imageUrl" type="url" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending ? 'Creating...' : 'Create Event'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
