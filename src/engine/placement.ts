import type { AffineMatrix, Box, CompositionElement } from '../domain/document.ts';

export interface ElementPose extends Box { rotation: number; }
export const IDENTITY: AffineMatrix = [1, 0, 0, 1, 0, 0];
export const pointAt = (matrix: AffineMatrix, x: number, y: number): [number, number] => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
export function multiply(a: AffineMatrix, b: AffineMatrix): AffineMatrix {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}
export function inverse(m: AffineMatrix): AffineMatrix {
  const determinant = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(determinant) < 1e-8) throw new Error('The transform cannot collapse an element.');
  return [m[3]/determinant, -m[1]/determinant, -m[2]/determinant, m[0]/determinant, (m[2]*m[5]-m[3]*m[4])/determinant, (m[1]*m[4]-m[0]*m[5])/determinant];
}
export function baseBox(element: CompositionElement): Box {
  if ('box' in element) return element.box;
  return { x: Math.min(element.x1, element.x2), y: Math.min(element.y1, element.y2), width: Math.max(1, Math.abs(element.x2-element.x1)), height: Math.max(1, Math.abs(element.y2-element.y1)) };
}
export function elementPose(element: CompositionElement): ElementPose {
  const box = baseBox(element), matrix = element.transform ?? IDENTITY;
  const [cx, cy] = pointAt(matrix, box.x + box.width/2, box.y + box.height/2);
  const width = box.width * Math.hypot(matrix[0], matrix[1]);
  const height = box.height * Math.hypot(matrix[2], matrix[3]);
  return { x: cx-width/2, y: cy-height/2, width, height, rotation: Math.atan2(matrix[1], matrix[0]) * 180/Math.PI };
}
export function visualBounds(element: CompositionElement): Box {
  const box = baseBox(element), matrix = element.transform ?? IDENTITY;
  const corners = [[box.x,box.y],[box.x+box.width,box.y],[box.x+box.width,box.y+box.height],[box.x,box.y+box.height]].map(([x,y]) => pointAt(matrix,x,y));
  const xs=corners.map(point=>point[0]), ys=corners.map(point=>point[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs)-Math.min(...xs), height: Math.max(...ys)-Math.min(...ys) };
}
