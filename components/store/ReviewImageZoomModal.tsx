'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomImage {
  url: string;
  alt: string;
}

interface ReviewImageZoomModalProps {
  isOpen: boolean;
  images: ZoomImage[];
  initialIndex: number;
  onClose: () => void;
}

export default function ReviewImageZoomModal({
  isOpen,
  images,
  initialIndex,
  onClose,
}: ReviewImageZoomModalProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const wasDragging = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const lastTap = useRef<number | null>(null);
  const initialPinchDist = useRef<number | null>(null);
  const initialPinchScale = useRef<number>(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    resetZoom();
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, zoomScale]);

  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setZoomPos({ x: 0, y: 0 });
    setIsDragging(false);
    wasDragging.current = false;
  }, []);

  const goPrev = useCallback(() => {
    if (zoomScale > 1) return;
    setActiveIndex(i => (i - 1 + images.length) % images.length);
  }, [images.length, zoomScale]);

  const goNext = useCallback(() => {
    if (zoomScale > 1) return;
    setActiveIndex(i => (i + 1) % images.length);
  }, [images.length, zoomScale]);

  const handleZoomIn = () => setZoomScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setZoomScale(s => {
    const next = Math.max(s - 0.5, 1);
    if (next === 1) setZoomPos({ x: 0, y: 0 });
    return next;
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    wasDragging.current = false;
    dragStart.current = { x: e.clientX - zoomPos.x, y: e.clientY - zoomPos.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomScale <= 1) return;
    wasDragging.current = true;
    setZoomPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.targetTouches.length === 2) {
      const dx = e.targetTouches[0].clientX - e.targetTouches[1].clientX;
      const dy = e.targetTouches[0].clientY - e.targetTouches[1].clientY;
      initialPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      initialPinchScale.current = zoomScale;
      setIsDragging(false);
    } else if (e.targetTouches.length === 1 && zoomScale > 1) {
      setIsDragging(true);
      wasDragging.current = false;
      dragStart.current = {
        x: e.targetTouches[0].clientX - zoomPos.x,
        y: e.targetTouches[0].clientY - zoomPos.y,
      };
      touchStartPos.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches.length === 2 && initialPinchDist.current !== null) {
      const dx = e.targetTouches[0].clientX - e.targetTouches[1].clientX;
      const dy = e.targetTouches[0].clientY - e.targetTouches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / initialPinchDist.current;
      const newScale = Math.max(1, Math.min(4, initialPinchScale.current * factor));
      setZoomScale(newScale);
      if (newScale === 1) setZoomPos({ x: 0, y: 0 });
    } else if (e.targetTouches.length === 1 && zoomScale > 1 && isDragging) {
      const dx = e.targetTouches[0].clientX - dragStart.current.x;
      const dy = e.targetTouches[0].clientY - dragStart.current.y;
      if (Math.abs(e.targetTouches[0].clientX - touchStartPos.current.x) > 5 ||
          Math.abs(e.targetTouches[0].clientY - touchStartPos.current.y) > 5) {
        wasDragging.current = true;
      }
      setZoomPos({ x: dx, y: dy });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.targetTouches.length < 2) initialPinchDist.current = null;
    if (zoomScale > 1) setIsDragging(false);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < 300) {
      zoomScale > 1 ? resetZoom() : setZoomScale(2.5);
      lastTap.current = null;
    } else {
      lastTap.current = now;
    }
  };

  const handleBackdropClick = () => {
    onClose();
    resetZoom();
  };

  const currentImage = images[activeIndex];
  const showNav = images.length > 1 && zoomScale === 1;

  if (!mounted || !isOpen || !currentImage) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/95 animate-fade-in touch-none select-none"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleBackdropClick(); }}
        className="absolute top-4 right-4 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shadow-md"
        aria-label="Close lightbox"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Zoom controls */}
      {zoomScale > 1 && (
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Prev arrow */}
      {showNav && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Main image */}
      <div
        className="relative w-full max-w-4xl h-[65dvh] md:h-[80dvh] flex items-center justify-center overflow-hidden px-4 md:px-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-full h-full relative ${isDragging ? 'cursor-grabbing' : zoomScale > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
          style={{
            transform: `translate(${zoomPos.x}px, ${zoomPos.y}px) scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleImageClick}
        >
          <Image
            src={currentImage.url}
            alt={currentImage.alt}
            fill
            sizes="90vw"
            className="object-contain pointer-events-none"
          />
        </div>
      </div>

      {/* Next arrow */}
      {showNav && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Dot indicators */}
      {showNav && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10 items-center">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === activeIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
              aria-label={`Image ${i + 1} of ${images.length}`}
            />
          ))}
          <span className="ml-3 text-xs text-white/40 font-medium hidden sm:inline">
            {activeIndex + 1}/{images.length}
          </span>
        </div>
      )}
    </div>,
    document.body
  );
}
