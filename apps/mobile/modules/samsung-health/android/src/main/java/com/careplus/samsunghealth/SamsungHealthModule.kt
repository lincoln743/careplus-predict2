package com.careplus.samsunghealth

import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import com.samsung.android.sdk.health.data.HealthDataService
import com.samsung.android.sdk.health.data.HealthDataStore
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalDateFilter
import com.samsung.android.sdk.health.data.request.LocalDateGroup
import com.samsung.android.sdk.health.data.request.LocalDateGroupUnit
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import com.samsung.android.sdk.health.data.request.LocalTimeGroup
import com.samsung.android.sdk.health.data.request.LocalTimeGroupUnit
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.concurrent.Executors

/**
 * Modulo nativo Samsung Health Data SDK 1.1.0.
 *
 * v16 — Reforco contra crashes silenciosos:
 *  - try/catch agora cobre Throwable (Error: NoClassDefFoundError etc)
 *  - mapHealthError classifica em codes (10 categorias)
 *  - checkAvailability diagnostica antes de tentar conectar
 *  - logs via Log.i/Log.e com tag SamsungHealthCP (adb logcat -s SamsungHealthCP)
 */
class SamsungHealthModule : Module() {

  companion object {
    private const val TAG = "SamsungHealthCP"
    private const val SH_PACKAGE = "com.sec.android.app.shealth"
  }

  private val tipoPorNome: Map<String, DataType> = mapOf(
    "steps"        to DataTypes.STEPS,
    "heart_rate"   to DataTypes.HEART_RATE,
    "sleep"        to DataTypes.SLEEP,
    "blood_oxygen" to DataTypes.BLOOD_OXYGEN,
  )

  private fun permissoesDe(metricas: List<String>): Set<Permission> =
    metricas.mapNotNull { tipoPorNome[it] }
            .map { Permission.of(it, AccessType.READ) }
            .toSet()

  private fun nomesDe(perms: Set<Permission>): List<String> {
    val invertido = tipoPorNome.entries.associate { (k, v) -> v.name to k }
    return perms.mapNotNull { invertido[it.dataType.name] }
  }

  /**
   * Classifica uma excecao em (code, message). Cobre 5 cenarios
   * ambientais do Samsung Health + class loading + autorizacao + fallback.
   */
  private fun mapHealthError(t: Throwable): Pair<String, String> {
    val msg = (t.message ?: "").lowercase()
    val cls = t.javaClass.simpleName

    if (t is NoClassDefFoundError || t is ExceptionInInitializerError
        || t is ClassNotFoundException || cls.contains("NoClassDef")) {
      return "CLASS_LOADING" to
        "Falha ao carregar classe do SDK Samsung Health. " +
        "Provavel incompatibilidade SDK vs app Samsung Health no device. " +
        "Detalhe: ${t.javaClass.name}: ${t.message}"
    }
    if (msg.contains("not installed") || msg.contains("nao instalado")) {
      return "SH_NOT_INSTALLED" to "Samsung Health nao esta instalado."
    }
    if (msg.contains("disabled") || msg.contains("desabilitado")) {
      return "SH_DISABLED" to "Samsung Health esta desabilitado no celular."
    }
    if (msg.contains("old version") || msg.contains("too old")
        || msg.contains("not supported") || msg.contains("versao antiga")) {
      return "SH_OUTDATED" to "Samsung Health esta desatualizado. Atualize pela Galaxy Store."
    }
    if (msg.contains("signature") || msg.contains("not matched") || msg.contains("assinatura")) {
      return "SH_SIGNATURE" to "Este APK nao esta registrado no Samsung Partner Portal (assinatura nao bate)."
    }
    if (cls.contains("Authorization") || msg.contains("authorization")
        || msg.contains("permission") || msg.contains("permissao")) {
      return "SH_AUTH_DENIED" to "Permissao de saude foi negada pelo usuario."
    }
    if (msg.contains("2003") || msg.contains("unknown_app") || msg.contains("not registered")
        || cls.contains("PlatformInternal")) {
      return "SH_NOT_REGISTERED" to "Este app ainda nao foi registrado no Samsung Health."
    }
    if (cls.contains("Resolvable") || cls.contains("Platform")) {
      return "SH_PLATFORM" to "Erro interno do Samsung Health: ${t.message}"
    }
    if (cls.contains("Illegal") && msg.contains("activity")) {
      return "NO_ACTIVITY" to "Activity nao disponivel."
    }
    return "SAMSUNG_HEALTH_ERR" to "${t.javaClass.simpleName}: ${t.message ?: "erro desconhecido"}"
  }

