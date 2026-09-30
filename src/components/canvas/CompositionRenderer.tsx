import { useId } from 'react';
import type { Ref } from 'react';
import type { CompositionDocument, CompositionElement, TextElement } from '../../domain/document';
import { resolveColour } from '../../engine/colour';
import type { ResolvedColour } from '../../engine/colour';

function TextShape({ element, fill = element.tone === 'paper' ? '#fcfbf7' : '#22221f' }: { element: TextElement; fill?: string }) {
  const erasureId = useId().replaceAll(':', '');
  const frame = element.frame ?? element.box;
  if (element.glyphs?.length) {
    const glyphs = <g data-element={element.id}>{element.glyphs.map((glyph, index) => <text key={index} className={element.font === 'mono' ? 'composition-mono' : 'composition-sans'} fontFamily={element.font === 'mono' ? "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" : "'Helvetica Neue', Helvetica, Arial, sans-serif"} fontSize={element.fontSize} fontWeight={element.weight} fill={fill} opacity={(element.opacity ?? 1) * (glyph.opacity ?? 1)} x={glyph.x} y={glyph.y} transform={glyph.rotate || glyph.scaleX || glyph.scaleY ? `translate(${glyph.x} ${glyph.y}) rotate(${glyph.rotate ?? 0}) scale(${glyph.scaleX ?? 1} ${glyph.scaleY ?? 1}) translate(${-glyph.x} ${-glyph.y})` : undefined} xmlSpace="preserve">{glyph.char}</text>)}</g>;
    if (!element.erasures?.length) return glyphs;
    return <g data-element={element.id}><defs><mask id={erasureId} maskUnits="userSpaceOnUse" x="0" y="0" width="10000" height="10000"><rect width="10000" height="10000" fill="#fff" />{element.erasures.map((box, index) => <rect key={index} {...box} fill="#000" />)}</mask></defs><g mask={`url(#${erasureId})`}>{glyphs}</g></g>;
  }
  return (
    <text className={element.font === 'mono' ? 'composition-mono' : 'composition-sans'}
      fontFamily={element.font === 'mono' ? "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" : "'Helvetica Neue', Helvetica, Arial, sans-serif"}
      fontSize={element.fontSize} fontWeight={element.weight} letterSpacing={element.letterSpacing}
      fill={fill} opacity={element.opacity ?? 1} data-element={element.id} xmlSpace="preserve">
      {element.lines.map((line, index) => <tspan key={index} x={frame.x} y={frame.y + element.fontSize + index * element.lineHeight}>{line}</tspan>)}
    </text>
  );
}

