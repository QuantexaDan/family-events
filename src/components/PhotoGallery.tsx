"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ToastProvider";

interface Photo {
  id: string;
  originalName: string;
  caption: string | null;
  createdAt: string;
  displayName: string;
  isOwn: boolean;
}

interface PhotoGalleryProps {
  eventId: string;
  isAdmin?: boolean;
}

export default function PhotoGallery({ eventId, isAdmin }: PhotoGalleryProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function fetchPhotos() {
    fetch(`/api/events/${eventId}/photos`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPhotos(data);
      });
  }

  useEffect(fetchPhotos, [eventId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (caption.trim()) formData.append("caption", caption.trim());

    const res = await fetch(`/api/events/${eventId}/photos`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Upload failed");
      toast(data.error || "Upload failed", "error");
    } else {
      setCaption("");
      fetchPhotos();
      toast("Photo uploaded");
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDelete(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    setDeleting(true);

    const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setLightboxIndex(null);
      toast("Photo deleted");
    } else {
      toast("Failed to delete photo", "error");
    }
    setDeleting(false);
  }

  const lightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i));
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  return (
    <div>
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIndex(idx)}
              className="group relative aspect-square rounded-xl overflow-hidden bg-bg-secondary border border-border hover:border-coral transition-colors"
            >
              <img
                src={`/api/photos/${photo.id}/thumb`}
                alt={photo.caption || photo.originalName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {photo.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <p className="text-sm text-text-secondary text-center py-4">
          No photos yet. Be the first to share one!
        </p>
      )}

      {/* Upload form */}
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption (optional)"
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition text-sm"
        />
        <label className="px-5 py-2.5 rounded-xl bg-coral text-white text-sm font-600 hover:bg-coral-hover transition cursor-pointer text-center disabled:opacity-50">
          {uploading ? "Uploading..." : "Upload Photo"}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10 w-10 h-10 flex items-center justify-center"
          >
            &times;
          </button>

          {/* Prev */}
          {lightboxIndex! > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl sm:text-4xl z-10 w-11 h-11 flex items-center justify-center bg-black/30 rounded-full"
            >
              &#8249;
            </button>
          )}

          {/* Next */}
          {lightboxIndex! < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl sm:text-4xl z-10 w-11 h-11 flex items-center justify-center bg-black/30 rounded-full"
            >
              &#8250;
            </button>
          )}

          {/* Image + caption */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/api/photos/${lightboxPhoto.id}`}
              alt={lightboxPhoto.caption || lightboxPhoto.originalName}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
            <div className="mt-3 text-center">
              {lightboxPhoto.caption && (
                <p className="text-white text-sm">{lightboxPhoto.caption}</p>
              )}
              <p className="text-white/60 text-xs mt-1">
                Uploaded by {lightboxPhoto.displayName}
              </p>
              {(lightboxPhoto.isOwn || isAdmin) && (
                <button
                  onClick={() => handleDelete(lightboxPhoto.id)}
                  disabled={deleting}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  {deleting ? "Deleting..." : "Delete photo"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
