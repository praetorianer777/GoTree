import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import { importGedcom, listPersons } from '../api/endpoints'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageHeading } from '../components/PageHeading'
import { ExportSection } from '../transfer/ExportSection'
import { ImportReportView } from '../transfer/ImportReportView'

export function ImportExportPage() {
  const { t } = useTranslation()
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeading title={t('nav.importExport')}>{t('nav.importExport')}</PageHeading>
      <ExportSection />
      <ImportSection />
    </div>
  )
}

function ImportSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const people = useQuery({ queryKey: ['persons', 'count'], queryFn: ({ signal }) => listPersons('', 1, 0, signal) })
  const hasData = (people.data?.total ?? 0) > 0

  const run = useMutation({
    mutationFn: (mode: 'empty' | 'replace') => importGedcom(file!, mode),
    onSuccess: () => {
      setConfirmReplace(false)
      void queryClient.invalidateQueries()
    },
  })
  const error =
    run.error instanceof ApiError && run.error.status === 409
      ? t('transfer.notEmpty')
      : run.error
        ? t('transfer.importFailed', { message: run.error.message })
        : null

  return (
    <section aria-labelledby="import-heading" className="space-y-4">
      <h2 id="import-heading" className="border-b border-slate-200 pb-2 text-xl font-semibold dark:border-slate-800">
        {t('transfer.importTitle')}
      </h2>
      <p className="text-slate-700 dark:text-slate-300">{t('transfer.importIntro')}</p>
      <div>
        <label htmlFor={fileId} className="block text-sm font-medium">
          {t('transfer.file')}
        </label>
        <input
          id={fileId}
          type="file"
          accept=".ged,.zip,.gdz"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            run.reset()
          }}
          className="mt-1 block w-full text-base file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-slate-400 file:bg-white file:px-4 file:font-medium dark:file:border-slate-600 dark:file:bg-slate-900 dark:file:text-slate-100"
        />
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('transfer.fileHint')}</p>
      </div>
      {hasData && <p className="font-medium text-amber-800 dark:text-amber-300">{t('transfer.replaceWarning')}</p>}
      <Button
        disabled={!file}
        busy={run.isPending && !confirmReplace}
        onClick={() => (hasData ? setConfirmReplace(true) : run.mutate('empty'))}
      >
        {hasData ? t('transfer.replaceButton') : t('transfer.importButton')}
      </Button>
      <p role="status" className="text-sm text-slate-600 dark:text-slate-400">
        {run.isPending ? t('transfer.importing') : ''}
      </p>
      {error && (
        <p role="alert" className="font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {run.data && <ImportReportView report={run.data} />}
      <ConfirmDialog
        open={confirmReplace}
        title={t('transfer.replaceTitle')}
        message={t('transfer.replaceConfirm', { count: people.data?.total ?? 0 })}
        confirmLabel={t('transfer.replaceButton')}
        busy={run.isPending}
        error={error}
        onConfirm={() => run.mutate('replace')}
        onClose={() => setConfirmReplace(false)}
      />
    </section>
  )
}
