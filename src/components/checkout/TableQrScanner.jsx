import React, { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

/**
 * Reads a table's QR code. It uses the browser's own QR reader where there
 * is one (Chrome, Edge, Android) and jsQR everywhere else (Safari and Chrome
 * on iPhone), loaded only when the scanner opens. The live camera needs a
 * secure page (https or localhost); otherwise the customer takes a photo.
 */
const liveCameraSupported = () => Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);

async function makeReader() {
  if ('BarcodeDetector' in window) {
    try {
      const formats = (await window.BarcodeDetector.getSupportedFormats?.()) || ['qr_code'];
      if (formats.includes('qr_code')) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        return async (source) => (await detector.detect(source))[0]?.rawValue || '';
      }
    } catch {
      // Fall through to jsQR.
    }
  }
  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (source) => {
    const width = source.videoWidth || source.width;
    const height = source.videoHeight || source.height;
    if (!width || !height) return '';
    // Large photos are scaled down: QR codes read fine at this size, and faster.
    const scale = Math.min(1, 1000 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(data, canvas.width, canvas.height)?.data || '';
  };
}

export default function TableQrScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const live = liveCameraSupported();

  useEffect(() => {
    if (!live) return undefined;
    let stream = null;
    let timer = null;
    let stopped = false;
    (async () => {
      try {
        const read = await makeReader();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const tick = async () => {
          if (stopped) return;
          try {
            const value = await read(video);
            if (value) {
              stopped = true;
              onResult(value);
              return;
            }
          } catch {
            // A frame that could not be read: try the next one.
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (err) {
        if (!stopped) setError(err?.name === 'NotAllowedError' ? 'Allow the camera to scan, or take a photo of the code.' : 'The camera could not start. Take a photo of the code instead.');
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [live, onResult]);

  const fromPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const read = await makeReader();
      const value = await read(await createImageBitmap(file));
      if (value) onResult(value);
      else setError('No QR code found in that photo. Try again, closer to the code.');
    } catch {
      setError('That photo could not be read. Try again.');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-label="Scan the table's QR code">
        <div className="w-full max-w-sm rounded-3xl bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-bold text-sm text-gray-900">Point at the QR code on your table</p>
            <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-stone-100"><X className="w-5 h-5" /></button>
          </div>
          {live && (
            <div className="relative bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-10 border-2 border-white/80 rounded-2xl pointer-events-none" />
            </div>
          )}
          <div className="p-4 space-y-2">
            {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
            <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-[#2b1206] cursor-pointer hover:bg-stone-50">
              <Camera className="w-4 h-4" /> {live ? 'Take a photo instead' : 'Take a photo of the code'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={fromPhoto} />
            </label>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
