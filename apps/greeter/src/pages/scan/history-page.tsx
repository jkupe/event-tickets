import { Link } from 'react-router';
import { Button, Card, CardContent, EmptyState } from '@event-tickets/shared-ui';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface CheckInRecord {
  ticketId: string;
  userName: string;
  eventName: string;
  time: string;
}

// In-memory history for this session (resets on page refresh)
const checkInHistory: CheckInRecord[] = [];

export function addToHistory(record: CheckInRecord) {
  checkInHistory.unshift(record);
  if (checkInHistory.length > 50) checkInHistory.pop();
}

export function HistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white p-4 flex items-center gap-4">
        <Link to="/scan">
          <Button variant="ghost" size="icon" className="text-white hover:bg-blue-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="font-bold text-lg">Check-In History</h1>
      </header>

      <div className="p-4">
        {checkInHistory.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="h-12 w-12" />}
            title="No check-ins yet"
            description="Scanned tickets will appear here."
          />
        ) : (
          <div className="space-y-2">
            {checkInHistory.map((record, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="font-medium text-gray-900">{record.userName}</p>
                  <p className="text-sm text-gray-500">{record.eventName}</p>
                  <p className="text-xs text-gray-400">{record.time}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
