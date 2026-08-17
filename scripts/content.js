const MODULE_ID = "pf2e-affliction-forge-curses-damnations";
const CONTENT_VERSION = "0.1.0";
const I18N_PREFIX = "PF2E_AFFLICTION_CD.Content";

const token = (slug, key) => `@i18n:${I18N_PREFIX}.${slug}.${key}`;
const restrictions = ({ locks = [], healing = "none", damageTypes = [], blocked = [] } = {}) => ({ conditionLocks: locks.map(([slug, minimum]) => ({ slug, minimum })), healing, unhealableDamageTypes: [...damageTypes], blockedCapabilities: [...blocked] });
const duration = ([value, unit]) => ({ value, unit });
const condition = (slug, value = null) => value == null ? { type: "condition", slug } : { type: "condition", slug, value };
const damage = (formula, damageType, persistent = false) => ({ type: "damage", formula, damageType, ...(persistent ? { persistent: true } : {}) });
const death = (category = "death-effect") => ({ type: "death", category });

function effect(slug, stageNumber, components, nameKey = null) {
  if (!components.length) return null;
  return { schemaVersion: 2, id: `${MODULE_ID}.${slug}.stage-${stageNumber}`, name: token(slug, nameKey ?? `Stage${stageNumber}.Name`), duration: { value: -1, unit: "unlimited", expiry: null }, components, application: {}, metadata: { originModule: MODULE_ID, originFeature: "curses-damnations-stage" } };
}

function componentFromSpec(entry) {
  if (entry[0] === "condition") return condition(entry[1], entry[2]);
  if (entry[0] === "damage") return damage(entry[1], entry[2], false);
  if (entry[0] === "damagePersistent") return damage(entry[1], entry[2], true);
  if (entry[0] === "death") return death(entry[1]);
  throw new Error(`Unsupported Curses & Damnations component type: ${entry[0]}`);
}

function makeStage(slug, stageNumber, stageSpec) {
  const [durationSpec, componentSpecs, options = {}] = stageSpec;
  const components = componentSpecs.map(componentFromSpec);
  const stageRestrictions = restrictions({
    locks: options.locks ?? [],
    healing: options.healing ?? "none",
    blocked: options.blockSpeak ? ["speak"] : []
  });
  const preActionGates = options.gate ? [{
    id: `${slug}.stage-${stageNumber}.gate`,
    label: token(slug, `Stage${stageNumber}.Gate`),
    trigger: { actionKinds: ["spell-cast", "item-activation"], requiredTraits: ["concentrate"] },
    check: { kind: "flat", dc: options.gate },
    blockOnFailure: true
  }] : [];
  return {
    id: `stage-${stageNumber}`,
    number: stageNumber,
    name: token(slug, `Stage${stageNumber}.Name`),
    description: token(slug, `Stage${stageNumber}.Description`),
    duration: duration(durationSpec),
    expiryAction: options.expiry ?? "check",
    check: null,
    restrictions: stageRestrictions,
    effectPersistence: "stage",
    effectPersistenceDuration: null,
    effectComponentPersistence: [],
    effectComponentPersistenceDurations: [],
    effect: effect(slug, stageNumber, components),
    numericModifiers: [],
    periodicEffects: [],
    preActionGates,
    reactions: []
  };
}

