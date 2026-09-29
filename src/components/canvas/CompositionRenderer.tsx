import { useId } from 'react';
import type { Ref } from 'react';
import type { CompositionDocument, CompositionElement } from '../../domain/document';

function RenderElement({ element, clipPrefix }: { element: CompositionElement; clipPrefix: string }) {
  switch (element.kind) {
    case 'text':
      return (
        <text
          className={element.font === 'mono' ? 'composition-mono' : 'composition-sans'}
          fontFamily={element.font === 'mono' ? "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" : "'Helvetica Neue', Helvetica, Arial, sans-serif"}
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
          <image href={element.asset.src} x={x + (width - drawWidth) * (element.fit === 'cover' ? element.focalX : .5)} y={y + (height - drawHeight) * (element.fit === 'cover' ? element.focalY : .5)} width={drawWidth} height={drawHeight} preserveAspectRatio="none" clipPath={`url(#${clipId})`} />
        </g>
      );
    }
    case 'texture': {
      const patternId = `${clipPrefix}-${element.id}-pattern`;
      return (
        <g data-element={element.id}>
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width={element.pitch} height={element.pitch}>
              {element.pattern === 'dots'
                ? <circle cx="1" cy="1" r="1" fill="#22221f" />
                : <path d={`M 1 0 V ${element.pitch}`} stroke="#22221f" strokeWidth="1" />}
            </pattern>
          </defs>
          <rect {...element.box} fill={`url(#${patternId})`} opacity={element.opacity} />
        </g>
      );
    }
    case 'rule':
      return <line x1={element.x1} y1={element.y1} x2={element.x2} y2={element.y2} stroke="#22221f" strokeWidth={1} />;
  }
}

export function CompositionRenderer({ document, showGrid = false, svgRef }: { document: CompositionDocument; showGrid?: boolean; svgRef?: Ref<SVGSVGElement> }) {
  const id = useId().replaceAll(':', '');
  const { margin, columns, columnWidth, gutter } = document.grid;
  return (
    <svg ref={svgRef} className="generated-composition" viewBox={`0 0 ${document.width} ${document.height}`} role="img" aria-labelledby={`${id}-title ${id}-description`} data-seed={document.seed}>
      <title id={`${id}-title`}>{document.source.title.trim() || 'Untitled study'}</title>
      <desc id={`${id}-description`}>{document.system} composition, seed {document.seed}. {document.hierarchy}. {document.source.metadata}</desc>
      <rect width={document.width} height={document.height} fill="#fcfbf7" />
      {document.elements.map((element) => <RenderElement key={element.id} element={element} clipPrefix={id} />)}
      {showGrid && (
        <g className="composition-guides" data-preview-only="true" aria-hidden="true" pointerEvents="none">
          {Array.from({ length: columns }, (_, index) => {
            const x = margin + index * (columnWidth + gutter);
            return <rect key={index} x={x} y={margin} width={columnWidth} height={document.height - 2 * margin} fill="#22221f" fillOpacity=".035" stroke="#77776f" strokeWidth="1" strokeDasharray="4 5" />;
          })}
        </g>
      )}
    </svg>
  );
}
