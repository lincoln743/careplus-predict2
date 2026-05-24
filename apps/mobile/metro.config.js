// Metro config para o monorepo. Resolve o problema do symlink de workspace
// (node_modules/careplus-mobile -> ../apps/mobile) que fazia o Metro servir
// bundle antigo. Forca o Metro a observar a pasta real e resolver dela.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Observa a pasta real do projeto (nao o symlink).
config.watchFolders = [projectRoot];

// Resolve modulos a partir do node_modules do projeto E da raiz do monorepo.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(projectRoot, "../../node_modules"),
];

// Evita que o Metro siga o symlink de volta e se confunda.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
