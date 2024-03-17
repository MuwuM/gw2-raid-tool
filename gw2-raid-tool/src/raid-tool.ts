export type TODO = any

export enum SupportedLanguages {
  de = 0,
  en = 1,
  fr = 2
}

export type Lang = keyof typeof SupportedLanguages

export type LocalizedName = keyof {
  [key in Lang as `name_${key}`]: string
}

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

export type SavedConfig = NedbDocumentSettings
export type BackendConfig = {
  userDataDir: string
  mumbleLinkActive: MumbleLinkData | null
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

export interface NedbDocument {
  _id: string
}

export type NedbDatabaseQuery<T extends NedbDocument> = {
  [prop in keyof Partial<T>]:
    | T[prop]
    | undefined
    | {
        $ne?: T[prop]
        $gt?: T[prop]
        $gte?: T[prop]
        $lt?: T[prop]
        $lte?: T[prop]
        $in?: T[prop][]
        $nin?: T[prop][]
        $elemMatch?: T[prop] extends Array<any> ? T[prop][0] : never
      }
} & {
  $or?: Array<NedbDatabaseQuery<T>>
  $and?: Array<NedbDatabaseQuery<T>>
}

export interface NedbDocumentLogs extends NedbDocument {
  hash: string
  htmlFile: string
  fightIcon: string
  eliteInsightsVersion: string
  eiEncounterID: number
  triggerID: number
  fightName: string
  arcVersion: string
  gW2Build: number
  language: string
  languageID: number
  recordedBy: string
  timeStart: string
  timeEnd: string
  timeEndMs: number
  duration: string
  success: boolean
  isCM: boolean
  entry: LogEntryRef
  players: Array<string>
  permalink?: string
  permalinkFailed?: boolean
}

export interface UiLogs extends NedbDocumentLogs {
  isUploading?: true
  displayCollapse?: number
  displayNameCollapse?: boolean
}
export interface UiAccounts extends NedbDocumentAccounts {
  color?: string
}
export interface UiFriends extends NedbDocumentFriends {}
export interface UiBlockedKeyRules extends NedbDocumentBlockedKeyRules {}

export interface NedbDocumentKnownFriends extends NedbDocument {
  status: 'done' | 'failed'
  entry: LogEntryRef
  ei_version: string | null
  msg: string
  friends: Array<string>
}

export interface NedbDocumentFriends extends NedbDocument {
  account: string
  chars: Array<{
    name: string
    profession: Array<{
      name: string
      sharedLogs: number
    }>
    sharedLogs: number
  }>
  sharedLogs: number
}

export interface GW2AccountInfo {
  id: string
  age: number
  name: string
  world: number
  guilds: string[]
  guild_leader: string[]
  created: string
  access: (
    | 'None'
    | 'PlayForFree'
    | 'GuildWars2'
    | 'HeartOfThorns'
    | 'PathOfFire'
    | 'EndOfDragons'
  )[]
  commander: boolean
  fractal_level: number
  daily_ap: number
  monthly_ap: number
  wvw_rank: number
  last_modified: string
  build_storage_slots: number
}

export interface BossKpMap {
  [boss: string]: number
}

export interface InventoryItem {
  id: number
  count: number
  charges?: number
  skin?: number
  upgrades?: number[]
  infusions?: number[]
  binding?: 'Account' | 'Character'
  '@char'?: string
}

export interface UnopenedBoxes {
  item: InventoryItem
  boss: string
  bossKp: number
}

export interface TriggerCompletedMap {
  [triggerID: number]: true | undefined
}

export interface NedbDocumentAccounts extends NedbDocument {
  kps: Kps
  completedSteps: string[]
  completedCMs: TriggerCompletedMap
  completedStrikesDaily: TriggerCompletedMap
  completedFractalsDaily: TriggerCompletedMap
  completedStrikesWeekly: TriggerCompletedMap
  token: string
  accountInfo?: GW2AccountInfo
}

export interface Kps {
  li: number
  fractal: number
  boneSkinner: number
  zhaitaffy: number
  raidBossKp: BossKpMap
  unopenedBoxes: UnopenedBoxes[]
}

export interface TotalKps extends Kps {}

export interface NedbDocumentBlockedKeyRules extends NedbDocument {
  active: boolean
  spec: string
  slot: string
  keys: string
}

export interface NedbDocumentSettings extends NedbDocument {
  default: true
  lang: Lang
  gw2Dir: string
  launchBuddyDir: string | null
  arcDisabled: boolean
  logsPath: string | false
}

export const NedbDatabaseEnabledTableNames = [
  'logs',
  'friends',
  'known_friends',
  'settings',
  'accounts',
  'blocked_key_rules'
] as const
type NedbDatabaseTableNames = (typeof NedbDatabaseEnabledTableNames)[number]

interface NedbDatastoreFindWithSort<T extends NedbDocument, R extends (T | null) | T[]>
  extends Promise<R> {
  sort(sort: { [key in keyof Partial<T>]: 1 | -1 }): NedbDatastoreFindWithSort<T, R>
  skip(skip: number): NedbDatastoreFindWithSort<T, R>
  limit(limit: number): NedbDatastoreFindWithSort<T, R>
}

export type KnownNedbDocument<T extends NedbDocument> = OptionalId<T> | null
export type OptionalId<T extends NedbDocument> = Omit<T, '_id'> & { _id?: T['_id'] }

export interface NedbDatastore<T extends NedbDocument> {
  ensureIndex(index: { fieldName: keyof T; unique?: boolean; sparse?: boolean }): Promise<void>
  find(query: NedbDatabaseQuery<T>): NedbDatastoreFindWithSort<T, T[]>
  findOne(query: NedbDatabaseQuery<T>): NedbDatastoreFindWithSort<T, T | null>
  insert(doc: OptionalId<T>): Promise<T>
  update(
    query: NedbDatabaseQuery<T>,
    update: OptionalId<T> | { $set: Partial<T> },
    updateOps?: { multi?: true }
  ): Promise<number>
  remove(query: NedbDatabaseQuery<T>, options?: { multi: boolean }): Promise<number>
  count(query: NedbDatabaseQuery<T>): Promise<number>
}
type NedbDatabaseInternal = {
  [db_name in NedbDatabaseTableNames]: NedbDatastore<NedbDocument>
}

export interface NedbDatabase extends NedbDatabaseInternal {
  logs: NedbDatastore<NedbDocumentLogs>
  friends: NedbDatastore<NedbDocumentFriends>
  known_friends: NedbDatastore<NedbDocumentKnownFriends>
  accounts: NedbDatastore<NedbDocumentAccounts>
  blocked_key_rules: NedbDatastore<NedbDocumentBlockedKeyRules>
  settings: NedbDatastore<NedbDocumentSettings>
}

export type ElectronApp = Electron.App

export type EventHandler<T extends keyof KnownEvents> = (eventData: KnownEvents[T]) => void
export type EventHandlerStored<T extends keyof KnownEvents> = {
  fn: 'on' | 'emit'
  args: [evt: T, handler: EventHandler<T>]
}

export type KnownEvents = {
  accounts: { accounts: Array<NedbDocumentAccounts> }
  addAccount: { token: string }
  removeAccount: { token: string }
  changeLang: { lang: Lang }
  baseConfig: { baseConfig: BaseConfig }
  selectLogsPath: NonNullable<unknown>
  selectGw2Dir: NonNullable<unknown>
  selectLaunchBuddyDir: NonNullable<unknown>
  removeLaunchBuddyDir: NonNullable<unknown>
  resetAllLogs: { confirmReset: 'reset' | string }
  updateArcDps11: NonNullable<unknown>
  checkArcUpdates: NonNullable<unknown>
  disableArcUpdates: NonNullable<unknown>
  enableArcUpdates: NonNullable<unknown>
  startGame: NonNullable<unknown>
  loading: { status: InitStatusStatusCode; step: string }
  progressConfig: { progressConfig: ProgressConfig }
  mumbleLinkActive: { mumbleLinkActive: MumbleLinkData | null }
  logs: {
    logs: Array<NedbDocumentLogs>
    page: number
    maxPages: number
    stats: LogStats
  }
  friends: { friends: Array<NedbDocumentFriends> }
  uploadLog: { hash: string }
  selectPage: { page: PageId; info: PageInfo }
  keyRules: { keyRules: NedbDocumentBlockedKeyRules[] }
  logFilter: LogFilter
  friendsFilter: NonNullable<unknown>
  updateKeyRule: { keyRule: NedbDocumentBlockedKeyRules }
  addKeyRule: NonNullable<unknown>
  deleteKeyRule: { keyRule: NedbDocumentBlockedKeyRules }
  getKeyRules: NonNullable<unknown>
  builds: { builds: Build[] }
}

export type Build = TODO

export type PageAction = 'upload' | undefined
export type PageId =
  | 'overview'
  | 'logs'
  | 'friends'
  | 'settings'
  | 'credits'
  | 'boss'
  | 'friend'
  | 'keys'

export interface PageInfo {
  id?: string
  action?: PageAction
}

export interface EventHubEmitter {
  emit<T extends keyof KnownEvents>(evt: T, data: KnownEvents[T]): void
}

export interface EventHub extends EventHubEmitter {
  onHandler: Array<EventHandlerStored<keyof KnownEvents>>
  onLocalHandler: Array<EventHandlerStored<keyof KnownEvents>>
  sockets: Array<Electron.WebContents>
  on<T extends keyof KnownEvents>(evt: T, handler: EventHandler<T>): void
  onLocal<T extends keyof KnownEvents>(evt: T, handler: EventHandler<T>): void
}

export enum InitStatusStatusCode {
  Starting = 0,
  Updating = 1,
  Loading = 2,
  Loaded = 3
}

export type InitStatusHandlerForStatusChange = (status: number, step?: string) => void

export interface InitStatusUninitialized {
  status: InitStatusStatusCode
  step: string
  onChange(handler: InitStatusHandlerForStatusChange): void
  offChange(handler: InitStatusHandlerForStatusChange): void
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

export type ServerRouteHandler = (params: {
  db: NedbDatabase
  baseConfig: BaseConfig
  backendConfig: BackendConfig
  eventHub: EventHub
}) => Promise<void>

export interface RaidToolConfig {
  bounds: { x: number; y: number; width: number; height: number }
  fullscreen: boolean
}

type KeysOfKnownEvents<T extends Readonly<(keyof KnownEvents)[]>> = T[number]

function exposeKnownEvents<T extends Readonly<(keyof KnownEvents)[]>>(events: T) {
  return events
}

export const exposedListeners = exposeKnownEvents([
  'loading',
  'baseConfig',
  'accounts',
  'progressConfig',
  'mumbleLinkActive',
  'logs',
  'selectPage',
  'friends',
  'keyRules'
] as const)
export type ExposedListenerKeys = KeysOfKnownEvents<typeof exposedListeners>

export const exposedSenders = exposeKnownEvents([
  'uploadLog',
  'logFilter',
  'friendsFilter',
  'startGame',
  'removeAccount',
  'addAccount',
  'changeLang',
  'selectGw2Dir',
  'selectLaunchBuddyDir',
  'removeLaunchBuddyDir',
  'resetAllLogs',
  'enableArcUpdates',
  'updateArcDps11',
  'checkArcUpdates',
  'disableArcUpdates',
  'updateKeyRule',
  'deleteKeyRule',
  'addKeyRule'
] as const)
export type ExposedSenderKeys = KeysOfKnownEvents<typeof exposedSenders>

export type ExposedIpc = {
  on: {
    [K in ExposedListenerKeys]: (callback: EventHandler<K>) => void
  }
  send: {
    [K in ExposedSenderKeys]: (data: KnownEvents[K]) => void
  }
}

export type PreloadApi = {
  ipc: ExposedIpc
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
  kpName?: keyof Kps
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

export interface ClickEvent<T extends HTMLElement = HTMLElement> extends MouseEvent {
  target: T
}
export interface ChangeEvent<T extends HTMLElement> extends Event {
  target: T
}

export type ClickOnInputEvent = ClickEvent<HTMLInputElement>
export type ClickOnButtonEvent = ClickEvent<HTMLButtonElement>

export type ChangeOnSelectEvent = ChangeEvent<HTMLSelectElement>
export type ChangeOnInputEvent = ChangeEvent<HTMLInputElement>

export interface LogFilter {
  p: number
  config: {
    bossId?: string
    friend?: string
    cmOnly?: boolean
  }
}

export interface LogStats {
  bossIcon?: string
  bossInfo?: WingsResStep
  friend?: KnownNedbDocument<NedbDocumentFriends>
  cmOnly?: boolean
  kills?: number
  fails?: number
  cmKills?: number
}

export type SpecsJson = Array<{
  id: number
  name: string
  profession: string
  name_en: string
  name_de: string
  name_fr: string
}>

export type LogEntryRef = string
