import { Group } from 'three';
import { DOT_CONFIG, type DotConfig } from './config';
import { createBody } from './createBody';
import { createEyes } from './createEyes';
import { createBeret } from './createBeret';

export function createDot(config: DotConfig = DOT_CONFIG) {
  const group = new Group();
  const body = createBody(config);
  const eyes = createEyes(body.mesh);
  const beret = createBeret();
  group.add(body.mesh, body.fibers.mesh, eyes.group, beret.group);
  return { group, body, eyes, beret };
}

export type Dot = ReturnType<typeof createDot>;