function makeDefinition(spec) {
  const themes = Object.entries(spec.tags).flatMap(([namespace, values]) => values.map((value) => `${namespace}:${value}`));
  const normalProgression = {
    criticalSuccess: { action: "stage-delta", delta: -2 },
    success: { action: "stage-delta", delta: -1 },
    failure: { action: "stage-delta", delta: 1 },
    criticalFailure: { action: "stage-delta", delta: 2 }
  };
  const stubbornProgression = {
    criticalSuccess: { action: "stage-delta", delta: -1 },
    success: { action: "stay" },
    failure: { action: "stage-delta", delta: 1 },
    criticalFailure: { action: "stage-delta", delta: 2 }
  };
  return {
    schemaVersion: 2,
    id: `${MODULE_ID}.${spec.slug}`,
    name: token(spec.slug, "Name"),
    description: token(spec.slug, "Description"),
    img: "icons/svg/biohazard.svg",
    afflictionType: "curse",
    level: spec.level,
    rarity: spec.rarity,
    traits: spec.virulent === true ? ["curse", "virulent"] : ["curse"],
    themes,
    saveDefaults: { execution: "player", visibility: "public" },
    identification: { initialState: spec.identification ?? "identified" },
    delivery: { injuryPoison: false },
    multipleExposure: "default",
    restrictions: restrictions({ locks: spec.locks ?? [], healing: spec.rootHealing ?? "none" }),
    checks: [{ id: "primary", label: token(spec.slug, "SaveLabel"), kind: "save", statistic: spec.stat, dcMode: "fixed", dc: spec.dc, policy: null }],
    initialCheck: { checkIds: ["primary"], combine: "single", outcomes: { criticalSuccess: { action: "reject" }, success: { action: "reject" }, failure: { action: "set-stage", stage: 1 }, criticalFailure: { action: "set-stage", stage: 2 } } },
    onset: spec.onset ? duration(spec.onset) : null,
    maximumDuration: spec.maxDuration ? duration(spec.maxDuration) : null,
    defaultStageCheck: { checkIds: ["primary"], combine: "single", outcomes: spec.stubborn ? stubbornProgression : normalProgression },
    progression: { belowStageOne: "recover", aboveMaximumStage: "clamp", virulent: spec.virulent === true },
    stages: spec.stages.map((stage, index) => makeStage(spec.slug, index + 1, stage)),
    metadata: { originModule: MODULE_ID, originFeature: "curses-damnations-library", contentVersion: CONTENT_VERSION, contentLicense: "original-homebrew", creatureForgeReady: true }
  };
}