function RenderElement({ element, clipPrefix, colour, imageFilter, accentFilter }: { element: CompositionElement; clipPrefix: string; colour: ResolvedColour; imageFilter?: string; accentFilter?: string }) {
  switch (element.kind) {
    case 'text':
      return element.frame ? (
        <g data-element={element.id}>
          <defs><clipPath id={`${clipPrefix}-${element.id}-slice`}><rect {...element.box} /></clipPath></defs>
          <g clipPath={`url(#${clipPrefix}-${element.id}-slice)`}><TextShape element={element} fill={element.tone === 'paper' ? colour.paper : colour.ink} /></g>
        </g>
      ) : <TextShape element={element} fill={element.tone === 'paper' ? colour.paper : colour.ink} />;
    case 'image': {
      const { x, y, width, height } = element.box;
      const frame = element.frame ?? element.box;
      const clipId = `${clipPrefix}-${element.id}`;
      const scale = element.fit === 'cover'
        ? Math.max(frame.width / element.asset.width, frame.height / element.asset.height)
        : Math.min(frame.width / element.asset.width, frame.height / element.asset.height);
      const drawWidth = element.asset.width * scale;
      const drawHeight = element.asset.height * scale;
      return (
        <g data-element={element.id} opacity={element.opacity ?? 1}>
          <defs><clipPath id={clipId}><rect x={x} y={y} width={width} height={height} /></clipPath></defs>
          <rect x={x} y={y} width={width} height={height} fill={colour.paper} />
          <image href={element.asset.src} x={frame.x + (frame.width - drawWidth) * (element.fit === 'cover' ? element.focalX : .5)} y={frame.y + (frame.height - drawHeight) * (element.fit === 'cover' ? element.focalY : .5)} width={drawWidth} height={drawHeight} preserveAspectRatio="none" clipPath={`url(#${clipId})`} filter={imageFilter ? `url(#${imageFilter})` : undefined} />
          {accentFilter && colour.registration > 0 && <image href={element.asset.src} x={frame.x + (frame.width - drawWidth) * (element.fit === 'cover' ? element.focalX : .5) + colour.offset[0]} y={frame.y + (frame.height - drawHeight) * (element.fit === 'cover' ? element.focalY : .5) + colour.offset[1]} width={drawWidth} height={drawHeight} preserveAspectRatio="none" clipPath={`url(#${clipId})`} filter={`url(#${accentFilter})`} opacity={colour.registration * .85} />}
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
                ? <circle cx="1" cy="1" r="1" fill={colour.ink} />
                : <path d={`M 1 0 V ${element.pitch}`} stroke={colour.ink} strokeWidth="1" />}
            </pattern>
          </defs>
          <rect {...element.box} fill={`url(#${patternId})`} opacity={element.opacity} />
        </g>
      );
    }
    case 'rule':
      return <line data-element={element.id} x1={element.x1} y1={element.y1} x2={element.x2} y2={element.y2} stroke={colour.ink} strokeWidth={1} />;
    case 'block':
      return <rect {...element.box} fill={element.fill === 'ink' ? colour.ink : colour.paper} opacity={element.opacity} data-element={element.id} />;
  }
}

