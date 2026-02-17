import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useValidateTicket } from '@event-tickets/shared-api-client';
import type { ValidateTicketResponse } from '@event-tickets/shared-types';
import { Button, LoadingSpinner } from '@event-tickets/shared-ui';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function ScanResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const qrToken = (location.state as { qrToken?: string })?.qrToken;
  const validateTicket = useValidateTicket();
  const [result, setResult] = useState<ValidateTicketResponse | null>(null);

  useEffect(() => {
    if (!qrToken) {
      navigate('/scan');
      return;
    }

    // Extract ticketId from JWT payload (base64 decode middle part)
    let ticketId = '';
    try {
      const payload = JSON.parse(atob(qrToken.split('.')[1]));
      ticketId = payload.sub;
    } catch {
      setResult({ valid: false, reason: 'INVALID' });
      return;
    }

    validateTicket.mutate(
      { ticketId, data: { qrToken } },
      {
        onSuccess: (data) => setResult(data),
        onError: () => setResult({ valid: false, reason: 'INVALID' }),
      }
    );
  }, [qrToken]);

  if (!result && validateTicket.isPending) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isValid = result?.valid;
  const isAlreadyCheckedIn = result?.reason === 'ALREADY_CHECKED_IN';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-8 ${
      isValid ? 'bg-green-600' : isAlreadyCheckedIn ? 'bg-yellow-500' : 'bg-red-600'
    }`}>
      <div className="text-white text-center space-y-4">
        {isValid ? (
          <>
            <CheckCircle className="h-24 w-24 mx-auto" />
            <h1 className="text-3xl font-bold">Welcome!</h1>
            {result?.userName && <p className="text-xl">{result.userName}</p>}
            {result?.eventName && <p className="text-lg opacity-90">{result.eventName}</p>}
          </>
        ) : isAlreadyCheckedIn ? (
          <>
            <AlertCircle className="h-24 w-24 mx-auto" />
            <h1 className="text-3xl font-bold">Already Checked In</h1>
            {result?.userName && <p className="text-xl">{result.userName}</p>}
          </>
        ) : (
          <>
            <XCircle className="h-24 w-24 mx-auto" />
            <h1 className="text-3xl font-bold">Invalid Ticket</h1>
            <p className="text-lg opacity-90">
              {result?.reason === 'EXPIRED' ? 'This ticket has expired' :
               result?.reason === 'NOT_FOUND' ? 'Ticket not found' :
               'This ticket is not valid'}
            </p>
          </>
        )}

        <Button
          variant="outline"
          size="lg"
          className="mt-8 text-white border-white hover:bg-white/20"
          onClick={() => navigate('/scan')}
        >
          Scan Next Ticket
        </Button>
      </div>
    </div>
  );
}
