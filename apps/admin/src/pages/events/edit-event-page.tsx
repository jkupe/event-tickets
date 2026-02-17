import { useParams, useNavigate } from 'react-router';
import { useEvent, useUpdateEvent } from '@event-tickets/shared-api-client';
import { EventStatus } from '@event-tickets/shared-types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, LoadingSpinner } from '@event-tickets/shared-ui';
import { useState, useEffect } from 'react';

export function EditEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useEvent(eventId);
  const updateEvent = useUpdateEvent(eventId!);
  const [error, setError] = useState('');
  const event = data?.data;

  if (isLoading) return <LoadingSpinner className="py-20" />;
  if (!event) return <div className="text-center py-20 text-gray-500">Event not found</div>;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);

    try {
      await updateEvent.mutateAsync({
        name: form.get('name') as string,
        description: form.get('description') as string,
        date: new Date(form.get('date') as string).toISOString(),
        endDate: new Date(form.get('endDate') as string).toISOString(),
        location: form.get('location') as string,
        price: Math.round(parseFloat(form.get('price') as string || '0') * 100),
        capacity: form.get('capacity') ? parseInt(form.get('capacity') as string, 10) : null,
        status: form.get('status') as EventStatus,
      });
      navigate(`/events/${eventId}`);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update event');
    }
  };

  const toLocalDatetime = (iso: string) => {
    const d = new Date(iso);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Event Name</Label>
              <Input id="name" name="name" defaultValue={event.name} required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={event.description} required rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Start Date & Time</Label>
                <Input id="date" name="date" type="datetime-local" defaultValue={toLocalDatetime(event.date)} required />
              </div>
              <div>
                <Label htmlFor="endDate">End Date & Time</Label>
                <Input id="endDate" name="endDate" type="datetime-local" defaultValue={toLocalDatetime(event.endDate)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={event.location} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={(event.price / 100).toFixed(2)} />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" name="capacity" type="number" min="1" defaultValue={event.capacity || ''} />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={event.status} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                {Object.values(EventStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={updateEvent.isPending}>
                {updateEvent.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