  /** Rejeita a Promise com code+message do mapHealthError. */
  private fun reject(promise: Promise, t: Throwable) {
    val (code, msg) = mapHealthError(t)
    Log.e(TAG, "[$code] ${t.javaClass.name}: ${t.message}", t)
    val cause = if (t is Exception) t else RuntimeException("${t.javaClass.name}: ${t.message}", t)
    promise.reject(code, msg, cause)
  }

  private val store: HealthDataStore by lazy {
    Log.i(TAG, "Inicializando HealthDataService.getStore()...")
    val ctx = appContext.reactContext
      ?: throw IllegalStateException("Contexto Android nao disponivel")
    val s = HealthDataService.getStore(ctx)
    Log.i(TAG, "HealthDataStore OK: ${s.javaClass.simpleName}")
    s
  }
  private val exec = Executors.newSingleThreadExecutor()

  private fun janelaLocalTime(dias: Int): LocalTimeFilter {
    val agora = LocalDateTime.now()
    val inicio = LocalDate.now().minusDays((dias - 1).toLong()).atStartOfDay()
    return LocalTimeFilter.of(inicio, agora)
  }

  private fun janelaLocalDate(dias: Int): LocalDateFilter {
    val hoje = LocalDate.now()
    val inicio = hoje.minusDays((dias - 1).toLong())
    return LocalDateFilter.of(inicio, hoje)
  }

