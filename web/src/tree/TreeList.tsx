import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { PersonRef } from '../api/types'
import { fullName, lifespan } from '../lib/people'
import type { TreeView } from './layout'
import { buildAncestors, buildDescendants, primaryParentFamily, type AncestorNode, type DescendantNode, type TreeIndex } from './model'

interface Props {
  index: TreeIndex
  view: TreeView
  generations: number
  bloodOnly: boolean
}

/**
 * The tree as nested lists of links: the chart's content for screen readers,
 * and a compact alternative on small screens. Nesting depth is the
 * generation, which screen readers announce as list levels.
 */
export function TreeList({ index, view, generations, bloodOnly }: Props) {
  const { t } = useTranslation()
  const gens = view === 'family' ? 1 : generations
  const showAncestors = view !== 'descendants'
  const showDescendants = view !== 'pedigree'
  const root = index.persons.get(index.rootId)!

  const siblings =
    view === 'family'
      ? (primaryParentFamily(index, index.rootId)?.children ?? [])
          .map((c) => index.persons.get(c.personId))
          .filter((p): p is PersonRef => !!p && p.id !== index.rootId)
      : []

  return (
    <div className="space-y-6">
      {showAncestors && (
        <section aria-labelledby="tree-list-ancestors">
          <h2 id="tree-list-ancestors" className="mb-2 text-lg font-semibold">
            {t('tree.ancestors')}
          </h2>
          <ul className="space-y-1">
            <AncestorItem node={buildAncestors(index, index.rootId, gens)} index={index} />
          </ul>
        </section>
      )}
      {siblings.length > 0 && (
        <section aria-labelledby="tree-list-siblings">
          <h2 id="tree-list-siblings" className="mb-2 text-lg font-semibold">
            {t('person.siblings')}
          </h2>
          <ul className="space-y-1">
            {siblings.map((s) => (
              <li key={s.id}>
                <PersonText person={s} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {showDescendants && (
        <section aria-labelledby="tree-list-descendants">
          <h2 id="tree-list-descendants" className="mb-2 text-lg font-semibold">
            {t('tree.descendants')}
          </h2>
          <ul className="space-y-1">
            <DescendantItem node={buildDescendants(index, index.rootId, gens)} index={index} bloodOnly={bloodOnly} />
          </ul>
        </section>
      )}
      {!showAncestors && !showDescendants && <PersonText person={root} />}
    </div>
  )
}

function PersonText({ person, prefix }: { person: PersonRef; prefix?: string }) {
  const { t } = useTranslation()
  return (
    <>
      {prefix && <span className="text-slate-600 dark:text-slate-400">{prefix}: </span>}
      <Link to={`/people/${person.id}`} className="font-medium text-brand-700 underline underline-offset-4 dark:text-brand-100">
        {fullName(person) ?? t('person.unknown')}
      </Link>
      {lifespan(person) && <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">{lifespan(person)}</span>}
    </>
  )
}

const nested = 'mt-1 space-y-1 border-l-2 border-slate-200 pl-4 dark:border-slate-700'

function AncestorItem({ node, index }: { node: AncestorNode; index: TreeIndex }) {
  const { t } = useTranslation()
  if (node.kind === 'unknown') return <li className="italic text-slate-600 dark:text-slate-400">{t('person.unknownParent')}</li>
  const person = index.persons.get(node.personId)!
  if (node.kind === 'repeat') {
    return (
      <li>
        <PersonText person={person} /> <span className="text-sm text-slate-600 dark:text-slate-400">({t('tree.alsoAbove')})</span>
      </li>
    )
  }
  return (
    <li>
      <PersonText person={person} />
      {node.parents.length > 0 && (
        <ul className={nested} aria-label={t('tree.parentsOf', { name: fullName(person) ?? t('person.unknown') })}>
          {node.parents.map((p) => (
            <AncestorItem key={p.key} node={p} index={index} />
          ))}
        </ul>
      )}
    </li>
  )
}

function DescendantItem({ node, index, bloodOnly }: { node: DescendantNode; index: TreeIndex; bloodOnly: boolean }) {
  const { t } = useTranslation()
  const person = index.persons.get(node.personId)!
  if (node.kind === 'repeat') {
    return (
      <li>
        <PersonText person={person} /> <span className="text-sm text-slate-600 dark:text-slate-400">({t('tree.alsoAbove')})</span>
      </li>
    )
  }
  return (
    <li>
      <PersonText person={person} />
      {node.families.map((f) => {
        const partner = f.partnerId !== null ? index.persons.get(f.partnerId) : undefined
        return (
          <div key={f.familyId} className="mt-1 pl-4">
            {!bloodOnly && (
              <p className="text-sm">
                {partner ? <PersonText person={partner} prefix={t('tree.partner')} /> : <span className="italic">{t('family.otherParentUnknown')}</span>}
              </p>
            )}
            {f.children.length > 0 && (
              <ul className={nested} aria-label={t('tree.childrenOf', { name: fullName(person) ?? t('person.unknown') })}>
                {f.children.map((c) => (
                  <DescendantItem key={c.key} node={c} index={index} bloodOnly={bloodOnly} />
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </li>
  )
}
