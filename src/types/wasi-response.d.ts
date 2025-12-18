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

export interface WasiResultResponse {
  type: "wasi-result";
  value: Uint8Array;
  compilationTime: number;
}

export interface StatusUpdateResponse {
  type: "status-update";
  value: string;
}
