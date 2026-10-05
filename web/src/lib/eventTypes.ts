/** GEDCOM event tags offered in the UI, in the order they are listed. */
export const personEventTypes = [
  'BIRT',
  'CHR',
  'BAPM',
  'CONF',
  'EDUC',
  'GRAD',
  'OCCU',
  'RESI',
  'CENS',
  'EMIG',
  'IMMI',
  'NATU',
  'RELI',
  '_MILT',
  'RETI',
  'WILL',
  'PROB',
  'DEAT',
  'BURI',
  'CREM',
  'EVEN',
] as const

export const familyEventTypes = ['ENGA', 'MARB', 'MARC', 'MARL', 'MARR', 'DIV', 'ANUL', 'CENS', 'RESI', 'EVEN'] as const

export const participantRoles = [
  'head',
  'spouse',
  'child',
  'parent',
  'sibling',
  'relative',
  'witness',
  'godparent',
  'informant',
  'officiant',
  'clergy',
  'friend',
  'neighbor',
  'other',
] as const
