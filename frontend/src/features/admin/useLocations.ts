// 근로자 현재 위치 — 15초마다 다시 읽는다
import { useFetch, usePoll } from "../../shared/hooks";
import type { Locations } from "./locations";

export function useLocations() {
  const { data, error, reload } = useFetch<Locations>("/locations");
  usePoll(reload, 15_000, true);
  return { data, error };
}
