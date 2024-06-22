// @ts-ignore-next-line
import originalGw2apiClient from 'gw2api-client'
import { GW2AccountInfo, InventoryItem } from '../raid-tool'

type GW2ApiClientWithOrWithoutToken<T extends string | false> = T extends string
  ? GW2ApiClient<T>
  : GW2ApiClientWithoutToken<T>

// the function should return GW2ApiClientWithoutToken if no token is provided and GW2ApiClient if a token is provided
export function gw2ApiClient<T extends string | false>(
  token?: T
): GW2ApiClientWithOrWithoutToken<T> {
  const api = originalGw2apiClient() as GW2ApiClientWithoutToken<T>
  if (typeof token !== 'string') {
    return api as GW2ApiClientWithOrWithoutToken<T>
  }
  api.authenticate(token)
  return api as GW2ApiClientWithOrWithoutToken<T>
}

export interface GW2ApiClientWithoutToken<T extends string | false = false> {
  authenticate(token: string): GW2ApiClient<T>
  language(lang: 'en' | 'de' | 'es' | 'fr'): GW2ApiClientWithOrWithoutToken<T>
  specializations(): GW2ApiClientSpecializations
}

export interface GW2ApiClient<T extends string | false = string>
  extends GW2ApiClientWithoutToken<T> {
  account(): GW2ApiClientAccount
  characters(): GW2ApiClientCharacters
  characters(name: string): GW2ApiClientCharacter
}

interface GW2ApiClientSpecializations {
  get(): Promise<GW2ApiResponseSpecialization[]>
  get(id: number): Promise<GW2ApiResponseSpecialization>
}

interface GW2ApiClientAccount {
  get(): Promise<GW2ApiResponseAccountInfo>
  inventory(): GW2ApiClientAccountSharedInventory
  bank(): GW2ApiClientAccountBank
  materials(): GW2ApiClientAccountMaterials
  legendaryarmory(): GW2ApiClientAccountLegendaryArmory
  wallet(): GW2ApiClientAccountWallet
  raids(): GW2ApiClientAccountRaids
}

interface GW2ApiClientAccountSharedInventory {
  get(): Promise<GW2ApiResponseSharedInventoryItem[]>
}

interface GW2ApiClientAccountBank {
  get(): Promise<GW2ApiResponseBankInventoryItem[]>
}

interface GW2ApiClientAccountMaterials {
  get(): Promise<GW2ApiResponseMaterialItem[]>
}

interface GW2ApiClientAccountLegendaryArmory {
  get(): Promise<GW2ApiResponseLegendaryArmoryItem[]>
}

interface GW2ApiClientAccountWallet {
  get(): Promise<GW2ApiResponseWalletItem[]>
}

interface GW2ApiClientCharacters {
  all(): Promise<GW2ApiResponseCharacter[]>
}

interface GW2ApiClientCharacter {
  get(): Promise<GW2ApiResponseCharacter>
  inventory(): Promise<GW2ApiResponseInventoryBag[]>
  equipment(): Promise<GW2ApiResponseEquipmentItem[]>
}

interface GW2ApiClientAccountRaids {
  get(): Promise<GW2ApiResponseAccountRaidId[]>
}

export type GW2ApiResponseAccountInfo = GW2AccountInfo

export interface GW2ApiResponseInventory {
  inventory: GW2ApiResponseInventoryItem[]
}

export interface GW2ApiResponseWalletItem {
  id: number
  value?: number
}

