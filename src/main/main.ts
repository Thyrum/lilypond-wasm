import "./style.css";

import Worker from "./../workers/wasi-worker?worker";
import { addMessage } from "./log";

import type { WasiResponse } from "../types/wasi-response";
import type { WasiCommand } from "../types/wasi-command";

const worker = new Worker();

const status = document.getElementById("status");
const log = document.getElementById("log");
const result = document.getElementById("result") as HTMLDivElement;
const input = document.getElementById("source") as HTMLTextAreaElement;
const compileButton = document.getElementById(
  "compile-button",
) as HTMLButtonElement;
compileButton.onclick = function () {
  compileButton.disabled = true;
  worker.postMessage({
    type: "run-wasi",
    file: input.value.trim(),
  } satisfies WasiCommand);
};

function download_file(name: string, contents: BlobPart, mime_type: string) {
  mime_type = mime_type || "text/plain";

  var blob = new Blob([contents], { type: mime_type });

  var dlink = document.createElement("a");
  dlink.download = name;
  dlink.href = window.URL.createObjectURL(blob);
  dlink.onclick = function () {
    // revokeObjectURL needs a delay to work properly
    var that = this as HTMLAnchorElement;
    setTimeout(function () {
      window.URL.revokeObjectURL(that.href);
    }, 1500);
  };

  dlink.click();
  dlink.remove();
}

worker.onmessage = function (e: MessageEvent<WasiResponse>) {
  switch (e.data.type) {
    case "ready":
      compileButton.disabled = false;
      return;
    case "status-update":
      status!.textContent = e.data.value;
      return;
    case "wasi-output":
      addMessage(log!, `[${e.data.stream}] ${e.data.value}`);
      return;
    case "wasi-result":
      const image = document.createElement("img");
      const content = e.data.value as BlobPart;
      image.src = URL.createObjectURL(
        new Blob([content], { type: "image/png" }),
      );
      image.onclick = () => download_file("result.png", content, "image/png");
      result.insertBefore(image, result.firstChild);
      addMessage(
        log!,
        `[lily-result] Compilation time: ${(e.data.compilationTime / 1000).toFixed(2)} seconds`,
      );
      return;
  }
};
worker.postMessage({ type: "init" } satisfies WasiCommand);
