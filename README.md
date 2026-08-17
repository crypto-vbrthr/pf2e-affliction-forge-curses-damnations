# PF2E Affliction Forge: Curses & Damnations

`Curses & Damnations` is an original, bilingual curse library for **PF2E Affliction Forge**.

## Version 0.1.0

- 32 original staged curses from level 0 to 20
- German and English localization
- Will- and Fortitude-based curse progressions using the PF2e level-based DC baseline
- short and long curse intervals, onsets, locked conditions, healing restrictions, speech suppression, concentrate-action gates, virulent progression, and a selected death effect
- standardized Affliction Forge semantic tags for Creature Forge matching
- undead, fey, fiend, spirit, aberration, celestial, elemental, construct, and humanoid curse sources
- read-only provider library exposed through the Affliction Forge public Library API

## Semantic Creature Forge contract

Every definition is tagged in its root `themes` array using the Affliction Forge 0.1.63 semantic contract, for example:

```text
creature:undead
habitat:underground
theme:curse
theme:necrotic
origin:undead
delivery:aura
```

Creature Forge and other consumers can use `api.libraries.search({ tags: ... })` or the public semantic scoring API without knowing anything about this module's internals.

## Curse design

The library intentionally mixes faster combat-adjacent curses with hours- and days-long supernatural afflictions. More tenacious entries use a **stubborn progression**: a normal success holds the current stage while a critical success reduces it. Selected stages lock `drained` or `doomed`, block speech, restrict healing, or require flat checks before concentrate actions. Those mechanics are expressed entirely through Affliction Forge schema v2, with no private runtime dependency.

## Content installation

On the first GM startup, this module provisions a managed **world Item compendium** named `world.affliction-forge-curses-damnations`, writes the current content into it, and registers that pack as a read-only Affliction Forge provider library.

The managed content is synchronized to the module version when a GM starts the world. Copies made into the normal Affliction Forge world library remain independent and editable.

## Requirements

- Foundry VTT 14
- PF2e 8.1.2+
- PF2E Affliction Forge 0.1.63+
- Critical Forge as required by Affliction Forge

## Content notice

All curse names, descriptions, and game content in this library are original homebrew content created for this module. They are not reproductions of published Paizo curse entries.

## Development tests

`npm test` resolves the required Affliction Forge contract from a sibling module whose `module.json` id is `pf2e-affliction-forge`. For non-standard development layouts, set `PF2E_AFFLICTION_FORGE_PATH` to the Affliction Forge module directory before running the tests. No release test contains build-machine absolute paths.
