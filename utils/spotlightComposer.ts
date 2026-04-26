export const buildSpotlightDraftStorageKey = (scope: 'draft' | 'composer', uid?: string | null) =>
  `urbanprime:spotlight:${scope}:${uid || 'guest'}`;

export const extractSpotlightHashtags = (caption: string) =>
  caption.match(/#([a-z0-9_]+)/gi)?.map((tag) => tag.replace('#', '')) || [];

export const captureSpotlightVideoThumbnail = async (file: File) => {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    await video.play().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return null;
    return new File([blob], `thumb-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
};

