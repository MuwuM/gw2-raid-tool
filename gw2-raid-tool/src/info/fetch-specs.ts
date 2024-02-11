import fs from 'fs-extra'
import path from 'path'
import gw2apiClient from 'gw2api-client'
const apiClient = gw2apiClient()

;(async () => {
  const target = path.join(__dirname, 'specs.json')
  const targetUnique = path.join(__dirname, 'unique-specs.json')

  const specs = [] as Array<{
    id: string
    name: string
    profession: string
    name_en: string
    name_de: string
    name_fr: string
  }>

  for (let index = 1; index <= 72; index++) {
    const apiEn = await apiClient.language('en').specializations().get(index)
    //client.get(`specializations/${index}`, {lang: "en"});
    const apiDe = await apiClient.language('de').specializations(index).get(index)
    const apiFr = await apiClient.language('fr').specializations(index).get(index)
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
