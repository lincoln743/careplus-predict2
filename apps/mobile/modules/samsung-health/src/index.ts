import { requireNativeModule } from "expo-modules-core";

const SamsungHealth = requireNativeModule("SamsungHealth");

export type MetricaSamsung = "steps" | "heart_rate" | "sleep" | "blood_oxygen";

export type AvailabilityStatus = "ok" | "not_installed" | "disabled" | "outdated" | "error";

export interface AvailabilityResult {
  status: AvailabilityStatus;
  code: string;
  message: string;
  details?: {
    versionName?: string;
    versionCode?: number;
    minimumVersionCode?: number;
    exceptionClass?: string;
    exceptionMessage?: string;
  };
}

export interface PermissionResult {
  granted: MetricaSamsung[];
  denied: MetricaSamsung[];
}
export interface PontoPassos { data: string; passos: number; }
export interface PontoFC { data: string; min?: number; max?: number; }
export interface PontoSono { data: string; horas: number; }

export const hello = (): string => SamsungHealth.hello();
export const isSamsungHealthInstalled = (): boolean => SamsungHealth.isSamsungHealthInstalled();
export const checkAvailability = (): Promise<AvailabilityResult> => SamsungHealth.checkAvailability();
export const checkPermissions = (m: MetricaSamsung[]): Promise<PermissionResult> => SamsungHealth.checkPermissions(m);
export const requestPermissions = (m: MetricaSamsung[]): Promise<PermissionResult> => SamsungHealth.requestPermissions(m);

export const readDailySteps = (dias: number): Promise<PontoPassos[]> => SamsungHealth.readDailySteps(dias);
export const readDailyHeartRate = (dias: number): Promise<PontoFC[]> => SamsungHealth.readDailyHeartRate(dias);
export const readDailySleep = (dias: number): Promise<PontoSono[]> => SamsungHealth.readDailySleep(dias);
