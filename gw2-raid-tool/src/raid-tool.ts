import Datastore from 'nedb-promises'

export type TODO = any

export enum SupportedLanguages {
  de = 0,
  en = 1,
  fr = 2
}

export type Lang = keyof typeof SupportedLanguages
export type MumbleLinkDataIdentity = {
  name: string
  profession: number
  spec: number
  race: number
  map_id: number
  world_id: number
  team_color_id: number
  commander: boolean
  fov: number
  uisz: number
}
export type MumbleLinkData = {
  uiVersion: number
  uiTick: number
  fAvatarPosition: {
    x: number
    y: number
    z: number
  }
  fAvatarFront: {
    x: number
    y: number
    z: number
  }
  fAvatarTop: {
    x: number
    y: number
    z: number
  }
  name: string
  fCameraPosition: {
    x: number
    y: number
    z: number
  }
  fCameraFront: {
    x: number
    y: number
    z: number
  }
  fCameraTop: {
    x: number
    y: number
    z: number
  }
  identity?: MumbleLinkDataIdentity
  identityPlain: string
  context_len: number
  context: {
    serverAddress: string
    mapId: number
    mapType: number
    shardId: number
    instance: number
    buildId: number
    uiState: number
    compassWidth: number
    compassHeight: number
    compassRotation: number
    playerX: number
    playerY: number
    mapCenterX: number
    mapCenterY: number
    mapScale: number
    processId: number
    mountIndex: number
  }
  uiStates?: {
    IsMapOpen: boolean
    IsCompassTopRight: boolean
    DoesCompassHaveRotationEnabled: boolean
    GameHasFocus: boolean
    IsInCompetitiveGameMode: boolean
    TextboxHasFocus: boolean
    IsInCombat: boolean
  }
  time?: number
}

export type MumbleLinkDataStatus = Partial<MumbleLinkData>

export interface ProcessRef {
  name: string
  pid: number
}

export type BaseConfig = {
  appVersion: string
  isAdmin: boolean
  ei_version: string | null
  eiPath: string
  eiConfig: string
  logsPath: string
  zoom: number
  gw2Instances: {
    running: Array<ProcessRef>
    lauchbuddy: Array<ProcessRef>
    nvidiaShare: Array<ProcessRef>
    ready: boolean
  }
  buildJsonPath?: string
  localBuilds: boolean
  lang: Lang
  gw2Dir: string
  arcDisabled: boolean
  arcdps11VersionHash: string | null
  arcdps11VersionDate: string
  arcdps11VersionHasUpdates: boolean
  arcdpsVersionHash: string
  arcdpsVersionDate: string
  arcdpsVersionHasUpdates: boolean
  savedConfigId: string
  launchBuddyDir: string | null
  launchBuddyConfigDir: string
  possibleSlots?: Array<{ slot: string }>
  boringBg?: boolean
}

export type SavedConfig = {
  _id: string
  lang: Lang
  gw2Dir: string
  launchBuddyDir: string
  arcDisabled: boolean
  logsPath: string | false
}
export type BackendConfig = {
  userDataDir: string
  mumbleLinkActive: MumbleLinkData | false
  mumbleLinkStats: { [pid: number]: MumbleLinkData }
  port: number
  appDomain: string
  dbBaseDir: string
  certificate: string
}

export type ProgressConfig = {
  parsingLogs: number
  parsedLogs: number
  compressingLogs: number
  compressedLogs: number
  currentLog: string | false
}
export type ProgressConfigProxied = {
  parsingLogs: number
  parsedLogs: number
  compressingLogs: number
  compressedLogs: number
  currentLog: string | false
  $parsingLogs: number
  $parsedLogs: number
  $compressingLogs: number
  $compressedLogs: number
  $currentLog: string | false
}

export type NedbDocument = any

export const NedbDatabaseEnabledTableNames = [
  'logs',
  'friends',
  'known_friends',
  'settings',
  'accounts',
  'blocked_key_rules'
] as const
type NedbDatabaseTableNames = (typeof NedbDatabaseEnabledTableNames)[number]

