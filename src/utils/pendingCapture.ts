// pendingCapture.ts — signals VisualizerScreen to auto-capture a thumbnail
// after loading a design whose ID we want to thumbnail (e.g. inventory items)
let _id: string | null = null;

export function setPendingCaptureId(id: string) { _id = id; }
export function consumePendingCaptureId(): string | null {
  const id = _id;
  _id = null;
  return id;
}