  override fun definition() = ModuleDefinition {
    Name("SamsungHealth")

    Function("hello") { "Ponte JS<->Kotlin OK v16. SDK Samsung carregada." }

    Function("isSamsungHealthInstalled") {
      val ctx = appContext.reactContext ?: return@Function false
      return@Function try {
        ctx.packageManager.getPackageInfo(SH_PACKAGE, 0)
        true
      } catch (t: Throwable) { false }
    }

    /**
     * Diagnostico do Samsung Health no device. NUNCA lanca excecao.
     * Retorna { status, code, message, details } com diagnostico claro.
     * status: "ok" | "not_installed" | "disabled" | "outdated" | "error"
     */
    AsyncFunction("checkAvailability") { promise: Promise ->
      Log.i(TAG, "checkAvailability: iniciando diagnostico")
      try {
        val ctx: Context = appContext.reactContext
          ?: return@AsyncFunction promise.resolve(mapOf(
            "status" to "error", "code" to "NO_CONTEXT",
            "message" to "Contexto Android nao disponivel"))

        val pm = ctx.packageManager
        Log.i(TAG, "Verificando pacote $SH_PACKAGE")

        val pInfo = try {
          pm.getPackageInfo(SH_PACKAGE, 0)
        } catch (e: PackageManager.NameNotFoundException) {
          Log.w(TAG, "Samsung Health nao esta instalado")
          return@AsyncFunction promise.resolve(mapOf(
            "status" to "not_installed", "code" to "SH_NOT_INSTALLED",
            "message" to "Samsung Health nao esta instalado. Instale pela Galaxy Store."))
        }

        val versionName = pInfo.versionName ?: "?"
        @Suppress("DEPRECATION") val versionCode = pInfo.versionCode
        Log.i(TAG, "Samsung Health version=$versionName code=$versionCode")

        val appInfo = try { pm.getApplicationInfo(SH_PACKAGE, 0) } catch (t: Throwable) { null }
        if (appInfo != null && !appInfo.enabled) {
          Log.w(TAG, "Samsung Health esta desabilitado")
          return@AsyncFunction promise.resolve(mapOf(
            "status" to "disabled", "code" to "SH_DISABLED",
            "message" to "Samsung Health esta desabilitado. Ative em Configuracoes -> Apps.",
            "details" to mapOf("versionName" to versionName, "versionCode" to versionCode)))
        }

        try {
          val testStore = store
          Log.i(TAG, "Store init OK: ${testStore.javaClass.simpleName}")
        } catch (t: Throwable) {
          Log.e(TAG, "Falha ao inicializar HealthDataStore", t)
          val (code, msg) = mapHealthError(t)
          return@AsyncFunction promise.resolve(mapOf(
            "status" to "error", "code" to code, "message" to msg,
            "details" to mapOf(
              "versionName" to versionName, "versionCode" to versionCode,
              "exceptionClass" to t.javaClass.name,
              "exceptionMessage" to (t.message ?: ""))))
        }

        Log.i(TAG, "checkAvailability: tudo OK")
        promise.resolve(mapOf(
          "status" to "ok", "code" to "OK",
          "message" to "Samsung Health pronto pra conectar.",
          "details" to mapOf("versionName" to versionName, "versionCode" to versionCode)))
      } catch (t: Throwable) {
        Log.e(TAG, "Erro inesperado em checkAvailability", t)
        val (code, msg) = mapHealthError(t)
        promise.resolve(mapOf("status" to "error", "code" to code, "message" to msg))
      }
    }

    AsyncFunction("checkPermissions") { metricas: List<String>, promise: Promise ->
      try {
        val perms = permissoesDe(metricas)
        if (perms.isEmpty()) {
          promise.resolve(mapOf("granted" to emptyList<String>(), "denied" to metricas)); return@AsyncFunction
        }
        store.getGrantedPermissionsAsync(perms).setCallback(exec,
          { grantedPerms ->
            val granted = nomesDe(grantedPerms)
            promise.resolve(mapOf("granted" to granted, "denied" to metricas.filter { it !in granted }))
          },
          { err ->
            val msg = err?.message ?: ""
            val ehAppDesconhecido = msg.contains("2003") || msg.contains("UNKNOWN_APP")
              || msg.contains("not registered", ignoreCase = true)
              || err?.javaClass?.simpleName?.contains("PlatformInternal", ignoreCase = true) == true
            if (ehAppDesconhecido) {
              promise.resolve(mapOf("granted" to emptyList<String>(), "denied" to metricas))
            } else if (err != null) {
              reject(promise, err)
            } else {
              promise.reject("SAMSUNG_HEALTH_ERR", "erro desconhecido", null)
            }
          }
        )
      } catch (t: Throwable) { reject(promise, t) }
    }

    AsyncFunction("requestPermissions") { metricas: List<String>, promise: Promise ->
      try {
        val activity: Activity = appContext.currentActivity
          ?: return@AsyncFunction promise.reject("NO_ACTIVITY", "Activity nao disponivel", null)
        val perms = permissoesDe(metricas)
        if (perms.isEmpty()) {
          promise.resolve(mapOf("granted" to emptyList<String>(), "denied" to metricas)); return@AsyncFunction
        }
        store.requestPermissionsAsync(perms, activity).setCallback(exec,
          { grantedPerms ->
            val granted = nomesDe(grantedPerms)
            promise.resolve(mapOf("granted" to granted, "denied" to metricas.filter { it !in granted }))
          },
          { err -> if (err != null) reject(promise, err) else promise.reject("SAMSUNG_HEALTH_ERR", "erro", null) }
        )
      } catch (t: Throwable) { reject(promise, t) }
    }

    AsyncFunction("readDailySteps") { dias: Int, promise: Promise ->
      try {
        val request = DataType.StepsType.TOTAL.requestBuilder
          .setLocalTimeFilterWithGroup(janelaLocalTime(dias), LocalTimeGroup.of(LocalTimeGroupUnit.DAILY, 1))
          .build()
        store.aggregateDataAsync(request).setCallback(exec,
          { resp ->
            val pontos = resp.dataList.map { agg ->
              mapOf(
                "data"   to agg.getStartLocalDateTime().toLocalDate().toString(),
                "passos" to (agg.value ?: 0L),
              )
            }
            promise.resolve(pontos)
          },
          { err -> if (err != null) reject(promise, err) else promise.reject("SAMSUNG_HEALTH_ERR", "erro", null) }
        )
      } catch (t: Throwable) { reject(promise, t) }
    }

    AsyncFunction("readDailyHeartRate") { dias: Int, promise: Promise ->
      try {
        val janela = janelaLocalDate(dias)
        val grupo = LocalDateGroup.of(LocalDateGroupUnit.DAILY, 1)

        val reqMin = DataType.HeartRateType.MIN.requestBuilder
          .setLocalDateFilterWithGroup(janela, grupo).build()
        val reqMax = DataType.HeartRateType.MAX.requestBuilder
          .setLocalDateFilterWithGroup(janela, grupo).build()

        val acumulado = HashMap<String, MutableMap<String, Any?>>()
        var falhou = false

        fun resolveSeAmbos() {
          if (acumulado.size > 0 && acumulado.values.all { it.containsKey("min") && it.containsKey("max") }) {
            val lista = acumulado.keys.sorted().map { acumulado[it]!!.toMap() }
            promise.resolve(lista)
          }
        }
        fun mergePonto(data: String, key: String, valor: Any?) {
          val m = acumulado.getOrPut(data) { hashMapOf("data" to data) }
          m[key] = valor
        }

        store.aggregateDataAsync(reqMin).setCallback(exec,
          { resp ->
            if (falhou) return@setCallback
            resp.dataList.forEach { agg ->
              val data = agg.getStartLocalDateTime().toLocalDate().toString()
              mergePonto(data, "min", agg.value)
            }
            resolveSeAmbos()
          },
          { err -> if (!falhou) { falhou = true; if (err != null) reject(promise, err) else promise.reject("SAMSUNG_HEALTH_ERR", "erro", null) } }
        )
        store.aggregateDataAsync(reqMax).setCallback(exec,
          { resp ->
            if (falhou) return@setCallback
            resp.dataList.forEach { agg ->
              val data = agg.getStartLocalDateTime().toLocalDate().toString()
              mergePonto(data, "max", agg.value)
            }
            resolveSeAmbos()
          },
          { err -> if (!falhou) { falhou = true; if (err != null) reject(promise, err) else promise.reject("SAMSUNG_HEALTH_ERR", "erro", null) } }
        )
      } catch (t: Throwable) { reject(promise, t) }
    }

    AsyncFunction("readDailySleep") { dias: Int, promise: Promise ->
      try {
        val request = DataType.SleepType.TOTAL_DURATION.requestBuilder
          .setLocalDateFilterWithGroup(janelaLocalDate(dias), LocalDateGroup.of(LocalDateGroupUnit.DAILY, 1))
          .build()
        store.aggregateDataAsync(request).setCallback(exec,
          { resp ->
            val pontos = resp.dataList.map { agg ->
              val dur = agg.value
              val horas = dur?.toMinutes()?.let { it / 60.0 } ?: 0.0
              mapOf(
                "data"  to agg.getStartLocalDateTime().toLocalDate().toString(),
                "horas" to (Math.round(horas * 10.0) / 10.0),
              )
            }
            promise.resolve(pontos)
          },
          { err -> if (err != null) reject(promise, err) else promise.reject("SAMSUNG_HEALTH_ERR", "erro", null) }
        )
      } catch (t: Throwable) { reject(promise, t) }
    }
  }
}
