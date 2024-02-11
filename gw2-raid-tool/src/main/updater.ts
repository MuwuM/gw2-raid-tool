import updateArcDps11 from './update-arc-dps-11'
import updateEiParser from './update-ei-parser'
import updateRaidTool from './update-raid-tool'

import * as RaidToolDef from '../raid-tool'

export default async ({
  baseConfig,
  backendConfig,
  initStatus
}: {
  baseConfig: RaidToolDef.BaseConfig
  backendConfig: RaidToolDef.BackendConfig
  initStatus: RaidToolDef.InitStatusUninitialized
}) => {
  initStatus.step = '... Raid Tool ...'
  await updateRaidTool()
  initStatus.step = '... GW2-Elite-Insights-Parser  ...'
  await updateEiParser({
    baseConfig,
    backendConfig
  })
  initStatus.step = '... Arc DPS (Dx 11)  ...'
  await updateArcDps11({ baseConfig })
  initStatus.step = ''
}
