import { useId } from 'react';
import type { CompositionDocument, CompositionElement } from '../../domain/document';

function RenderElement({ element, clipPrefix }: { element: CompositionElement; clipPrefix: string }) {
  switch (element.kind) {
    case 'text':
      return (
        <text
          className={element.font === 'mono' ? 'composition-mono' : 'composition-sans'}
          fontSize={element.fontSize}
          fontWeight={element.weight}
          letterSpacing={element.letterSpacing}
          fill="#22221f"
          data-element={element.id}
          xmlSpace="preserve"
        >
          {element.lines.map((line, index) => (
            <tspan key={index} x={element.box.x} y={element.box.y + element.fontSize + index * element.lineHeight}>{line}</tspan>
          ))}
        </text>
      );
    case 'image': {
      const { x, y, width, height } = element.box;
      const clipId = `${clipPrefix}-${element.id}`;
      const scale = element.fit === 'cover'
        ? Math.max(width / element.asset.width, height / element.asset.height)
        : Math.min(width / element.asset.width, height / element.asset.height);
      const drawWidth = element.asset.width * scale;
      const drawHeight = element.asset.height * scale;
      return (
        <g data-element={element.id}>
          <defs><clipPath id={clipId}><rect x={x} y={y} width={width} height={height} /></clipPath></defs>
          <rect x={x} y={y} width={width} height={height} fill="#e5e3dc" />
          <image href={element.asset.src} x={x + (width - drawWidth) / 2} y={y + (height - drawHeight) / 2} width={drawWidth} height={drawHeight} preserveAspectRatio="none" clipPath={`url(#${clipId})`} />
        </g>
      );
    }
    case 'rule':
      return <line x1={element.x1} y1={element.y1} x2={element.x2} y2={element.y2} stroke="#22221f" strokeWidth={1} />;
  }
}

export function CompositionRenderer({ document, showGrid = false }: { document: CompositionDocument; showGrid?: boolean }) {
  const id = useId().replaceAll(':', '');
  const { margin, columns, columnWidth, gutter } = document.grid;
  return (
    <svg className="generated-composition" viewBox={`0 0 ${document.width} ${document.height}`} role="img" aria-labelledby={`${id}-title ${id}-description`} data-seed={document.seed}>
      <title id={`${id}-title`}>{document.source.title.trim() || 'Untitled study'}</title>
      <desc id={`${id}-description`}>ORDER composition, seed {document.seed}. {document.hierarchy}. {document.source.metadata}</desc>
      <rect width={document.width} height={document.height} fill="#fcfbf7" />
      {document.elements.map((element) => <RenderElement key={element.id} element={element} clipPrefix={id} />)}
      {showGrid && (
        <g className="composition-guides" aria-hidden="true" pointerEvents="none">
          {Array.from({ length: columns }, (_, index) => {
            const x = margin + index * (columnWidth + gutter);
            return <rect key={index} x={x} y={margin} width={columnWidth} height={document.height - 2 * margin} fill="#22221f" fillOpacity=".035" stroke="#77776f" strokeWidth="1" strokeDasharray="4 5" />;
          })}
        </g>
      )}
    </svg>
  );
}
