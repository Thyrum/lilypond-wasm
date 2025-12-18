import "./style.css";

import Worker from "./../workers/wasi-worker?worker";
import { addMessage } from "./log";

import type { DirectoryMap, WasiResponse } from "../types/wasi-response";
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

function download_file(name: string, blob: Blob) {
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

function getImages(dir: DirectoryMap): Map<string, Blob> {
  let result = new Map<string, Blob>();

  for (let [path, content] of dir) {
    if (content instanceof Map) {
      const subImages = getImages(content);
      for (let [subPath, blob] of subImages) {
        result.set(path + "/" + subPath, blob);
      }
    } else if (content instanceof Uint8Array) {
      if (path.endsWith(".png")) {
        result.set(path, new Blob([content], { type: "image/png" }));
      }
    }
  }
  return result;
}

function displayImages(images: Map<string, Blob>, container: HTMLElement) {
  const selector = document.createElement("select");
  const image = document.createElement("img");
  selector.onchange = function () {
    image.src = window.URL.createObjectURL(images.get(selector.value)!);
  };
  if (images.size > 0) {
    image.src = window.URL.createObjectURL(images.values().next().value!);
  }
  for (const filename of images.keys()) {
    selector.options.add(new Option(filename, filename));
  }
  if (images.size <= 1) {
    selector.disabled = true;
  }
  container.appendChild(selector);
  container.appendChild(image);
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
      addMessage(
        log!,
        `[lily-result] Compilation time: ${(e.data.compilationTime / 1000).toFixed(2)} seconds`,
      );
      console.log("WASI Result:", e.data);
      const images = getImages(e.data.files);
      console.log("Extracted images:", images);
      result.innerHTML = "";
      displayImages(images, result);
      return;
  }
};
worker.postMessage({ type: "init" } satisfies WasiCommand);
