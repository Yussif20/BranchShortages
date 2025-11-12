import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (text: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  open,
  onClose,
  onDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState<boolean>(false);

  useEffect(() => {
    const start = async () => {
      if (!open || !videoRef.current) return;
      setError(null);
      setInitializing(true);

      try {
        // Stop any previous scan if still running
        controlsRef.current?.stop();

        const reader = new BrowserMultiFormatReader();
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        };

        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result) => {
            if (result) {
              // Found a barcode
              onDetected(result.getText());
              controlsRef.current?.stop();
              onClose();
            }
            // Ignore errors from scanning loop
          }
        );
        controlsRef.current = controls;
      } catch (e) {
        console.error("Scanner error:", e);
        const errName = (e as { name?: string })?.name;
        setError(
          errName === "NotAllowedError"
            ? "تم رفض إذن الكاميرا. يرجى السماح بالوصول للمحاولة مرة أخرى."
            : "تعذر فتح الكاميرا. قد لا يكون هناك كاميرا متاحة أو تم استخدامها من تطبيق آخر."
        );
      } finally {
        setInitializing(false);
      }
    };

    start();

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onClose, onDetected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      dir="rtl"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">مسح الباركود</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            إغلاق
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error ? (
            <div className="text-red-600 text-sm text-center">{error}</div>
          ) : (
            <div className="aspect-video bg-black rounded overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            </div>
          )}

          {initializing && (
            <div className="text-center text-sm text-gray-600">
              جاري تشغيل الكاميرا...
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            وجّه الكاميرا نحو الباركود حتى يتم التعرف عليه تلقائياً
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
