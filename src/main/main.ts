import "./style.css";

import Worker from "./../workers/worker?worker";
import { addMessage } from "./log";

const worker = new Worker();

const status = document.getElementById("status");
const log = document.getElementById("log");
const result = document.getElementById("result");

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

worker.onmessage = function (
  e: MessageEvent<{
    type: "status-update" | "log" | "result";
    content: string | Uint8Array;
  }>,
) {
  switch (e.data.type) {
    case "status-update":
      status!.textContent = e.data.content as string;
      break;
    case "log":
      addMessage(log!, e.data.content as string);
      break;
    case "result":
      const image = document.createElement("img");
      image.src = URL.createObjectURL(
        new Blob([e.data.content as BlobPart], { type: "image/png" }),
      );
      image.onclick = () =>
        download_file("result.png", e.data.content as BlobPart, "image/png");
      result!.appendChild(image);
      break;
  }
};
worker.postMessage("Start work");
