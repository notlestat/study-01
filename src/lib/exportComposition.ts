export type ExportFormat = 'png' | 'svg';

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function portableSvg(svg: SVGSVGElement): Promise<Blob> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll('[data-preview-only]').forEach((element) => element.remove());
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const size = svg.viewBox.baseVal;
  copy.setAttribute('width', String(size.width));
  copy.setAttribute('height', String(size.height));
  for (const image of copy.querySelectorAll('image')) {
    const source = image.getAttribute('href');
    if (!source) continue;
    const response = await fetch(source);
    if (!response.ok) throw new Error('The image could not be included in the export.');
    image.setAttribute('href', await blobAsDataUrl(await response.blob()));
  }
  return new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml;charset=utf-8' });
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function exportComposition(svg: SVGSVGElement, format: ExportFormat, filename: string): Promise<void> {
  const vector = await portableSvg(svg);
  if (format === 'svg') {
    download(vector, `${filename}.svg`);
    return;
  }
  const sourceUrl = URL.createObjectURL(vector);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = svg.viewBox.baseVal.width * 2;
    canvas.height = svg.viewBox.baseVal.height * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot create the PNG.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The PNG could not be created.')), 'image/png'));
    download(png, `${filename}.png`);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
