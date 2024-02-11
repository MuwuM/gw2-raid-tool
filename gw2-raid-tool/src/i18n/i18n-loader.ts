import de from './de'
import en from './en'
import fr from './fr'
import { BaseTranslationFile } from './type'
import { Lang } from '../raid-tool'

type LangMapRecord = { [P in Lang]: BaseTranslationFile }
type LangMapLangIds = Array<keyof LangMapRecord>

const langMap = {
  de,
  en,
  fr
} as const

const langIds = Object.keys(langMap) as LangMapLangIds
const langLabels = langIds.map((id) => langMap[id].name)

const langs = langIds.map((id) => ({ id, label: langMap[id].name }))

export default {
  langLabels,
  langIds,
  langs,
  ...langMap
}
