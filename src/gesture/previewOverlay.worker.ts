// Presentation-only drawing worker. It never touches camera capture or gesture
// recognition, and exists only while the operator has the Tab preview open.
export {}; // Worker module scope, independent from DOM globals.
type Point = { x: number; y: number };
type PreviewHand = { label: string; landmarks: Point[] };
type Init = { type: 'init'; canvas: OffscreenCanvas };
type Resize = { type: 'resize'; width: number; height: number; pixelRatio: number };
type Frame = { type: 'frame'; hands: PreviewHand[]; videoWidth: number; videoHeight: number };
type Message = Init | Resize | Frame;

const LINKS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
  [13,17],[0,17],[17,18],[18,19],[19,20],
];
let canvas: OffscreenCanvas | undefined;
let context: OffscreenCanvasRenderingContext2D | null = null;
let cssWidth = 0;
let cssHeight = 0;
let pixelRatio = 1;

const worker = self as unknown as DedicatedWorkerGlobalScope;
worker.onmessage = (event: MessageEvent<Message>) => {
  const data = event.data;
  if (data.type === 'init') {
    canvas = data.canvas;
    context = canvas.getContext('2d', { alpha: true });
    return;
  }
  if (data.type === 'resize') {
    if (!canvas || !context) return;
    cssWidth = data.width;
    cssHeight = data.height;
    pixelRatio = data.pixelRatio;
    canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
    return;
  }
  if (data.type !== 'frame') return;
  try {
    if (!context || !cssWidth || !cssHeight) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);
    const { videoWidth, videoHeight, hands } = data;
    if (!videoWidth || !videoHeight) return;
    const scale = Math.max(cssWidth / videoWidth, cssHeight / videoHeight);
    const point = (p: Point) => ({
      x: (1 - p.x) * videoWidth * scale + (cssWidth - videoWidth * scale) / 2,
      y: p.y * videoHeight * scale + (cssHeight - videoHeight * scale) / 2,
    });
    hands.forEach((hand, i) => {
      const points = hand.landmarks.map(point);
      const color = i === 0 ? '#67e8f9' : '#fbbf24';
      context!.lineCap = 'round';
      context!.lineJoin = 'round';
      for (const [stroke, thickness] of [['#101820cc', 5], [color, 2]] as const) {
        context!.strokeStyle = stroke;
        context!.lineWidth = thickness;
        context!.beginPath();
        for (const [a, b] of LINKS) {
          if (!points[a] || !points[b]) continue;
          context!.moveTo(points[a].x, points[a].y);
          context!.lineTo(points[b].x, points[b].y);
        }
        context!.stroke();
      }
      for (const [joint, p] of points.entries()) {
        context!.beginPath();
        context!.arc(p.x, p.y, [4,8,12,16,20].includes(joint) ? 3.5 : 2.5, 0, Math.PI * 2);
        context!.fillStyle = color;
        context!.fill();
        context!.strokeStyle = '#101820';
        context!.lineWidth = 1;
        context!.stroke();
      }
    });
  } finally {
    // Acknowledge one frame so the renderer never queues a backlog.
    worker.postMessage({ type: 'rendered' });
  }
};
