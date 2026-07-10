"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export default function QRModal({ isOpen, onClose, url }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;

    QRCode.toCanvas(
      canvas,
      url,
      {
        width: 260,
        margin: 2,
        color: {
          dark: "#c5a880",  // Sephora Gold
          light: "#0a0a0a", // Dark background
        },
        errorCorrectionLevel: "H", // High error correction level to allow central logo overlay
      },
      (err) => {
        if (err) {
          console.error("Error generating QR code", err);
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw central logo
        const logo = new Image();
        logo.src = "/logo.jpg";
        logo.onload = () => {
          const logoSize = 56;
          const x = (canvas.width - logoSize) / 2;
          const y = (canvas.height - logoSize) / 2;

          // Draw dark protective background
          ctx.fillStyle = "#0a0a0a";
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(x - 4, y - 4, logoSize + 8, logoSize + 8, 8);
          } else {
            ctx.rect(x - 4, y - 4, logoSize + 8, logoSize + 8);
          }
          ctx.fill();

          // Draw gold border around logo container
          ctx.strokeStyle = "#c5a880";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw logo image with rounded corners
          ctx.save();
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(x, y, logoSize, logoSize, 6);
          } else {
            ctx.rect(x, y, logoSize, logoSize);
          }
          ctx.clip();
          ctx.drawImage(logo, x, y, logoSize, logoSize);
          ctx.restore();
        };
      }
    );
  }, [isOpen, url]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-warm-900/95 border border-[#c5a880]/20 rounded-3xl p-6 text-center shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow decorative */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[#c5a880]/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[#c5a880]/5 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-warm-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 mt-2">
          <h3 className="text-2xl font-serif font-bold text-gold-gradient mb-2">Compartir boutique</h3>
          <p className="text-warm-300 text-xs font-light leading-relaxed">
            Escanea este código QR con otro dispositivo para abrir el catálogo digital al instante.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="inline-block p-4 bg-[#0a0a0a] border border-warm-800 rounded-2xl shadow-inner mb-6">
          <canvas 
            ref={canvasRef} 
            className="block max-w-full rounded-lg"
            width={260}
            height={260}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCopyLink}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-gold-400 to-gold-600 hover:from-gold-300 hover:to-gold-500 text-black font-semibold rounded-xl tracking-wider transition-all duration-300 transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                ¡Enlace Copiado!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2H9a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2" />
                </svg>
                Copiar Enlace
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-warm-950/40 hover:bg-warm-950 border border-warm-850 text-warm-300 hover:text-white font-medium rounded-xl text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
