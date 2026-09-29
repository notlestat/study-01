import type { ReactNode } from 'react';

type IconName = 'image' | 'plus' | 'lock' | 'unlock' | 'arrow';
interface IconProps { name: IconName; size?: number; }

const paths: Record<IconName, ReactNode> = {
  image: <><rect x="3" y="3" width="18" height="18" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  lock: <><rect x="5" y="10" width="14" height="11" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></>,
  unlock: <><rect x="5" y="10" width="14" height="11" /><path d="M8 10V6a4 4 0 0 1 7-2M12 14v3" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
};

export function Icon({ name, size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{paths[name]}</svg>;
}
