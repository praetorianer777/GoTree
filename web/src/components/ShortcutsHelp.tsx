import { useTranslation } from 'react-i18next'
import { Dialog } from './Dialog'

const shortcuts = [
  ['/', 'search'],
  ['n', 'newPerson'],
  ['e', 'edit'],
  ['a', 'addEvent'],
  ['p', 'addParent'],
  ['s', 'addPartner'],
  ['c', 'addChild'],
  ['b', 'addSibling'],
  ['Ctrl+Enter', 'ctrlEnter'],
  ['Esc', 'close'],
  ['?', 'help'],
] as const

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} title={t('shortcuts.title')}>
      <p className="mb-3 text-slate-700 dark:text-slate-300">{t('shortcuts.intro')}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {shortcuts.map(([key, action]) => (
          <div key={key} className="contents">
            <dt>
              <kbd className="rounded border border-slate-400 bg-slate-100 px-2 py-0.5 font-mono text-sm dark:border-slate-600 dark:bg-slate-800">
                {key}
              </kbd>
            </dt>
            <dd>{t(`shortcuts.${action}`)}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
