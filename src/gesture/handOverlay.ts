export interface PreviewHand {
  label?: string;
  landmarks: { x: number; y: number }[];
}

const connections = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
] as const;

// Match the preview video's object-fit: cover and scaleX(-1), including cropping.
export function previewPoint(point: { x: number; y: number }, width: number, height: number, videoWidth: number, videoHeight: number) {
  const scale = Math.max(width / videoWidth, height / videoHeight);
  return {
    x: (1 - point.x) * videoWidth * scale + (width - videoWidth * scale) / 2,
    y: point.y * videoHeight * scale + (height - videoHeight * scale) / 2,
  };
}

export function drawHandOverlay(canvas: HTMLCanvasElement, video: HTMLVideoElement, hands: PreviewHand[]) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (!video.videoWidth || !video.videoHeight) return;
  for (const [index, hand] of hands.entries()) {
    const points = hand.landmarks.map((point) => previewPoint(point, width, height, video.videoWidth, video.videoHeight));
    const colour = hand.label === 'Left' ? '#67e8f9' : hand.label === 'Right' ? '#fbbf24' : index === 0 ? '#67e8f9' : '#fbbf24';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Dark outline keeps the skeleton readable against both bright and dark video.
    for (const [stroke, lineWidth] of [['#101820cc', 5], [colour, 2]] as const) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      for (const [from, to] of connections) {
        if (!points[from] || !points[to]) continue;
        ctx.moveTo(points[from].x, points[from].y);
        ctx.lineTo(points[to].x, points[to].y);
      }
      ctx.stroke();
    }
    for (const [joint, point] of points.entries()) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, [4, 8, 12, 16, 20].includes(joint) ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.strokeStyle = '#101820';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}
