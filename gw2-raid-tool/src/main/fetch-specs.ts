import fs from 'fs-extra'
import path from 'path'
import { gw2ApiClient } from './gw2-api-with-types'
import { SpecsJson } from '../raid-tool'

async function retryOnError<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  retryDelay = 1000
): Promise<T> {
  let lastError: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const is504 = error?.response?.status === 504 || error?.status === 504 || error?.code === 504

      if (is504 && attempt < maxRetries) {
        console.warn(`HTTP 504 error, retrying (${attempt + 1}/${maxRetries})...`)
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw lastError
}

;(async () => {
  const apiClient = gw2ApiClient()

  const rootDir = path.resolve(__dirname, '../../../')

  const dataDir = path.resolve(rootDir, 'gw2-raid-tool')

  const infoDir = path.resolve(dataDir, 'src/info')

  const target = path.join(infoDir, 'specs.json')
  const targetUnique = path.join(infoDir, 'unique-specs.json')

  const specs = [] as SpecsJson

  for (let index = 1; index <= 81; index++) {
    const apiEn = await retryOnError(() => apiClient.language('en').specializations().get(index))
    //client.get(`specializations/${index}`, {lang: "en"});
    const apiDe = await retryOnError(() => apiClient.language('de').specializations().get(index))
    const apiFr = await retryOnError(() => apiClient.language('fr').specializations().get(index))
    if (apiEn.elite) {
      specs.push({
        id: apiEn.id,
        name: apiEn.name,
        profession: apiEn.profession,
        name_en: apiEn.name,
        name_de: apiDe.name,
        name_fr: apiFr.name
      })
    } else {
      specs.push({
        id: apiEn.id,
        name: apiEn.profession,
        profession: apiEn.profession,
        name_en: apiEn.profession,
        name_de: apiDe.profession,
        name_fr: apiFr.profession
      })
    }

    console.info(`${apiEn.id}: ${apiEn.profession}`)
  }

  await fs.outputJSON(target, specs)

  const uniqueSpecs = [] as Array<string>
  for (const spec of specs) {
    if (!uniqueSpecs.includes(spec.name)) {
      uniqueSpecs.push(spec.name)
    }
  }
  await fs.outputJSON(targetUnique, uniqueSpecs)
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
