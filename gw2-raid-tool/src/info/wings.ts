import { WingsRes } from '../raid-tool'

const wings: WingsRes = [
  {
    w: 1,
    id: 'spirit_vale',
    map_id: 1062,
    steps: [
      {
        id: 'vale_guardian',
        type: 'Boss',
        name_en: 'Vale Guardian',
        name_de: 'Tal-Wächter',
        name_fr: 'Gardien',
        triggerID: 15438,
        img: 'bosses/vg.png',
        hasCM: false
      },
      {
        id: 'spirit_woods',
        type: 'Checkpoint',
        name_en: 'Spirit Woods',
        name_de: 'Geisterlauf',
        name_fr: 'Bois des esprits',
        img: 'bosses/spirit-run.png',
        hasCM: false
      },
      {
        id: 'gorseval',
        type: 'Boss',
        name_en: 'Gorseval the Multifarious',
        name_de: 'Gorseval der Facettenreiche',
        name_fr: 'Gorseval',
        triggerID: 15429,
        img: 'bosses/gorse.png',
        hasCM: false
      },
      {
        id: 'sabetha',
        type: 'Boss',
        name_en: 'Sabetha the Saboteur',
        name_de: 'Sabetha die Saboteurin',
        name_fr: 'Sabetha',
        triggerID: 15375,
        img: 'bosses/sabetha.png',
        hasCM: false
      }
    ]
  },
  {
    w: 2,
    id: 'salvation_pass',
    map_id: 1149,
    steps: [
      {
        id: 'slothasor',
        type: 'Boss',
        name_en: 'Slothasor',
        name_de: 'Faultierion',
        name_fr: 'Paressor',
        triggerID: 16123,
        img: 'bosses/sloth.png',
        hasCM: false
      },
      {
        id: 'bandit_trio',
        type: 'Boss',
        name_en: 'Prison Camp',
        name_de: 'Banditen-Trio',
        name_fr: 'Bandit Trio',
        triggerID: 16088,
        img: 'bosses/trio.png',
        hasCM: false
      },
      {
        id: 'matthias',
        type: 'Boss',
        name_en: 'Matthias Gabrel',
        name_de: 'Matthias Gabrel',
        name_fr: 'Matthias',
        triggerID: 16115,
        img: 'bosses/matthi.png',
        hasCM: false
      }
    ]
  },
  {
    w: 3,
    id: 'stronghold_of_the_faithful',
    map_id: 1156,
    steps: [
      {
        id: 'escort',
        type: 'Boss',
        name_en: 'Siege the Stronghold',
        name_de: 'Belagert die Festung',
        name_fr: 'Escorte',
        img: 'bosses/escort.png',
        triggerID: 16253,
        hasCM: false
      },
      {
        id: 'keep_construct',
        type: 'Boss',
        name_en: 'Keep Construct',
        name_de: 'Festenkonstrukt',
        name_fr: 'Titan du fort',
        triggerID: 16235,
        img: 'bosses/kc.png',
        hasCM: true
      },
      {
        id: 'twisted_castle',
        type: 'Checkpoint',
        name_en: 'Twisted Castle',
        name_de: 'Verdrehtes Schloss',
        name_fr: 'Château corrompu',
        triggerID: 16247,
        img: 'bosses/tc.png',
        hasCM: false
      },
      {
        id: 'xera',
        type: 'Boss',
        name_en: 'Xera',
        name_de: 'Xera',
        name_fr: 'Xera',
        triggerID: 16246,
        img: 'bosses/xera.png',
        hasCM: false
      }
    ]
  },
  {
    w: 4,
    id: 'bastion_of_the_penitent',
    map_id: 1188,
    steps: [
      {
        id: 'cairn',
        type: 'Boss',
        name_en: 'Cairn the Indomitable',
        name_de: 'Cairn der Unbeugsame',
        name_fr: 'Cairn',
        triggerID: 17194,
        img: 'bosses/cairn.png',
        hasCM: true
      },
      {
        id: 'mursaat_overseer',
        type: 'Boss',
        name_en: 'Mursaat Overseer',
        name_de: 'Mursaat-Aufseher',
        name_fr: 'Surveillant mursaat',
        triggerID: 17172,
        img: 'bosses/mo.png',
        hasCM: true
      },
      {
        id: 'samarog',
        type: 'Boss',
        name_en: 'Samarog',
        name_de: 'Samarog',
        name_fr: 'Samarog',
        triggerID: 17188,
        img: 'bosses/sama.png',
        hasCM: true
      },
      {
        id: 'deimos',
        type: 'Boss',
        name_en: 'Deimos',
        name_de: 'Deimos',
        name_fr: 'Deimos',
        triggerID: 17154,
        img: 'bosses/deimos.png',
        hasCM: true
      }
    ]
  },
  {
    w: 5,
    id: 'hall_of_chains',
    map_id: 1264,
    steps: [
      {
        id: 'soulless_horror',
        type: 'Boss',
        name_en: 'Soulless Horror',
        name_de: 'Seelenloser Schrecken',
        name_fr: 'Horreur sans âme',
        triggerID: 19767,
        img: 'bosses/desmina.png',
        hasCM: true
      },
      {
        id: 'river_of_souls',
        type: 'Boss',
        name_en: 'River of Souls',
        name_de: 'Fluss der Seelen',
        name_fr: 'Rivière des âmes',
        triggerID: 19828,
        img: 'bosses/river.png',
        hasCM: false
      },
      {
        id: 'statues_of_grenth',
        type: 'Boss',
        name_en: 'Statues of Grenth',
        name_de: 'Statuen des Grenth',
        name_fr: 'Statues de Grenth',
        triggerID: [19691, 19536, 19651],
        img: 'bosses/statues.png',
        hasCM: false
      },
      {
        id: 'voice_in_the_void',
        type: 'Boss',
        name_en: 'Voice in the Void',
        name_de: 'Dhuum',
        name_fr: 'Dhuum',
        triggerID: 19450,
        img: 'bosses/dhuum.png',
        hasCM: true
      }
    ]
  },
  {
    w: 6,
    id: 'mythwright_gambit',
    map_id: 1303,
    steps: [
      {
        id: 'conjured_amalgamate',
        type: 'Boss',
        name_en: 'Conjured Amalgamate',
        name_de: 'Beschworene Verschmelzung',
        name_fr: 'Amalgame conjuré',
        triggerID: 43974,
        img: 'bosses/ca.png',
        hasCM: true
      },
      {
        id: 'twin_largos',
        type: 'Boss',
        name_en: 'Twin Largos',
        name_de: 'Zwillings-Largos',
        name_fr: 'Jumeaux largos',
        triggerID: 21105,
        img: 'bosses/twin-largos.png',
        hasCM: true
      },
      {
        id: 'qadim',
        type: 'Boss',
        name_en: 'Qadim',
        name_de: 'Qadim',
        name_fr: 'Qadim',
        triggerID: 20934,
        img: 'bosses/q1.png',
        hasCM: true
      }
    ]
  },
  {
    w: 7,
    id: 'the_key_of_ahdashim',
    map_id: 1323,
    steps: [
      {
        id: 'gate',
        type: 'Checkpoint',
        name_en: 'Gates of Ahdashim',
        name_de: 'Tore von Ahdashim',
        name_fr: 'Porte',
        img: 'bosses/gate.png',
        hasCM: false
      },
      {
        id: 'adina',
        type: 'Boss',
        name_en: 'Cardinal Adina',
        name_de: 'Kardinal Adina',
        name_fr: 'Adina',
        triggerID: 22006,
        img: 'bosses/adina.png',
        hasCM: true
      },
      {
        id: 'sabir',
        type: 'Boss',
        name_en: 'Cardinal Sabir',
        name_de: 'Kardinal Sabir',
        name_fr: 'Sabir',
        triggerID: 21964,
        img: 'bosses/sabir.png',
        hasCM: true
      },
      {
        id: 'qadim_the_peerless',
        type: 'Boss',
        name_en: 'Qadim the Peerless',
        name_de: 'Qadim der Unvergleichliche',
        name_fr: 'Qadim 2',
        triggerID: 22000,
        img: 'bosses/q2.png',
        hasCM: true
      }
    ]
  },
  {
    w: 8,
    id: 'mount_balrior',
    map_id: 1564,
    steps: [
      {
        id: 'greer',
        type: 'Boss',
        name_en: 'Greer the Blightbringer',
        name_de: 'Greer der Pestbringer',
        name_fr: 'Greer le Porteur de peste',
        triggerID: 26725,
        img: 'bosses/greer.png',
        hasCM: true
      },
      {
        id: 'decima',
        type: 'Boss',
        name_en: 'Decima, the Stormsinger',
        name_de: 'Decima, die Sturmsängerin',
        name_fr: 'Decima, la Chantelame',
        triggerID: 26774,
        img: 'bosses/decima.png',
        hasCM: true
      },
      {
        id: 'ura',
        type: 'Boss',
        name_en: 'Ura, the Steamshrieker',
        name_de: 'Ura, die Dampfschreierin',
        name_fr: 'Ura, la hurleuse de vapeur',
        triggerID: 26712,
        img: 'bosses/ura.png',
        hasCM: true
      }
    ],
    missingApi: true
  },
  {
    w: 'StrikeS1',
    w_img: 'Mastery_point_Central_Tyria.png',
    isStrike: true,
    isStrikeWeekly: true,
    name_en: 'Strike Mission: Season 1',
    name_de: 'Angriffsmission: Staffel 1',
    name_fr: "Mission d'attaque: Saison 1",
    id: 'strikes_core_s1',
    hasDailies: 5,
    steps: [
      {
        id: 'old_lions_court',
        type: 'Boss',
        name_en: "Old Lion's Court",
        name_de: 'Alter Löwenhof',
        name_fr: 'Cour du vieux lion',
        triggerID: [25413, 25414, 25415, 25416, 25419, 25423],
        img: 'bosses/olc.png',
        hasCM: true,
        dailyIndex: 0
      }
    ]
  },
  {
    w: 'StrikeIce',
    w_img: 'Mastery_point_Icebrood_Saga.png',
    isStrike: true,
    name_en: 'Strike Mission: The Icebrood Saga',
    name_de: 'Angriffsmission: Eisbrut-Saga',
    name_fr: "Mission d'attaque: L'Épopée du givre",
    id: 'strikes_icebrood_saga',
    hasDailies: 6,
    steps: [
      {
        id: 'shiverpeaks',
        type: 'Boss',
        name_en: 'Shiverpeaks Pass',
        name_de: 'Zittergipfel-Pass',
        name_fr: 'Col des Cimefroides',
        triggerID: 22154,
        img: 'bosses/ic.png',
        hasCM: false,
        dailyIndex: 3
      },
      {
        id: 'voice_and_claw',
        type: 'Boss',
        name_en: 'Voice and Claw of the Fallen',
        name_de: 'Stimme und Klaue der Gefallenen',
        name_fr: 'Voix et Griffe légendaires des déchus',
        triggerID: 22343,
        img: 'bosses/kodanbros.png',
        hasCM: false,
        dailyIndex: 4
      },
      {
        id: 'fraenir',
        type: 'Boss',
        name_en: 'Fraenir of Jormag',
        name_de: 'Fraenir Jormags',
        name_fr: 'Fraenir de Jormag',
        triggerID: 22492,
        img: 'bosses/fraenir.png',
        hasCM: false,
        dailyIndex: 2
      },
      {
        id: 'boneskinner',
        type: 'Boss',
        name_en: 'Boneskinner',
        name_de: 'Knochenhäuter',
        name_fr: 'Désosseur',
        triggerID: 22521,
        img: 'bosses/boneskinner.png',
        hasCM: false,
        kpName: 'boneSkinner',
        dailyIndex: 0
      },
      {
        id: 'whisper_of_jormag',
        type: 'Boss',
        name_en: 'Whisper of Jormag',
        name_de: 'Geflüster des Jormag',
        name_fr: 'Murmure de Jormag',
        triggerID: 22711,
        img: 'bosses/woj.png',
        hasCM: false,
        dailyIndex: 5
      }
    ]
  },
  {
    w: 'StrikeEoD',
    w_img: 'Mastery_point_End_of_Dragons.png',
    isStrike: true,
    isStrikeWeekly: true,
    name_en: 'Strike Mission: End of Dragons',
    name_de: 'Angriffsmission: End of Dragons',
    name_fr: "Mission d'attaque: End of Dragons",
    id: 'strikes_end_of_dragons',
    hasDailies: 5,
    steps: [
      {
        id: 'aetherblade_hideout',
        type: 'Boss',
        name_en: 'Aetherblade Hideout',
        name_de: 'Aetherblade Hideout',
        name_fr: 'Aetherblade Hideout',
        triggerID: 24033,
        img: 'bosses/aetherblade.png',
        hasCM: true,
        dailyIndex: 1
      },
      {
        id: 'xunlai_jade_junkyard',
        type: 'Boss',
        name_en: 'Xunlai Jade Junkyard',
        name_de: 'Xunlai Jade Junkyard',
        name_fr: 'Xunlai Jade Junkyard',
        triggerID: 23957,
        img: 'bosses/ankka.png',
        hasCM: true,
        dailyIndex: 2
      },
      {
        id: 'kaineng_overlook',
        type: 'Boss',
        name_en: 'Kaineng Overlook',
        name_de: 'Kaineng Overlook',
        name_fr: 'Kaineng Overlook',
        triggerID: [24485, 24266],
        img: 'bosses/ko.png',
        hasCM: true,
        dailyIndex: 3
      },
      {
        id: 'harvest_temple',
        type: 'Boss',
        name_en: 'Harvest Temple',
        name_de: 'Harvest Temple',
        name_fr: 'Harvest Temple',
        triggerID: [43488, 1378],
        img: 'bosses/ht.png',
        hasCM: true,
        dailyIndex: 4
      }
    ]
  },
  {
    w: 'StrikeSotO',
    w_img: 'Mastery_point_Secrets_of_the_Obscure.png',
    isStrike: true,
    isStrikeWeekly: true,
    name_en: 'Strike Mission: Secrets of the Obscure',
    name_de: 'Angriffsmission: Secrets of the Obscure',
    name_fr: "Mission d'attaque: Secrets of the Obscure",
    id: 'strikes_secrets_of_the_obscure',
    hasDailies: 2,
    steps: [
      {
        id: 'dagda',
        type: 'Boss',
        name_en: 'Strike Mission: Cosmic Observatory',
        name_de: 'Angriffsmission "Kosmisches Observatorium"',
        name_fr: "Mission d'attaque : Observatoire cosmique",
        triggerID: 25705,
        img: 'bosses/dagda.png',
        hasCM: true,
        dailyIndex: 1
      },
      {
        id: 'cerus',
        type: 'Boss',
        name_en: 'Strike Mission: Temple of Febe',
        name_de: 'Angriffsmission "Tempel von Febe"',
        name_fr: "Mission d'attaque : Temple de Febe",
        triggerID: 25989,
        img: 'bosses/cerus.png',
        hasCM: true,
        dailyIndex: 0
      }
    ]
  },
  {
    w: 'FractalCMs',
    w_img: 'Fraktal-Relikt_Icon.png',
    w_img_text: '95',
    isFractal: true,
    name_en: 'Fractals of the Mists CM',
    name_de: 'Fraktale der Nebel CM',
    name_fr: 'Fractales des Brumes CM',
    id: 'fractal_cms_kinfall',
    steps: [
      {
        id: 'kinfall_fractal_whispering_shadow',
        type: 'Boss',
        name_en: 'Kinfall Fractal: Whispering Shadow',
        name_de: 'Sippenfall-Fraktal: Flüsternder Schatten',
        name_fr: 'Fractales du Deuil du foyer: Ombre murmurante',
        triggerID: 27010,
        img: 'bosses/whispering-shadow.png',
        hasCM: true,
        dailyIndex: 0
      }
    ]
  },
  {
    w: 'FractalCMs',
    w_img: 'Fraktal-Relikt_Icon.png',
    w_img_text: '96',
    isFractal: true,
    name_en: 'Fractals of the Mists CM',
    name_de: 'Fraktale der Nebel CM',
    name_fr: 'Fractales des Brumes CM',
    id: 'fractal_cms_nightmare',
    steps: [
      {
        id: 'nightmare_fractal_mama',
        type: 'Boss',
        name_en: 'Nightmare Fractal: MAMA',
        name_de: 'Albtraum-Fraktal: MAMA',
        name_fr: 'Fractale des Cauchemars: MAMA',
        triggerID: 17021,
        img: 'bosses/mama.png',
        hasCM: true,
        dailyIndex: 0
      },
      {
        id: 'nightmare_fractal_siax',
        type: 'Boss',
        name_en: 'Nightmare Fractal: Siax',
        name_de: 'Albtraum-Fraktal: Siax',
        name_fr: 'Fractale des Cauchemars: Siax',
        triggerID: 17028,
        img: 'bosses/siax.png',
        hasCM: true,
        dailyIndex: 0
      },
      {
        id: 'nightmare_fractal_ensolyss',
        type: 'Boss',
        name_en: 'Nightmare Fractal: Ensolyss',
        name_de: 'Albtraum-Fraktal: Ensolyss',
        name_fr: 'Fractale des Cauchemars: Ensolyss',
        triggerID: 16948,
        img: 'bosses/ensolyss.png',
        hasCM: true,
        dailyIndex: 0
      }
    ]
  },
  {
    w: 'FractalCMs',
    w_img: 'Fraktal-Relikt_Icon.png',
    w_img_text: '97',
    isFractal: true,
    name_en: 'Fractals of the Mists CM',
    name_de: 'Fraktale der Nebel CM',
    name_fr: 'Fractales des Brumes CM',
    id: 'fractal_cms_shattered_observatory',
    steps: [
      {
        id: 'shattered_observatory_fractal_skorvald',
        type: 'Boss',
        name_en: 'Shattered Observatory Fractal: Skorvald',
        name_de: 'Fraktal Zerschmettertes Observatorium: Skorvald',
        name_fr: "Fractale de l'Observatoire détruit: Skorvald",
        triggerID: 17632,
        img: 'bosses/skorvald.png',
        hasCM: true,
        dailyIndex: 0
      },
      {
        id: 'shattered_observatory_fractal_artsariiv',
        type: 'Boss',
        name_en: 'Shattered Observatory Fractal: Artsariiv/Viirastra',
        name_de: 'Fraktal Zerschmettertes Observatorium: Artsariiv/Viirastra',
        name_fr: "Fractale de l'Observatoire détruit: Artsariiv/Viirastra",
        triggerID: 17949,
        img: 'bosses/artsariiv.png',
        hasCM: true,
        dailyIndex: 0
      },
      {
        id: 'shattered_observatory_fractal_arkk',
        type: 'Boss',
        name_en: 'Shattered Observatory Fractal: Arkk',
        name_de: 'Fraktal Zerschmettertes Observatorium: Arkk',
        name_fr: "Fractale de l'Observatoire détruit: Arkk",
        triggerID: 17759,
        img: 'bosses/arkk.png',
        hasCM: true,
        dailyIndex: 0
      }
    ]
  },
  {
    w: 'FractalCMs',
    w_img: 'Fraktal-Relikt_Icon.png',
    w_img_text: '98',
    isFractal: true,
    name_en: 'Fractals of the Mists CM',
    name_de: 'Fraktale der Nebel CM',
    name_fr: 'Fractales des Brumes CM',
    id: 'fractal_cms_sunqua_peak',
    steps: [
      {
        id: 'sunqua_peak_fractal',
        type: 'Boss',
        name_en: 'Sunqua Peak Fractal',
        name_de: 'Fraktal Sunqua-Gipfel',
        name_fr: 'Fractale du Pic de Sunqua',
        triggerID: 23254,
        img: 'bosses/ai.png',
        hasCM: true,
        dailyIndex: 0
      }
    ]
  },
  {
    w: 'FractalCMs',
    w_img: 'Fraktal-Relikt_Icon.png',
    w_img_text: '99',
    isFractal: true,
    name_en: 'Fractals of the Mists CM',
    name_de: 'Fraktale der Nebel CM',
    name_fr: 'Fractales des Brumes CM',
    id: 'fractal_cms_silent_surf',
    steps: [
      {
        id: 'silent_surf_fractal',
        type: 'Boss',
        name_en: 'Silent Surf Fractal',
        name_de: 'Fraktal "Stumme Brandung"',
        name_fr: 'Fractale du Ressac silencieux',
        triggerID: [25572, 25577],
        img: 'bosses/kanaxai.png',
        hasCM: true,
        dailyIndex: 0
      }
    ]
  },
  {
    w: 'FractalCMs',
    w_img: 'Fraktal-Relikt_Icon.png',
    w_img_text: '100',
    isFractal: true,
    name_en: 'Fractals of the Mists CM',
    name_de: 'Fraktale der Nebel CM',
    name_fr: 'Fractales des Brumes CM',
    id: 'fractal_cms_lonely_tower',
    steps: [
      {
        id: 'lonely_tower_fractal_deimos_cerus',
        type: 'Boss',
        name_en: 'Lonely Tower Fractal: Deimos & Cerus',
        name_de: 'Fraktal "Einsamer Turm": Deimos & Cerus',
        name_fr: 'Fractale de la Tour solitaire: Deimos & Cerus',
        img: 'bosses/cerus-deimos.png',
        hasCM: true,
        dailyIndex: 0
      },
      {
        id: 'lonely_tower_fractal_eparch',
        type: 'Boss',
        name_en: 'Lonely Tower Fractal: Eparch',
        name_de: 'Fraktal "Einsamer Turm": Eparch',
        name_fr: 'Fractale de la Tour solitaire: Eparch',
        triggerID: 26231,
        img: 'bosses/eparch.png',
        hasCM: true,
        dailyIndex: 0
      }
    ]
  }
]

export default wings

export const kittyGolemTriggerIds = [16199, 19645, 19676] as const
