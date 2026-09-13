/**
 * Config plugin do CarePlus Predict:
 * - Copia o AAR Samsung Health Data SDK para android/app/libs/
 * - Adiciona dependencia do AAR no app/build.gradle
 * - Adiciona <queries> no AndroidManifest para o app enxergar o Samsung Health
 * - Configura signing release com a keystore (lendo das credenciais)
 *
 * Premissa: arquivos sensiveis em apps/mobile/credentials/ (fora do git):
 *   - samsung-health-data-api-1.1.0.aar
 *   - careplus-release.keystore
 */
const { withDangerousMod, withAndroidManifest, withAppBuildGradle } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const AAR_NAME = "samsung-health-data-api-1.1.0.aar";

function withCopyAar(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const credsDir = path.join(projectRoot, "credentials");

      // 1) Copia AAR
      const aarSrc = path.join(credsDir, AAR_NAME);
      const aarDstDir = path.join(platformRoot, "app", "libs");
      const aarDst = path.join(aarDstDir, AAR_NAME);
      if (!fs.existsSync(aarSrc)) {
        throw new Error(
          `[withSamsung] AAR nao encontrado em ${aarSrc}. Coloque o arquivo em apps/mobile/credentials/ antes do prebuild.`
        );
      }
      fs.mkdirSync(aarDstDir, { recursive: true });
      fs.copyFileSync(aarSrc, aarDst);
      console.log(`[withSamsung] AAR copiado: ${aarDst}`);

      // 2) Copia keystore (se existir)
      const ksSrc = path.join(credsDir, "careplus-release.keystore");
      const ksDst = path.join(platformRoot, "app", "careplus-release.keystore");
      if (fs.existsSync(ksSrc)) {
        fs.copyFileSync(ksSrc, ksDst);
        console.log(`[withSamsung] Keystore copiada: ${ksDst}`);
      } else {
        console.warn(`[withSamsung] AVISO: keystore nao encontrada em ${ksSrc}. Build release nao vai assinar.`);
      }

      // 3) Copia as credenciais de assinatura. Ficam num .properties fora do
      //    git (credentials/) em vez de embutidas neste arquivo, que E versionado.
      const kpSrc = path.join(credsDir, "keystore.properties");
      const kpDst = path.join(platformRoot, "keystore.properties");
      if (fs.existsSync(kpSrc)) {
        fs.copyFileSync(kpSrc, kpDst);
        console.log(`[withSamsung] keystore.properties copiado: ${kpDst}`);
      } else {
        console.warn(
          `[withSamsung] AVISO: ${kpSrc} nao encontrado. ` +
            `Copie apps/mobile/keystore.properties.example para credentials/keystore.properties. ` +
            `Sem ele o build de release ABORTA (de proposito).`
        );
      }

      return cfg;
    },
  ]);
}

function withSamsungQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest.queries) manifest.queries = [];
    // garante 1 unico bloco <queries>; injeta packages
    const queriesBlock = manifest.queries[0] || {};
    if (!queriesBlock.package) queriesBlock.package = [];
    const pkgs = ["com.sec.android.app.shealth", "com.samsung.android.wear.shealth"];
    for (const p of pkgs) {
      if (!queriesBlock.package.find((q) => q.$["android:name"] === p)) {
        queriesBlock.package.push({ $: { "android:name": p } });
      }
    }
    if (!manifest.queries[0]) manifest.queries[0] = queriesBlock;
    return cfg;
  });
}

function withAarDependency(config) {
  return withAppBuildGradle(config, (cfg) => {
    const dep = "implementation files('libs/" + AAR_NAME + "')";
    if (!cfg.modResults.contents.includes(dep)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        (m) => `${m}\n    ${dep}`
      );
      console.log("[withSamsung] dep do AAR adicionada em app/build.gradle");
    }
    return cfg;
  });
}

/**
 * Acha um bloco `chave { ... }` casando as chaves de abertura/fechamento.
 * Devolve { inicio, fim, conteudo } onde `fim` e o indice da chave que fecha,
 * ou null se nao encontrar. Necessario porque regex nao casa blocos aninhados.
 */
