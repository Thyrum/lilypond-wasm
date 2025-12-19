export function addMessage(element: HTMLElement, message: string) {
  const atBottom =
    Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) <
    1;

  element.textContent += message + "\n";

  if (atBottom) {
    element.scrollTo({ top: element.scrollHeight - element.offsetHeight });
  }
}