export function CompositionRenderer({ document, showGrid = false, showZones = false, showSafe = false, selectedElement = '', svgRef }: { document: CompositionDocument; showGrid?: boolean; showZones?: boolean; showSafe?: boolean; selectedElement?: string; svgRef?: Ref<SVGSVGElement> }) {
  const id = useId().replaceAll(':', '');
  const colour = resolveColour(document);
  const coloured = !!document.colour && document.colour.intensity > 0;
  const imageFilter = coloured ? `${id}-colour` : undefined;
  const accentFilter = coloured && colour.registration > 0 ? `${id}-misregister` : undefined;
  const channel = (hex: string, start: number) => (parseInt(hex.slice(start, start + 2), 16) / 255).toFixed(4);
  const { margin, columns, columnWidth, gutter } = document.grid;
  const title = document.elements.find((element): element is TextElement => element.kind === 'text' && element.id === 'title');
  const image = document.elements.find((element) => element.kind === 'image' && element.id === 'source-image');
  const special = !!title && !!image && (document.imageType?.kind === 'TYPE_MASK' || document.imageType?.kind === 'TYPE_KNOCKOUT');
  const selected = document.elements.find((element) => element.id === selectedElement);
  const relationId = `${id}-image-type`;
  return (
    <svg ref={svgRef} className="generated-composition" viewBox={`0 0 ${document.width} ${document.height}`} role="img" aria-labelledby={`${id}-title ${id}-description`} data-seed={document.seed}>
      <title id={`${id}-title`}>{document.source.title.trim() || 'Untitled study'}</title>
      <desc id={`${id}-description`}>{document.system} composition, seed {document.seed}. {document.hierarchy}. {document.source.metadata}</desc>
      {coloured && <defs>
        <filter id={imageFilter} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values={document.colour?.mode === 'MONOCHROME' ? String(1 - document.colour.intensity) : '0'} />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={colour.stops.map((stop) => channel(stop, 1)).join(' ')} />
            <feFuncG type="table" tableValues={colour.stops.map((stop) => channel(stop, 3)).join(' ')} />
            <feFuncB type="table" tableValues={colour.stops.map((stop) => channel(stop, 5)).join(' ')} />
          </feComponentTransfer>
        </filter>
        {accentFilter && <filter id={accentFilter} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={`0 0 0 0 ${channel(colour.accent, 1)} 0 0 0 0 ${channel(colour.accent, 3)} 0 0 0 0 ${channel(colour.accent, 5)} -.2126 -.7152 -.0722 1 0`} />
        </filter>}
      </defs>}
      <metadata>{JSON.stringify({ application: "STUDY/01", documentVersion: document.version, engineRevision: document.engineRevision, system: document.system, seed: document.seed, dimensions: [document.width, document.height], title: document.source.title, metadata: document.source.metadata, family: document.family, familyAsset: document.familyAsset, operations: document.operations, imageType: document.imageType, typography: document.typography, processing: document.processing?.passes, colour: document.colour, drift: document.drift, lineage: document.lineage, spaceZones: document.spaceZones })}</metadata>
      <rect data-paper-background="true" width={document.width} height={document.height} fill={colour.paper} />
      {special && title && (
        <defs>
          {document.imageType?.kind === 'TYPE_MASK'
            ? <clipPath id={relationId}><TextShape element={title} fill="#fff" /></clipPath>
            : <mask id={relationId} maskUnits="userSpaceOnUse" x="0" y="0" width={document.width} height={document.height}><rect width={document.width} height={document.height} fill="#fff" /><TextShape element={title} fill="#000" /></mask>}
        </defs>
      )}
      {document.elements.map((element) => {
        if (special && element.id === 'title') return null;
        if (special && element.id === 'source-image' && element.kind === 'image' && title) {
          if (document.imageType?.kind === 'TYPE_MASK') {
            const maskedImage = { ...element, box: { ...title.box }, frame: undefined, fit: 'cover' as const };
            return <g key={element.id} clipPath={`url(#${relationId})`}><RenderElement element={maskedImage} clipPrefix={id} colour={colour} imageFilter={imageFilter} accentFilter={accentFilter} /></g>;
          }
          return <g key={element.id} mask={`url(#${relationId})`}><RenderElement element={element} clipPrefix={id} colour={colour} imageFilter={imageFilter} accentFilter={accentFilter} /></g>;
        }
        return <RenderElement key={element.id} element={element} clipPrefix={id} colour={colour} imageFilter={imageFilter} accentFilter={accentFilter} />;
      })}
      {showSafe && <rect data-preview-only="true" aria-hidden="true" pointerEvents="none" x={margin} y={margin} width={document.width - 2 * margin} height={document.height - 2 * margin} fill="none" stroke="#77776f" strokeWidth="2" strokeDasharray="9 7" />}
      {selected && 'box' in selected && <g data-preview-only="true" aria-hidden="true" pointerEvents="none"><rect {...selected.box} fill="none" stroke="#6a332b" strokeWidth="3" strokeDasharray="8 5" /><text x={selected.box.x} y={Math.max(16, selected.box.y - 9)} fontFamily="monospace" fontSize="13" fill="#6a332b">{selected.id}</text></g>}
      {showGrid && (
        <g className="composition-guides" data-preview-only="true" aria-hidden="true" pointerEvents="none">
          {Array.from({ length: columns }, (_, index) => {
            const x = margin + index * (columnWidth + gutter);
            return <rect key={index} x={x} y={margin} width={columnWidth} height={document.height - 2 * margin} fill="#22221f" fillOpacity=".035" stroke="#77776f" strokeWidth="1" strokeDasharray="4 5" />;
          })}
        </g>
      )}
      {showZones && document.spaceZones?.length ? (
        <g data-preview-only="true" aria-hidden="true" pointerEvents="none" fill="#22221f" fillOpacity=".06" stroke="#22221f" strokeWidth="2" strokeDasharray="9 7">
          {document.spaceZones.map((zone) => zone.shape === 'ellipse'
            ? <ellipse key={zone.id} cx={zone.box.x + zone.box.width / 2} cy={zone.box.y + zone.box.height / 2} rx={zone.box.width / 2} ry={zone.box.height / 2} />
            : zone.shape === 'freeform' && zone.points?.length
              ? <polygon key={zone.id} points={zone.points.map(([x, y]) => `${x},${y}`).join(' ')} />
              : <rect key={zone.id} {...zone.box} />)}
        </g>
      ) : null}
    </svg>
  );
}
