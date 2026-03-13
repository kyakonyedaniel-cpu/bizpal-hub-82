import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

const BarcodeScanner = ({ open, onClose, onDetected }: BarcodeScannerProps) => {
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || manualMode) return;

    let scanner: Html5Qrcode | null = null;
    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('barcode-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            onDetected(decodedText);
            scanner?.stop().catch(() => {});
            onClose();
          },
          () => {} // ignore scan failures
        );
        setError('');
      } catch (err: any) {
        setError('Camera access denied or not available. Use manual entry.');
        setManualMode(true);
      }
    };

    const timer = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timer);
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [open, manualMode, onDetected, onClose]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onDetected(manualCode.trim());
      setManualCode('');
      onClose();
    }
  };

  const handleClose = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setManualMode(false);
    setManualCode('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Camera className="h-5 w-5" /> Scan Barcode
          </DialogTitle>
        </DialogHeader>

        {!manualMode ? (
          <div className="space-y-3">
            <div id="barcode-reader" className="w-full rounded-lg overflow-hidden" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button variant="outline" className="w-full" onClick={() => setManualMode(true)}>
              <Keyboard className="h-4 w-4 mr-2" /> Enter Manually
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Enter barcode number..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                Submit
              </Button>
              <Button variant="outline" onClick={() => { setManualMode(false); setError(''); }}>
                <Camera className="h-4 w-4 mr-2" /> Camera
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
