import { Directory } from "@bjorn3/browser_wasi_shim";

export type WasiResponse =
  | ReadyResponse
  | WasiOutputResponse
  | WasiResultResponse
  | StatusUpdateResponse;

export interface ReadyResponse {
  type: "ready";
}

export interface WasiOutputResponse {
  type: "wasi-output";
  stream: "stdout" | "stderr";
  value: string;
}

export type DirectoryMap = Map<string, DirectoryMap | Uint8Array>;

export interface WasiResultResponse {
  type: "wasi-result";
  files: DirectoryMap;
  compilationTime: number;
}

export interface StatusUpdateResponse {
  type: "status-update";
  value: string;
}
