import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuthStore } from '@event-tickets/shared-auth';
import { Button } from '@event-tickets/shared-ui';
import { History, LogOut } from 'lucide-react';

export function ScanPage() {
  const navigate = useNavigate();
  const { name, logout } = useAuthStore();
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        () => {} // ignore scan failures
      );
      setIsScanning(true);
    } catch (err) {
      setError('Camera access denied or not available. Please grant camera permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch {
        // ignore cleanup errors
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    // Vibration feedback
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    await stopScanner();
    navigate('/scan/result', { state: { qrToken: decodedText } });
  };

  const handleLogout = async () => {
    await stopScanner();
    await logout();
    navigate('/auth/sign-in');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="flex items-center justify-between p-4 bg-blue-900">
        <div>
          <h1 className="font-bold text-lg">Check-In Scanner</h1>
          <p className="text-xs text-blue-200">{name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/history">
            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-800">
              <History className="h-5 w-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-blue-800">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center p-4 pt-8">
        <div className="w-full max-w-sm">
          <div id="qr-reader" className="rounded-lg overflow-hidden" />
        </div>
        <p className="mt-4 text-center text-gray-400 text-sm">
          Point camera at a ticket QR code
        </p>
        {error && (
          <div className="mt-4 p-4 bg-red-900/50 rounded-lg max-w-sm">
            <p className="text-red-200 text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2 text-white" onClick={startScanner}>
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