const SPECS = [
  {
    "slug": "candle-shadow-jinx",
    "level": 0,
    "dc": 14,
    "rarity": "common",
    "stat": "will",
    "tags": {
      "creature": [
        "fey",
        "spirit"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "curse",
        "shadow"
      ],
      "origin": [
        "occult"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "dazzled"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "dazzled"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      8,
      "hours"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "crooked-luck-hex",
    "level": 0,
    "dc": 14,
    "rarity": "common",
    "stat": "will",
    "tags": {
      "creature": [
        "humanoid",
        "fey"
      ],
      "habitat": [
        "urban",
        "plains"
      ],
      "theme": [
        "curse",
        "mental"
      ],
      "origin": [
        "magical"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ],
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      8,
      "hours"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "grave-whisper",
    "level": 1,
    "dc": 15,
    "rarity": "uncommon",
    "stat": "will",
    "tags": {
      "creature": [
        "undead",
        "spirit"
      ],
      "habitat": [
        "underground",
        "urban"
      ],
      "theme": [
        "curse",
        "necrotic"
      ],
      "origin": [
        "undead"
      ],
      "delivery": [
        "aura"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "1d4",
            "void"
          ],
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "1d6",
            "void"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      12,
      "hours"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "thorn-oath",
    "level": 1,
    "dc": 15,
    "rarity": "uncommon",
    "stat": "will",
    "tags": {
      "creature": [
        "fey",
        "plant"
      ],
      "habitat": [
        "forest"
      ],
      "theme": [
        "curse",
        "blood"
      ],
      "origin": [
        "primal"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damagePersistent",
            "1",
            "bleed"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damagePersistent",
            "1d4",
            "bleed"
          ],
          [
            "condition",
            "enfeebled",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      1,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "mirrors-spite",
    "level": 2,
    "dc": 16,
    "rarity": "uncommon",
    "stat": "will",
    "tags": {
      "creature": [
        "spirit",
        "humanoid"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "curse",
        "mental"
      ],
      "origin": [
        "occult"
      ],
      "delivery": [
        "contact"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "dazzled"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "dazzled"
          ],
          [
            "condition",
            "stupefied",
            1
          ],
          [
            "damage",
            "1d6",
            "mental"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "blinded"
          ],
          [
            "condition",
            "stupefied",
            1
          ],
          [
            "damage",
            "1d6",
            "mental"
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      1,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "moonless-mark",
    "level": 2,
    "dc": 16,
    "rarity": "uncommon",
    "stat": "will",
    "tags": {
      "creature": [
        "fey",
        "spirit"
      ],
      "habitat": [
        "forest",
        "urban"
      ],
      "theme": [
        "curse",
        "shadow"
      ],
      "origin": [
        "magical"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "frightened",
            1
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "frightened",
            2
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": [
      10,
      "minutes"
    ],
    "maxDuration": [
      2,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "hollow-name",
    "level": 3,
    "dc": 18,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "aberration",
        "spirit"
      ],
      "habitat": [
        "planar",
        "underground"
      ],
      "theme": [
        "curse",
        "mental"
      ],
      "origin": [
        "occult"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {
          "blockSpeak": true
        }
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "stupefied",
            2
          ]
        ],
        {
          "blockSpeak": true
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      2,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "feystep-snare",
    "level": 3,
    "dc": 18,
    "rarity": "uncommon",
    "stat": "will",
    "tags": {
      "creature": [
        "fey"
      ],
      "habitat": [
        "forest",
        "swamp"
      ],
      "theme": [
        "curse",
        "dream"
      ],
      "origin": [
        "primal"
      ],
      "delivery": [
        "aura"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            1
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      12,
      "hours"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "ashen-vow",
    "level": 4,
    "dc": 19,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "fiend",
        "humanoid"
      ],
      "habitat": [
        "volcanic",
        "urban"
      ],
      "theme": [
        "curse",
        "corruption"
      ],
      "origin": [
        "divine"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "enfeebled",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "enfeebled",
            1
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {
          "healing": "affliction-damage"
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "enfeebled",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {
          "healing": "all"
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "carrion-bell-curse",
    "level": 4,
    "dc": 19,
    "rarity": "uncommon",
    "stat": "will",
    "tags": {
      "creature": [
        "undead",
        "spirit"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "curse",
        "necrotic"
      ],
      "origin": [
        "undead"
      ],
      "delivery": [
        "aura"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "1d6",
            "spirit"
          ],
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "spirit"
          ],
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "void"
          ],
          [
            "condition",
            "frightened",
            2
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      1,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "blood-debt",
    "level": 5,
    "dc": 20,
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "fiend",
        "humanoid"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "curse",
        "blood"
      ],
      "origin": [
        "occult"
      ],
      "delivery": [
        "injury"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "drained",
            1
          ]
        ],
        {
          "locks": [
            [
              "drained",
              1
            ]
          ]
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "void"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {
          "locks": [
            [
              "drained",
              1
            ]
          ]
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "void"
          ],
          [
            "condition",
            "drained",
            2
          ]
        ],
        {
          "locks": [
            [
              "drained",
              2
            ]
          ]
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "sleepless-lantern",
    "level": 5,
    "dc": 20,
    "rarity": "uncommon",
    "stat": "will",
    "tags": {
      "creature": [
        "spirit",
        "fey"
      ],
      "habitat": [
        "urban",
        "forest"
      ],
      "theme": [
        "curse",
        "dream"
      ],
      "origin": [
        "occult"
      ],
      "delivery": [
        "contact"
      ]
    },
    "stages": [
      [
        [
          8,
          "hours"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          8,
          "hours"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          8,
          "hours"
        ],
        [
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "wolf-moon-oath",
    "level": 6,
    "dc": 22,
    "rarity": "uncommon",
    "stat": "will",
    "tags": {
      "creature": [
        "beast",
        "fey"
      ],
      "family": [
        "canine"
      ],
      "habitat": [
        "forest",
        "mountain"
      ],
      "theme": [
        "curse",
        "mutation"
      ],
      "origin": [
        "primal"
      ],
      "delivery": [
        "bite"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            1
          ],
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "enfeebled",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "drowned-breath",
    "level": 6,
    "dc": 22,
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "undead",
        "spirit"
      ],
      "habitat": [
        "aquatic",
        "coastal"
      ],
      "theme": [
        "curse",
        "necrotic"
      ],
      "origin": [
        "undead"
      ],
      "delivery": [
        "aura"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "void"
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "void"
          ],
          [
            "condition",
            "sickened",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      1,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "black-feather-omen",
    "level": 7,
    "dc": 23,
    "rarity": "uncommon",
    "stat": "will",
    "tags": {
      "creature": [
        "fey",
        "spirit"
      ],
      "family": [
        "bird"
      ],
      "habitat": [
        "forest",
        "urban"
      ],
      "theme": [
        "curse",
        "shadow"
      ],
      "origin": [
        "occult"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "frightened",
            1
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "mental"
          ],
          [
            "condition",
            "frightened",
            1
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "mental"
          ],
          [
            "condition",
            "frightened",
            2
          ],
          [
            "condition",
            "stupefied",
            2
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "puppets-thread",
    "level": 7,
    "dc": 23,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "aberration",
        "fey"
      ],
      "habitat": [
        "urban",
        "planar"
      ],
      "theme": [
        "curse",
        "mental"
      ],
      "origin": [
        "occult"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            1
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "condition",
            "confused"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      1,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "graveglass-gaze",
    "level": 8,
    "dc": 24,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "undead",
        "spirit"
      ],
      "habitat": [
        "underground"
      ],
      "theme": [
        "curse",
        "shadow"
      ],
      "origin": [
        "undead"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "dazzled"
          ],
          [
            "damage",
            "2d6",
            "void"
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "blinded"
          ],
          [
            "damage",
            "3d6",
            "void"
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "blinded"
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "damage",
            "4d6",
            "void"
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      2,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "ember-brand",
    "level": 8,
    "dc": 24,
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "elemental",
        "fiend"
      ],
      "habitat": [
        "volcanic"
      ],
      "theme": [
        "curse",
        "elemental"
      ],
      "origin": [
        "planar"
      ],
      "delivery": [
        "contact"
      ]
    },
    "stages": [
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "fire"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "fire"
          ],
          [
            "condition",
            "enfeebled",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "fire"
          ],
          [
            "condition",
            "enfeebled",
            2
          ]
        ],
        {}
      ]
    ],
    "onset": [
      1,
      "minutes"
    ],
    "maxDuration": [
      1,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "thorn-crown",
    "level": 9,
    "dc": 26,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "fey",
        "plant"
      ],
      "habitat": [
        "forest"
      ],
      "theme": [
        "curse",
        "blood"
      ],
      "origin": [
        "primal"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damagePersistent",
            "1d6",
            "bleed"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damagePersistent",
            "2d6",
            "bleed"
          ],
          [
            "condition",
            "stupefied",
            1
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damagePersistent",
            "2d6",
            "bleed"
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "sickened",
            2
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "dream-eaters-kiss",
    "level": 9,
    "dc": 26,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "aberration",
        "fey"
      ],
      "habitat": [
        "planar",
        "urban"
      ],
      "theme": [
        "curse",
        "dream"
      ],
      "origin": [
        "occult"
      ],
      "delivery": [
        "contact"
      ]
    },
    "stages": [
      [
        [
          8,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          8,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          8,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "drained",
            2
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      4,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "hollow-saints-rebuke",
    "level": 10,
    "dc": 27,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "celestial",
        "spirit"
      ],
      "habitat": [
        "urban",
        "planar"
      ],
      "theme": [
        "curse",
        "mental"
      ],
      "origin": [
        "divine"
      ],
      "delivery": [
        "aura"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "spirit"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "spirit"
          ],
          [
            "condition",
            "stupefied",
            2
          ]
        ],
        {
          "gate": 5
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "spirit"
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "gate": 7
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "iron-promise",
    "level": 10,
    "dc": 27,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "fiend",
        "humanoid"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "curse",
        "corruption"
      ],
      "origin": [
        "divine"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          12,
          "hours"
        ],
        [
          [
            "condition",
            "enfeebled",
            1
          ]
        ],
        {}
      ],
      [
        [
          12,
          "hours"
        ],
        [
          [
            "condition",
            "enfeebled",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {
          "locks": [
            [
              "drained",
              1
            ]
          ]
        }
      ],
      [
        [
          12,
          "hours"
        ],
        [
          [
            "condition",
            "enfeebled",
            2
          ],
          [
            "condition",
            "drained",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "locks": [
            [
              "drained",
              2
            ]
          ]
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      5,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "shadow-twin",
    "level": 11,
    "dc": 28,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "spirit",
        "aberration"
      ],
      "habitat": [
        "planar",
        "urban"
      ],
      "theme": [
        "curse",
        "shadow"
      ],
      "origin": [
        "occult"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "mental"
          ],
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "mental"
          ],
          [
            "condition",
            "frightened",
            2
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "mental"
          ],
          [
            "condition",
            "confused"
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      2,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "starless-benediction",
    "level": 12,
    "dc": 30,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "fiend",
        "aberration"
      ],
      "habitat": [
        "planar"
      ],
      "theme": [
        "curse",
        "corruption"
      ],
      "origin": [
        "planar"
      ],
      "delivery": [
        "aura"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "void"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "void"
          ],
          [
            "condition",
            "stupefied",
            2
          ]
        ],
        {
          "gate": 7
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "6d6",
            "void"
          ],
          [
            "condition",
            "stupefied",
            3
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "gate": 9
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "fiends-tithe",
    "level": 13,
    "dc": 31,
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "fiend"
      ],
      "habitat": [
        "planar"
      ],
      "theme": [
        "curse",
        "blood",
        "corruption"
      ],
      "origin": [
        "planar"
      ],
      "delivery": [
        "claw",
        "ability"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "void"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {
          "locks": [
            [
              "drained",
              1
            ]
          ]
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "6d6",
            "void"
          ],
          [
            "condition",
            "drained",
            2
          ]
        ],
        {
          "locks": [
            [
              "drained",
              2
            ]
          ]
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "8d6",
            "void"
          ],
          [
            "condition",
            "drained",
            2
          ],
          [
            "condition",
            "doomed",
            1
          ]
        ],
        {
          "locks": [
            [
              "drained",
              2
            ],
            [
              "doomed",
              1
            ]
          ]
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      4,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "ancestors-wrath",
    "level": 14,
    "dc": 32,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "spirit",
        "undead"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "curse",
        "mental"
      ],
      "origin": [
        "divine",
        "undead"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          12,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "spirit"
          ],
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ],
      [
        [
          12,
          "hours"
        ],
        [
          [
            "damage",
            "7d6",
            "spirit"
          ],
          [
            "condition",
            "frightened",
            2
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          12,
          "hours"
        ],
        [
          [
            "damage",
            "9d6",
            "spirit"
          ],
          [
            "condition",
            "frightened",
            2
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "doomed",
            1
          ]
        ],
        {
          "locks": [
            [
              "doomed",
              1
            ]
          ]
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "pale-kings-decree",
    "level": 15,
    "dc": 34,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "undead"
      ],
      "habitat": [
        "underground",
        "urban"
      ],
      "theme": [
        "curse",
        "necrotic"
      ],
      "origin": [
        "undead"
      ],
      "delivery": [
        "aura"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "void"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "7d6",
            "void"
          ],
          [
            "condition",
            "drained",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "locks": [
            [
              "drained",
              1
            ]
          ]
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "9d6",
            "void"
          ],
          [
            "condition",
            "drained",
            2
          ],
          [
            "condition",
            "slowed",
            2
          ],
          [
            "condition",
            "doomed",
            1
          ]
        ],
        {
          "locks": [
            [
              "drained",
              2
            ],
            [
              "doomed",
              1
            ]
          ]
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      4,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "worldscar-curse",
    "level": 16,
    "dc": 35,
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "aberration",
        "elemental"
      ],
      "habitat": [
        "planar",
        "volcanic"
      ],
      "theme": [
        "curse",
        "mutation",
        "corruption"
      ],
      "origin": [
        "planar"
      ],
      "delivery": [
        "contact",
        "aura"
      ]
    },
    "stages": [
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "6d6",
            "spirit"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "8d6",
            "spirit"
          ],
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "enfeebled",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "10d6",
            "spirit"
          ],
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "enfeebled",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "eclipse-brand",
    "level": 17,
    "dc": 36,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "fiend",
        "spirit"
      ],
      "habitat": [
        "planar"
      ],
      "theme": [
        "curse",
        "shadow"
      ],
      "origin": [
        "divine",
        "planar"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "6d6",
            "void"
          ],
          [
            "damage",
            "3d6",
            "mental"
          ],
          [
            "condition",
            "dazzled"
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "8d6",
            "void"
          ],
          [
            "damage",
            "4d6",
            "mental"
          ],
          [
            "condition",
            "blinded"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "10d6",
            "void"
          ],
          [
            "damage",
            "5d6",
            "mental"
          ],
          [
            "condition",
            "blinded"
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "doomed",
            1
          ]
        ],
        {
          "locks": [
            [
              "doomed",
              1
            ]
          ]
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      4,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "doomclock",
    "level": 18,
    "dc": 38,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "construct",
        "spirit"
      ],
      "habitat": [
        "urban",
        "planar"
      ],
      "theme": [
        "curse",
        "mental"
      ],
      "origin": [
        "arcane",
        "occult"
      ],
      "delivery": [
        "contact"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "doomed",
            1
          ]
        ],
        {
          "locks": [
            [
              "doomed",
              1
            ]
          ]
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "6d6",
            "mental"
          ],
          [
            "condition",
            "doomed",
            1
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "locks": [
            [
              "doomed",
              1
            ]
          ]
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "8d6",
            "mental"
          ],
          [
            "condition",
            "doomed",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "locks": [
            [
              "doomed",
              2
            ]
          ]
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "10d6",
            "mental"
          ],
          [
            "condition",
            "doomed",
            3
          ],
          [
            "condition",
            "slowed",
            2
          ]
        ],
        {
          "locks": [
            [
              "doomed",
              3
            ]
          ]
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      5,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "throne-of-ash",
    "level": 19,
    "dc": 39,
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "fiend",
        "undead"
      ],
      "habitat": [
        "volcanic",
        "planar"
      ],
      "theme": [
        "curse",
        "corruption",
        "necrotic"
      ],
      "origin": [
        "divine",
        "undead"
      ],
      "delivery": [
        "aura"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "7d6",
            "fire"
          ],
          [
            "damage",
            "5d6",
            "void"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "9d6",
            "fire"
          ],
          [
            "damage",
            "6d6",
            "void"
          ],
          [
            "condition",
            "drained",
            2
          ],
          [
            "condition",
            "frightened",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "11d6",
            "fire"
          ],
          [
            "damage",
            "7d6",
            "void"
          ],
          [
            "condition",
            "drained",
            2
          ],
          [
            "condition",
            "frightened",
            2
          ],
          [
            "condition",
            "doomed",
            1
          ]
        ],
        {
          "locks": [
            [
              "doomed",
              1
            ]
          ]
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      4,
      "days"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  },
  {
    "slug": "last-name-unwritten",
    "level": 20,
    "dc": 40,
    "rarity": "unique",
    "stat": "will",
    "tags": {
      "creature": [
        "aberration",
        "spirit"
      ],
      "habitat": [
        "planar"
      ],
      "theme": [
        "curse",
        "mental",
        "corruption"
      ],
      "origin": [
        "occult",
        "planar"
      ],
      "delivery": [
        "ability"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "8d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            2
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "10d6",
            "mental"
          ],
          [
            "damage",
            "6d6",
            "void"
          ],
          [
            "condition",
            "stupefied",
            3
          ]
        ],
        {
          "blockSpeak": true
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "12d6",
            "mental"
          ],
          [
            "damage",
            "8d6",
            "void"
          ],
          [
            "condition",
            "stupefied",
            3
          ],
          [
            "condition",
            "doomed",
            2
          ]
        ],
        {
          "blockSpeak": true,
          "locks": [
            [
              "doomed",
              2
            ]
          ]
        }
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "14d6",
            "mental"
          ],
          [
            "damage",
            "10d6",
            "void"
          ],
          [
            "death",
            "death-effect"
          ]
        ],
        {
          "blockSpeak": true
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      4,
      "days"
    ],
    "stubborn": true,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none"
  }
];

export const CURSES_DAMNATIONS_MODULE_ID = MODULE_ID;
export const CURSES_DAMNATIONS_CONTENT_VERSION = CONTENT_VERSION;
export const CURSES_DAMNATIONS_DEFINITIONS = Object.freeze(SPECS.map(makeDefinition));
export function createCursesDamnationsDefinitions() {
  return CURSES_DAMNATIONS_DEFINITIONS.map((definition) => structuredClone(definition));
}
