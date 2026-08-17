import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CURSES_DAMNATIONS_DEFINITIONS, createCursesDamnationsDefinitions } from "../scripts/content.js";
import { loadAfflictionForgeContract } from "./support/core-contract-loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const { normalizeAfflictionDefinition, validateAfflictionDefinition, AFFLICTION_SEMANTIC_TAG_VOCABULARY, parseSemanticTag } = await loadAfflictionForgeContract(root);
const locales = Object.fromEntries(["de", "en"].map((lang) => [lang, JSON.parse(fs.readFileSync(path.join(root, "lang", `${lang}.json`), "utf8"))]));
const dcByLevel = new Map([[0,14],[1,15],[2,16],[3,18],[4,19],[5,20],[6,22],[7,23],[8,24],[9,26],[10,27],[11,28],[12,30],[13,31],[14,32],[15,34],[16,35],[17,36],[18,38],[19,39],[20,40],[21,42],[22,44],[23,46],[24,48],[25,50]]);

function resolveLocale(rootObject, token) { assert.ok(token.startsWith("@i18n:")); return token.slice(6).split(".").reduce((value, part) => value?.[part], rootObject); }
function collectI18nTokens(value, output = []) { if (typeof value === "string" && value.startsWith("@i18n:")) output.push(value); else if (Array.isArray(value)) value.forEach((entry) => collectI18nTokens(entry, output)); else if (value && typeof value === "object") Object.values(value).forEach((entry) => collectI18nTokens(entry, output)); return output; }
function allStages() { return CURSES_DAMNATIONS_DEFINITIONS.flatMap((definition) => definition.stages); }

 test("0.1.0 ships 32 original curse definitions", () => {
  assert.equal(CURSES_DAMNATIONS_DEFINITIONS.length, 32);
  assert.ok(CURSES_DAMNATIONS_DEFINITIONS.every((definition) => definition.afflictionType === "curse"));
  assert.ok(CURSES_DAMNATIONS_DEFINITIONS.every((definition) => definition.delivery?.injuryPoison === false));
});

test("every definition validates against Affliction Forge schema v2", () => {
  const effectValidator = () => ({ valid: true, issues: [] });
  for (const source of CURSES_DAMNATIONS_DEFINITIONS) {
    const definition = normalizeAfflictionDefinition(source);
    const report = validateAfflictionDefinition(definition, { effectValidator });
    assert.equal(report.valid, true, `${definition.id}: ${report.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")}`);
  }
});

test("all curse identities and stage identities are unique", () => {
  const ids = new Set();
  for (const definition of CURSES_DAMNATIONS_DEFINITIONS) {
    assert.ok(!ids.has(definition.id), `Duplicate definition id ${definition.id}`); ids.add(definition.id);
    const stageIds = new Set();
    for (const stage of definition.stages) { assert.ok(!stageIds.has(stage.id), `Duplicate stage id ${definition.id}/${stage.id}`); stageIds.add(stage.id); }
  }
});

test("all curses use the GM Core level-based DC baseline", () => {
  for (const definition of CURSES_DAMNATIONS_DEFINITIONS) assert.equal(definition.checks[0].dc, dcByLevel.get(definition.level), `${definition.id} has unexpected DC`);
});

test("semantic tags are canonical, in-contract, and useful for Creature Forge", () => {
  const creatureValues = new Set(); const originValues = new Set(); const deliveryValues = new Set();
  for (const definition of CURSES_DAMNATIONS_DEFINITIONS) {
    const namespaces = new Set(); assert.ok(definition.themes.includes("theme:curse"), `${definition.id} lacks theme:curse`);
    for (const tag of definition.themes) {
      const parsed = parseSemanticTag(tag); assert.ok(parsed, `${definition.id} has non-semantic theme ${tag}`); assert.equal(parsed.canonical, true, `${definition.id} has non-canonical semantic tag ${tag}`);
      assert.ok(AFFLICTION_SEMANTIC_TAG_VOCABULARY[parsed.namespace].includes(parsed.value), `${definition.id} uses unknown tag ${tag}`); namespaces.add(parsed.namespace);
      if (parsed.namespace === "creature") creatureValues.add(parsed.value); if (parsed.namespace === "origin") originValues.add(parsed.value); if (parsed.namespace === "delivery") deliveryValues.add(parsed.value);
    }
    assert.ok(namespaces.has("creature"), `${definition.id} lacks creature tags`); assert.ok(namespaces.has("theme"), `${definition.id} lacks theme tags`); assert.ok(namespaces.has("origin"), `${definition.id} lacks origin tags`); assert.ok(namespaces.has("delivery"), `${definition.id} lacks delivery tags`);
  }
  assert.ok(creatureValues.size >= 8, "Expected broad creature-source coverage"); assert.ok(originValues.size >= 7, "Expected broad magical-origin coverage"); assert.ok(deliveryValues.size >= 6, "Expected broad curse-delivery coverage");
});

test("curse library exercises advanced Affliction Forge mechanics", () => {
  const stages = allStages();
  assert.ok(stages.some((stage) => stage.restrictions?.conditionLocks?.length), "Expected locked curse conditions");
  assert.ok(stages.some((stage) => stage.restrictions?.healing !== "none"), "Expected curse healing restrictions");
  assert.ok(stages.some((stage) => stage.restrictions?.blockedCapabilities?.includes("speak")), "Expected speech suppression");
  assert.ok(stages.some((stage) => stage.preActionGates?.length), "Expected concentrate-action curse gates");
  assert.ok(CURSES_DAMNATIONS_DEFINITIONS.some((definition) => definition.progression?.virulent), "Expected at least one virulent curse");
  assert.ok(stages.some((stage) => stage.effect?.components?.some((component) => component.type === "death")), "Expected a high-level death effect");
  for (const stage of stages) for (const component of stage.effect?.components ?? []) if (component.type === "death") assert.ok(["direct", "death-effect"].includes(component.category), `Unsupported death category ${component.category}`);
  assert.ok(CURSES_DAMNATIONS_DEFINITIONS.some((definition) => definition.defaultStageCheck?.outcomes?.success?.action === "stay"), "Expected stubborn curse progression");
});

test("all i18n content tokens resolve in German and English", () => {
  const tokens = [...new Set(CURSES_DAMNATIONS_DEFINITIONS.flatMap((definition) => collectI18nTokens(definition)))]; assert.ok(tokens.length > 120, "Expected a substantial localized content set");
  for (const token of tokens) for (const lang of ["de", "en"]) { const value = resolveLocale(locales[lang], token); assert.equal(typeof value, "string", `${lang} missing ${token}`); assert.ok(value.trim(), `${lang} has blank ${token}`); }
});

test("definition factory returns independent clones", () => { const a = createCursesDamnationsDefinitions(); const b = createCursesDamnationsDefinitions(); assert.notEqual(a[0], b[0]); a[0].name = "mutated"; assert.notEqual(b[0].name, "mutated"); });

test("release tests contain no build-machine absolute imports", () => {
  const testsRoot = path.join(root, "tests"); const files = []; const visit = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) visit(full); else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full); } }; visit(testsRoot);
  for (const file of files) { const source = fs.readFileSync(file, "utf8"); assert.equal(source.includes("/mnt/data/" + "affliction_semantic"), false, `${path.relative(root, file)} contains a build-machine path`); assert.equal(/from\s+["'][A-Za-z]:[\\/]/.test(source), false, `${path.relative(root, file)} contains a Windows absolute import`); }
});
