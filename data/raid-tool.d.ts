import { Context } from "koa";
import Datastore from "nedb-promises";
import { Server, Socket } from "socket.io";

type Lang = "en" | "de" | "fr";

export type MumbleLinkData = {
  uiVersion: number;
  uiTick: number;
  fAvatarPosition: {
    x: number;
    y: number;
    z: number;
  };
  fAvatarFront: {
    x: number;
    y: number;
    z: number;
  };
  fAvatarTop: {
    x: number;
    y: number;
    z: number;
  };
  name: string;
  fCameraPosition: {
    x: number;
    y: number;
    z: number;
  };
  fCameraFront: {
    x: number;
    y: number;
    z: number;
  };
  fCameraTop: {
    x: number;
    y: number;
    z: number;
  };
  identity: {
    name: string;
    profession: number;
    spec: number;
    race: number;
    map_id: number;
    world_id: number;
    team_color_id: number;
    commander: boolean;
    fov: number;
    uisz: number;
  };
  identityPlain: string;
  context_len: number;
  context: {
    serverAddress: string;
    mapId: number;
    mapType: number;
    shardId: number;
    instance: number;
    buildId: number;
    uiState: number;
    compassWidth: number;
    compassHeight: number;
    compassRotation: number;
    playerX: number;
    playerY: number;
    mapCenterX: number;
    mapCenterY: number;
    mapScale: number;
    processId: number;
    mountIndex: number;
  };
  uiStates?: {
    IsMapOpen: boolean;
    IsCompassTopRight: boolean;
    DoesCompassHaveRotationEnabled: boolean;
    GameHasFocus: boolean;
    IsInCompetitiveGameMode: boolean;
    TextboxHasFocus: boolean;
    IsInCombat: boolean;
  };
  time?: number;
};

export type BaseConfig = {
  appVersion: string;
  isAdmin: boolean;
  ei_version: string;
  eiPath: string;
  eiConfig: string;
  logsPath: string;
  zoom: number;
  gw2Instances: {
    running: Array<{ pid: number; name: string }>;
    lauchbuddy: Array<{ pid: number; name: string }>;
    nvidiaShare: Array<{ pid: number; name: string }>;
    ready: boolean;
  };
  buildJsonPath?: string;
  localBuilds: boolean;
  lang: Lang;
  gw2Dir: string;
  arcDisabled: boolean;
  arcdps11VersionHash: string;
  arcdps11VersionDate: string;
  arcdps11VersionHasUpdates: boolean;
  arcdpsVersionHash: string;
  arcdpsVersionDate: string;
  arcdpsVersionHasUpdates: boolean;
  savedConfigId: string;
  launchBuddyDir: string;
  launchBuddyConfigDir: string;
};

export type SavedConfig = {
  _id: string;
  lang: Lang;
  gw2Dir: string;
  launchBuddyDir: string;
  arcDisabled: boolean;
  logsPath: string | false;
};
export type BackendConfig = {
  userDataDir: string;
  mumbleLinkActive: MumbleLinkData;
  mumbleLinkStats: { [pid: number]: MumbleLinkData };
  port: number;
  appDomain: string;
};

export type ProgressConfig = {
  parsingLogs: number;
  parsedLogs: number;
  compressingLogs: number;
  compressedLogs: number;
  currentLog: string | false;
};
export type ProgressConfigProxied = {
  parsingLogs: number;
  parsedLogs: number;
  compressingLogs: number;
  compressedLogs: number;
  currentLog: string | false;
  $parsingLogs: number;
  $parsedLogs: number;
  $compressingLogs: number;
  $compressedLogs: number;
  $currentLog: string | false;
};

export type NedbDocument = any;

export type NedbDatabase = {
  [db_name: string]: Datastore<NedbDocument>;
};

export type ElectronApp = Electron.App;

type EventHandler = (event) => void;
export type EventHandlerStored = {
  fn: "on" | "emit";
  args: [evt: string, handler: EventHandler];
};

export type EventHubEmitter = {
  emit: (evt: string, data: any) => void;
};

export type EventHub = {
  registerIo: (io: Server) => void;
  onHandler: Array<EventHandlerStored>;
  onLocalHandler: Array<EventHandlerStored>;
  sockets: Array<Socket>;
  on: (evt: string, handler: EventHandler) => void;
  onLocal: (evt: string, handler: EventHandler) => void;
  emit: (evt: string, data: any) => void;
};

type StatusCode = number;

export type InitStatus = {
  status: StatusCode;
  step: string;
  state: { [label: string]: StatusCode };
  stateLabel: { [status: StatusCode]: string };
  db: NedbDatabase;
  onChange: (handler: EventHandler) => void;
  offChange: (handler: EventHandler) => void;
  waitFor: (statusCode: StatusCode) => Promise<StatusCode>;
  baseConfig: BaseConfig;
  backendConfig: BackendConfig;
  eventHub: EventHub;
};

type RouteHandler = (ctx: Context) => Promise<void>;

export type ServerRouteHandler = (param0: {
  router: {
    get: (path: string, handler: RouteHandler) => void;
    post: (path: string, handler: RouteHandler) => void;
  };
  db: NedbDatabase;
  baseConfig: BaseConfig;
  backendConfig: BackendConfig;
  eventHub: EventHub;
}) => void;
