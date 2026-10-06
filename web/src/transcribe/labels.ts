import type { TFunction } from 'i18next'
import type { RecordTemplate, TemplateRole } from '../api/types'

/** Built-in templates are translated; custom ones carry the user's words. */
export const templateName = (t: TFunction, tpl: RecordTemplate) =>
  tpl.builtin ? t(`transcribe.templateName_${tpl.key}` as 'transcribe.templateName_census') : tpl.name

export const roleLabel = (t: TFunction, tpl: RecordTemplate, role: TemplateRole) =>
  tpl.builtin ? t(`transcribe.roleName.${role.key}` as 'transcribe.roleName.head', { defaultValue: role.key }) : role.label