function acharBloco(texto, padraoInicio) {
  const m = texto.match(padraoInicio);
  if (!m || m.index === undefined) return null;
  const abre = texto.indexOf("{", m.index);
  if (abre < 0) return null;
  let nivel = 0;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === "{") nivel++;
    else if (texto[i] === "}") {
      nivel--;
      if (nivel === 0) return { inicio: m.index, fim: i, conteudo: texto.slice(abre + 1, i) };
    }
  }
  return null;
}

function withSigningRelease(config) {
  return withAppBuildGradle(config, (cfg) => {
    // Nenhuma senha aqui: este arquivo E versionado. O build.gradle gerado le
    // android/keystore.properties, que withCopyAar traz de credentials/.
    // Se o arquivo faltar, o build de release FALHA em vez de cair na chave de
    // debug silenciosamente.
    const signingBlock = `
        release {
            // Credenciais em android/keystore.properties (fora do git).
            def ksPropsFile = rootProject.file('keystore.properties')
            if (ksPropsFile.exists()) {
                def ksProps = new Properties()
                ksPropsFile.withInputStream { ksProps.load(it) }
                storeFile file(ksProps['RELEASE_STORE_FILE'])
                storePassword ksProps['RELEASE_STORE_PASSWORD']
                keyAlias ksProps['RELEASE_KEY_ALIAS']
                keyPassword ksProps['RELEASE_KEY_PASSWORD']
            } else if (gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }) {
                throw new GradleException(
                    "keystore.properties nao encontrado em \${ksPropsFile}.\\n" +
                    "Copie apps/mobile/keystore.properties.example para " +
                    "apps/mobile/credentials/keystore.properties e rode o prebuild de novo.\\n" +
                    "Build de release ABORTADO para nao assinar com a chave de debug.")
            }
        }`;

    let src = cfg.modResults.contents;

    // 1) Cria o signingConfigs.release, se ainda nao existe.
    //    Delimitamos o bloco contando chaves. Um regex com [\s\S]*? atravessaria
    //    para dentro de buildTypes.release e daria falso positivo de "ja existe".
    const bloco = acharBloco(src, /signingConfigs\s*\{/);
    if (bloco && !/\brelease\s*\{/.test(bloco.conteudo)) {
      src = src.slice(0, bloco.fim) + signingBlock + "\n    " + src.slice(bloco.fim);
    }

    // 2) BUG HISTORICO — nao remover esta etapa.
    //    O template do Expo ja traz `signingConfig signingConfigs.debug` DENTRO
    //    de buildTypes.release. A versao anterior deste plugin apenas ACRESCENTAVA
    //    a linha do release no topo do bloco; como a do debug vinha depois, ela
    //    vencia, e todo APK ate o v16 saiu assinado com a chave publica de debug
    //    (SHA-1 5e8f1606...). Por isso substituimos a linha em vez de acrescentar.
    const releaseUsaDebug =
      /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
    if (releaseUsaDebug.test(src)) {
      src = src.replace(releaseUsaDebug, "$1signingConfig signingConfigs.release");
      console.log("[withSamsung] buildTypes.release: trocado signingConfigs.debug -> release");
    }

    // 3) Se por algum motivo nao houver nenhuma linha de signingConfig no release, injeta.
    if (!/buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig\s+signingConfigs\.release/.test(src)) {
      src = src.replace(
        /(buildTypes\s*\{[\s\S]*?\brelease\s*\{)/,
        (m) => `${m}\n            signingConfig signingConfigs.release`
      );
    }

    cfg.modResults.contents = src;
    console.log("[withSamsung] signing release configurado em app/build.gradle");
    return cfg;
  });
}

module.exports = function withSamsung(config) {
  config = withCopyAar(config);
  config = withSamsungQueries(config);
  config = withAarDependency(config);
  config = withSigningRelease(config);
  return config;
};
