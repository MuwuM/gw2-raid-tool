import type { en } from './en'

type EnglishTranslationFile = typeof en

type TranslationFileKeys = keyof EnglishTranslationFile

type TranslationType<P> = EnglishTranslationFile[P] extends string
  ? string
  : (val: number) => string

export type BaseTranslationFile = {
  [P in TranslationFileKeys]: TranslationType<P>
}

export type TranslationFile<L extends BaseTranslationFile> = L
