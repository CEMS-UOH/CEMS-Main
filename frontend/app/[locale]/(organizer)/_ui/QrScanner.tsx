'use client';

// Reads ticket QR codes with the device camera (FR-14 check-in).
//
// Uses the browser's own BarcodeDetector, so no QR library is added to the project. It is
// available in Chrome and Edge (Android, Windows, macOS) and Samsung Internet; Safari and
// Firefox do not have it yet. Where it is missing this says so, and the page around it still
// offers typing the code and checking people in from the attendee list.
//
// The camera starts only when the organizer presses the button (the permission prompt then
// makes sense), and it is switched off when the page is left.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import { AlertIcon, ScanIcon } from '@/components/Icons';

// Not in TypeScript's DOM types yet.
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };
type BarcodeDetectorClass = {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

type Status = 'checking' | 'idle' | 'starting' | 'scanning' | 'denied' | 'failed' | 'unsupported';

const SCAN_EVERY_MS = 250;

function getDetectorClass(): BarcodeDetectorClass | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector ?? null;
}

type Props = {
  /** Called with the text of each QR code seen. The page decides what to ignore. */
  onCode: (code: string) => void;
  /** While true no codes are reported (a check-in is being sent or its result is showing). */
  paused: boolean;
};

export default function QrScanner({ onCode, paused }: Props) {
  const t = useTranslations('Organizer.checkIn.scanner');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  const [status, setStatus] = useState<Status>('checking');

  // Is QR scanning possible in this browser at all?
  useEffect(() => {
    const Detector = getDetectorClass();
    const hasCamera = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
    if (!Detector || !hasCamera) {
      setStatus('unsupported');
      return;
    }
    const check = Detector.getSupportedFormats ? Detector.getSupportedFormats() : Promise.resolve(['qr_code']);
    check
      .then((formats) => setStatus(formats.includes('qr_code') ? 'idle' : 'unsupported'))
      .catch(() => setStatus('unsupported'));
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  async function start() {
    const Detector = getDetectorClass();
    if (!Detector) return;
    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      detectorRef.current = new Detector({ formats: ['qr_code'] });
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setStatus('scanning');
    } catch (error) {
      stop();
      const name = error instanceof DOMException ? error.name : '';
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed');
    }
  }

  // The scan loop: one frame every SCAN_EVERY_MS while the camera runs.
  useEffect(() => {
    if (status !== 'scanning') return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (active && !pausedRef.current && video && detector && video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue?.trim();
          if (active && value && !pausedRef.current) onCodeRef.current(value);
        } catch {
          // A frame that cannot be read is simply skipped.
        }
      }
      if (active) timer = setTimeout(tick, SCAN_EVERY_MS);
    };
    tick();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [status]);

  const live = status === 'scanning' || status === 'starting';

  return (
    <div className="flex flex-col gap-4">
      {/* The video is always in the page (so it can be started), shown only while live. */}
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-lg bg-text ${live ? '' : 'hidden'}`}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label={t('videoLabel')}
          className="size-full object-cover"
        />
        {/* Where to hold the ticket. */}
        <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-lg border-4 border-white/85 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]" />
        {paused ? (
          <div aria-hidden className="absolute inset-0 bg-text/30" />
        ) : null}
      </div>

      {status === 'checking' ? null : status === 'unsupported' ? (
        <Notice tone="muted" title={t('unsupportedTitle')} body={t('unsupportedBody')} />
      ) : status === 'denied' ? (
        <Notice tone="danger" title={t('deniedTitle')} body={t('deniedBody')} />
      ) : status === 'failed' ? (
        <Notice tone="danger" title={t('failedTitle')} body={t('failedBody')} />
      ) : null}

      {status === 'idle' || status === 'denied' || status === 'failed' || status === 'starting' ? (
        <Button
          type="button"
          size="lg"
          icon={<ScanIcon className="size-5" />}
          loading={status === 'starting'}
          onClick={start}
          className="w-full"
        >
          {status === 'starting' ? t('starting') : status === 'idle' ? t('start') : t('retry')}
        </Button>
      ) : null}

      {status === 'scanning' ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted" aria-live="polite">
            {paused ? t('checking') : t('hint')}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              stop();
              setStatus('idle');
            }}
          >
            {t('stop')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Notice({ tone, title, body }: { tone: 'muted' | 'danger'; title: string; body: string }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={`flex gap-3 rounded-lg p-4 text-start ${
        tone === 'danger' ? 'bg-danger-light text-danger' : 'bg-background text-text'
      }`}
    >
      <AlertIcon className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-sm text-text-muted">{body}</p>
      </div>
    </div>
  );
}