export interface GW2ApiResponseCharacter {
  name: string
  race: 'Asura' | 'Charr' | 'Human' | 'Norn' | 'Sylvari'
  gender: 'Male' | 'Female'
  profession:
    | 'Elementalist'
    | 'Engineer'
    | 'Guardian'
    | 'Mesmer'
    | 'Necromancer'
    | 'Ranger'
    | 'Revenant'
    | 'Thief'
    | 'Warrior'
  level: number
  guild?: string
  age: number
  last_modified: string
  created: string
  deaths: number
  title?: number
  backstory?: string[]
  build_tabs?: {
    tab: number
    is_active: boolean
    build: {
      name: string
      profession: string
      specializations: {
        id: number
        traits: number[]
      }[]
      skills: {
        heal: number
        utilities: number[]
        elite: number
      }
      aquatic_skills: {
        heal: number
        utilities: number[]
        elite: number
      }
      legends?: string[]
      aquatic_legends?: string[]
      pets?: {
        terrestrial: number[]
        aquatic: number[]
      }
    }
  }[]
  crafting?: {
    discipline:
      | 'Armorsmith'
      | 'Artificer'
      | 'Chef'
      | 'Huntsman'
      | 'Jeweler'
      | 'Leatherworker'
      | 'Scribe'
      | 'Tailor'
      | 'Weaponsmith'
    rating: number
    active: boolean
  }[]
  equipment?: GW2ApiResponseEquipmentItem[]
  equipment_pvp?: {
    amulet: number
    rune: number
    sigils: number[]
  }
  equipment_tabs?: {
    tab: number
    name: string
    is_active: boolean
    equipment: GW2ApiResponseEquipmentItem[]
    equipment_pvp: {
      amulet: number
      rune: number
      sigils: number[]
    }
  }[]
  bags?: GW2ApiResponseInventoryBag[]
  skills?: {
    pve: {
      heal: number
      utilities: number[]
      elite: number
      legends?: string[]
    }
    pvp: {
      heal: number
      utilities: number[]
      elite: number
      legends?: string[]
    }
    wvw: {
      heal: number
      utilities: number[]
      elite: number
      legends?: string[]
    }
  }
  specializations?: {
    pve: {
      id: number
      traits: number[]
    }[]
    pvp: {
      id: number
      traits: number[]
    }[]
    wvw: {
      id: number
      traits: number[]
    }[]
  }
  training?: {
    id: number
    spent: number
    done: boolean
  }[]
  wvw_abilities?: {
    id: number
    rank: number
  }[]
}

export type GW2ApiResponseInventoryItem = InventoryItem

export type GW2ApiResponseSharedInventoryItem = GW2ApiResponseInventoryItem

export interface GW2ApiResponseBankInventoryItem extends GW2ApiResponseInventoryItem {
  dyes?: number[]
  upgrade_slot_indices?: number[]
  bound_to?: string
  stats?: {
    id: number
    attributes: {
      AgonyResistance?: number
      BoonDuration?: number
      ConditionDamage?: number
      ConditionDuration?: number
      CritDamage?: number
      Healing?: number
      Power?: number
      Precision?: number
      Toughness?: number
      Vitality?: number
    }
  }
}

export interface GW2ApiResponseMaterialItem extends GW2ApiResponseInventoryItem {
  category: number
  binding?: 'Account'
}

export interface GW2ApiResponseEquipmentItem extends GW2ApiResponseInventoryItem {
  slot?: GW2ApiResponseEquipmentSlot
  location: 'Equipped' | 'Armory' | 'EquippedFromLegendaryArmory'
  tabs?: number[]
  charges?: number
  bound_to?: string
  dyes?: number[]
}
export type GW2ApiResponseLegendaryArmoryItem = GW2ApiResponseInventoryItem

export interface GW2ApiResponseBagInventoryItem extends GW2ApiResponseInventoryItem {
  id: number
  count: number
  charges?: number
  infusions?: number[]
  upgrades?: number[]
  skin?: number
  stats: {
    id: number
    attributes: {
      AgonyResistance?: number
      BoonDuration?: number
      ConditionDamage?: number
      ConditionDuration?: number
      CritDamage?: number
      Healing?: number
      Power?: number
      Precision?: number
      Toughness?: number
      Vitality?: number
    }
    dyes?: number[]
    binding?: 'Account' | 'Character'
    bound_to?: string
  }
}

export interface GW2ApiResponseInventoryBag {
  id: number
  size: number
  inventory: GW2ApiResponseBagInventoryItem[]
}

export type GW2ApiResponseAccountRaidId = string

export type GW2ApiResponseEquipmentSlot =
  | 'HelmAquatic'
  | 'Backpack'
  | 'Coat'
  | 'Boots'
  | 'Gloves'
  | 'Helm'
  | 'Leggings'
  | 'Shoulders'
  | 'Accessory1'
  | 'Accessory2'
  | 'Ring1'
  | 'Ring2'
  | 'Amulet'
  | 'WeaponAquaticA'
  | 'WeaponAquaticB'
  | 'WeaponA1'
  | 'WeaponA2'
  | 'WeaponB1'
  | 'WeaponB2'
  | 'Sickle'
  | 'Axe'
  | 'Pick'

export interface GW2ApiResponseSpecialization {
  id: number
  name: string
  profession: string
  elite: boolean
  icon: string
  background: string
  minor_traits: number[]
  major_traits: number[]
}
