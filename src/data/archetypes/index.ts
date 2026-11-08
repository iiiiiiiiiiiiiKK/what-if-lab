export { bitcoinArchetype } from './bitcoin'
export { internetLateArchetype } from './internetLate'
export { dinosaursArchetype } from './dinosaurs'
export { oilArchetype } from './oil'
export { romeArchetype } from './rome'
export { aiEarlyArchetype } from './aiEarly'
export { dollarArchetype } from './dollar'
export { spaceArchetype } from './space1900'
export { moonArchetype } from './moon'

import type { Archetype } from './archetypeTypes'
import { bitcoinArchetype } from './bitcoin'
import { internetLateArchetype } from './internetLate'
import { dinosaursArchetype } from './dinosaurs'
import { oilArchetype } from './oil'
import { romeArchetype } from './rome'
import { aiEarlyArchetype } from './aiEarly'
import { dollarArchetype } from './dollar'
import { spaceArchetype } from './space1900'
import { moonArchetype } from './moon'

/** Order matters only for deterministic tie-breaking in `matchArchetype`. */
export const archetypes: Archetype[] = [
  bitcoinArchetype,
  internetLateArchetype,
  dinosaursArchetype,
  oilArchetype,
  romeArchetype,
  aiEarlyArchetype,
  dollarArchetype,
  spaceArchetype,
  moonArchetype,
]
