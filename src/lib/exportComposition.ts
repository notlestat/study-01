export type ExportFormat = 'png' | 'svg';
export interface ExportOptions { scale: 1 | 2 | 3; transparent: boolean; }
export const DEFAULT_EXPORT: ExportOptions = { scale: 2, transparent: false };
export function exportDimensions(width: number, height: number, scale: number): [number, number] {
  if (![1, 2, 3].includes(scale) || width <= 0 || height <= 0) throw new Error('Choose valid export dimensions.');
  return [Math.round(width * scale), Math.round(height * scale)];
}

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function portableSvg(svg: SVGSVGElement, imageCache = new Map<string, string>(), transparent = false): Promise<Blob> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll('[data-preview-only]').forEach((element) => element.remove());
  if (transparent) copy.querySelectorAll('[data-paper-background]').forEach((element) => element.remove());
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const size = svg.viewBox.baseVal;
  copy.setAttribute('width', String(size.width));
  copy.setAttribute('height', String(size.height));
  for (const image of copy.querySelectorAll('image')) {
    const source = image.getAttribute('href');
    if (!source) continue;
    let dataUrl = imageCache.get(source);
    if (!dataUrl) {
      const response = await fetch(source);
      if (!response.ok) throw new Error('The image could not be included in the export.');
      dataUrl = await blobAsDataUrl(await response.blob());
      imageCache.set(source, dataUrl);
    }
    image.setAttribute('href', dataUrl);
  }
  return new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml;charset=utf-8' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function exportComposition(svg: SVGSVGElement, format: ExportFormat, filename: string, options: ExportOptions = DEFAULT_EXPORT): Promise<void> {
  const vector = await portableSvg(svg, new Map(), options.transparent);
  if (format === 'svg') {
    downloadBlob(vector, `${filename}.svg`);
    return;
  }
  const dimensions = exportDimensions(svg.viewBox.baseVal.width, svg.viewBox.baseVal.height, options.scale);
  downloadBlob(await rasterizeSvg(vector, dimensions), `${filename}.png`);
}

export async function rasterizeSvg(vector: Blob, dimensions: [number, number]): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(vector);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = dimensions;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot create the PNG.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The PNG could not be created.')), 'image/png'));
    return png;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