export type NedbDatabase = {
  [db_name in NedbDatabaseTableNames]: Datastore<NedbDocument>
}

export type ElectronApp = Electron.App

export type EventHandler = (...args: any[]) => void
export type EventHandlerStored = {
  fn: 'on' | 'emit'
  args: [evt: string, handler: EventHandler]
}

export interface EventHubEmitter {
  emit: (evt: string, data: any) => void
}

export interface EventHub extends EventHubEmitter {
  onHandler: Array<EventHandlerStored>
  onLocalHandler: Array<EventHandlerStored>
  sockets: Array<Electron.WebContents>
  on: (evt: string, handler: EventHandler) => void
  onLocal: (evt: string, handler: EventHandler) => void
}

export enum InitStatusStatusCode {
  Starting = 0,
  Updating = 1,
  Loading = 2,
  Loaded = 3
}

export interface InitStatusUninitialized {
  status: InitStatusStatusCode
  step: string
  onChange: (handler: EventHandler) => void
  offChange: (handler: EventHandler) => void
  waitFor: (statusCode: InitStatusStatusCode) => Promise<InitStatusStatusCode>
  db?: NedbDatabase
  baseConfig?: BaseConfig
  backendConfig?: BackendConfig
  progressConfig?: ProgressConfig
  eventHub?: EventHub
}
export interface InitStatus extends InitStatusUninitialized {
  db: NedbDatabase
  baseConfig: BaseConfig
  backendConfig: BackendConfig
  progressConfig: ProgressConfig
  eventHub: EventHub
}

export type ServerRouteHandler = (param0: {
  router: TODO
  db: NedbDatabase
  baseConfig: BaseConfig
  backendConfig: BackendConfig
  eventHub: EventHub
}) => Promise<void>

export interface RaidToolConfig {
  bounds: { x: number; y: number; width: number; height: number }
  fullscreen: boolean
}

type SendViaIpc = (data: any) => void

export type PreloadApi = {
  ipc: {
    onLoading: (callback: EventHandler) => void
    onBaseConfig: (callback: EventHandler) => void
    onAccounts: (callback: EventHandler) => void
    onProgressConfig: (callback: EventHandler) => void
    onMumbleLinkActive: (callback: EventHandler) => void
    onLogs: (callback: EventHandler) => void
    onSelectPage: (callback: EventHandler) => void
    onFriends: (callback: EventHandler) => void
    onKeyRules: (callback: EventHandler) => void
  }
  uploadLog: SendViaIpc
  logFilter: SendViaIpc
  friendsFilter: SendViaIpc
  startGame: SendViaIpc
  removeAccount: SendViaIpc
  addAccount: SendViaIpc
  changeLang: SendViaIpc
  selectGw2Dir: SendViaIpc
  selectLaunchBuddyDir: SendViaIpc
  removeLaunchBuddyDir: SendViaIpc
  resetAllLogs: SendViaIpc
  enableArcUpdates: SendViaIpc
  updateArcDps11: SendViaIpc
  checkArcUpdates: SendViaIpc
  disableArcUpdates: SendViaIpc
  updateKeyRule: SendViaIpc
  deleteKeyRule: SendViaIpc
  addKeyRule: SendViaIpc
}
export type PreloadApiData = {
  loading: { status: InitStatusStatusCode; step: string }
}

export interface WingsResStep {
  id: string
  type: 'Boss' | 'Checkpoint'
  name_en: string
  name_de: string
  name_fr: string
  triggerID?: number | Array<number>
  img: string
  hasCM: boolean
  dailyIndex?: number
  kpName?: string
}
export interface WingsRef {
  w: number | string
  id: string
  map_id?: number
  steps: Array<WingsResStep>

  isStrike?: true
  isStrikeWeekly?: true
  name_en?: string
  name_de?: string
  name_fr?: string

  w_img?: string
  w_img_text?: string
  hasDailies?: number

  isFractal?: true
}

export type WingsRes = Array<WingsRef>
