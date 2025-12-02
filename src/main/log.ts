export function addMessage(element: HTMLElement, message: string) {
  const atBottom =
    element.scrollTop + element.offsetHeight === element.scrollHeight;

  element.textContent += message + "\n";

  if (atBottom) {
    element.scrollTo({ top: element.scrollHeight - element.offsetHeight });
  }
}
