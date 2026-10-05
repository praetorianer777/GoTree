import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPerson, updatePerson } from '../api/endpoints'
import type { Person, PersonInput } from '../api/types'
import { Dialog } from '../components/Dialog'
import { Form } from '../components/Form'
import { formErrors } from '../lib/errors'
import { emptyPerson } from '../lib/people'
import { PersonFields } from './PersonFields'

interface Props {
  open: boolean
  onClose: () => void
  /** Edit this person, or create a new one when absent. */
  person?: Person
  onSaved: (p: Person) => void
}

const toInput = (p: Person): PersonInput => ({
  givenNames: p.givenNames,
  surname: p.surname,
  namePrefix: p.namePrefix,
  nameSuffix: p.nameSuffix,
  nickname: p.nickname,
  sex: p.sex,
  isLiving: p.isLiving,
  notes: p.notes,
  alternateNames: p.alternateNames.map((n) => ({
    type: n.type,
    givenNames: n.givenNames,
    surname: n.surname,
    namePrefix: n.namePrefix,
    nameSuffix: n.nameSuffix,
    nickname: n.nickname,
    status: n.status,
    statusReason: n.statusReason,
  })),
})

export function PersonDialog({ open, onClose, person, onSaved }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} title={person ? t('person.edit') : t('person.new')} wide>
      {/* Remounted per opening so the form starts from the current data. */}
      {open && <PersonDialogForm person={person} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  )
}

function PersonDialogForm({ person, onClose, onSaved }: Omit<Props, 'open'>) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [value, setValue] = useState<PersonInput>(person ? toInput(person) : emptyPerson())
  const save = useMutation({
    mutationFn: () => (person ? updatePerson(person.id, value) : createPerson(value)),
    onSuccess: (p) => {
      void queryClient.invalidateQueries({ queryKey: ['persons'] })
      void queryClient.invalidateQueries({ queryKey: ['person'] })
      onSaved(p)
    },
  })
  const errors = formErrors(save.error, (m) => t('common.saveFailed', { message: m }))

  return (
    <Form onSubmit={() => save.mutate()} onCancel={onClose} submitLabel={t('common.save')} busy={save.isPending} error={errors.form}>
      <PersonFields value={value} onChange={setValue} errors={errors.fields} full />
    </Form>
  )
}
