"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";

type SignaturePadProps = Readonly<{
  onChange: (blob: Blob | null) => void;
}>;

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);
    if (context) {
      context.lineWidth = 2;
      context.lineCap = "round";
      context.strokeStyle = "#111827";
    }
  }, []);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    const position = point(event);
    context?.beginPath();
    context?.moveTo(position.x, position.y);
    drawingRef.current = true;
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    const position = point(event);
    context?.lineTo(position.x, position.y);
    context?.stroke();
    setHasSignature(true);
  }

  function finish() {
    drawingRef.current = false;
    canvasRef.current?.toBlob((blob) => onChange(blob), "image/png");
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <canvas
        aria-label="พื้นที่ลงลายเซ็นลูกค้า"
        className="h-44 w-full touch-none rounded-lg border bg-white"
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={finish}
        ref={canvasRef}
      />
      <Button
        disabled={!hasSignature}
        onClick={clear}
        size="sm"
        type="button"
        variant="outline"
      >
        ล้างลายเซ็น
      </Button>
    </div>
  );
}
