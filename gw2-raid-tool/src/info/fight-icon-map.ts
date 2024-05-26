import wings from './wings'

const fightIconMap: Record<number, string> = {
  // Golems
  16199: '/img/Mini_Professor_Miau_Icon.png',
  19645: '/img/Mini_Mister_Mittens.png',
  19676: '/img/Mini_Baron_von_Scrufflebutt.png',
  // WvW
  1: '/img/WvW_Menu_Bar_icon.png'
}

function ensureArray<T>(value: undefined | T | T[]): T[] {
  if (typeof value === 'undefined') return []
  return Array.isArray(value) ? value : [value]
}

for (const wing of wings) {
  for (const step of wing.steps) {
    for (const triggerId of ensureArray(step.triggerID)) {
      if (!fightIconMap[triggerId] && step.img) {
        fightIconMap[triggerId] = '/img/' + step.img
      }
    }
  }
}

export default fightIconMap
