type TextTemplate = { children: Node[]; text: string; whitespace: string; appliedHtml: string };
const templates = new WeakMap<Element, TextTemplate>();

/** Keep trusted base structure in memory; patches still contain plain text only. */
export function rememberInlineText(element: Element) {
  if (!templates.has(element)) templates.set(element, {
    children: [...element.childNodes].map(node => node.cloneNode(true)),
    text: element.textContent ?? "",
    whitespace: element instanceof HTMLElement ? element.style.whiteSpace : "",
    appliedHtml: element.innerHTML,
  });
}

function matchingCharacters(before: string[], after: string[]) {
  const matches: Array<[number, number]> = [];
  let prefix = 0, endBefore = before.length, endAfter = after.length;
  while (prefix < endBefore && prefix < endAfter && before[prefix] === after[prefix]) { matches.push([prefix, prefix]); prefix++; }
  while (endBefore > prefix && endAfter > prefix && before[endBefore - 1] === after[endAfter - 1]) { endBefore--; endAfter--; }
  const n = endBefore - prefix, m = endAfter - prefix;
  if (n * m <= 1_000_000) {
    const width = m + 1, table = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      table[i * width + j] = before[prefix + i] === after[prefix + j]
        ? table[(i + 1) * width + j + 1] + 1
        : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (before[prefix + i] === after[prefix + j]) { matches.push([prefix + i++, prefix + j++]); }
      else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++;
      else j++;
    }
  } else {
    // Bound memory for a complete rewrite of a very large field. Common
    // prefix/suffix and ordered surviving characters retain their base styles.
    let cursor = prefix;
    for (let i = prefix; i < endBefore; i++) {
      const j = after.indexOf(before[i], cursor);
      if (j >= cursor && j < endAfter) { matches.push([i, j]); cursor = j + 1; }
    }
  }
  for (let i = endBefore, j = endAfter; i < before.length; i++, j++) matches.push([i, j]);
  return matches;
}

export function applyInlineText(element: Element, next: string) {
  rememberInlineText(element);
  const template = templates.get(element)!;
  // Native editing can remove inline markup without changing the committed
  // text. Compare structure as well, while avoiding a mutation-observer loop.
  if (element.textContent === next && element.innerHTML === template.appliedHtml) return;
  const fragment = document.createDocumentFragment();
  for (const node of template.children) fragment.append(node.cloneNode(true));
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = []; const owners: number[] = []; const before: string[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text, owner = nodes.length;
    nodes.push(node);
    for (const char of Array.from(node.data)) { before.push(char); owners.push(owner); }
  }
  if (!nodes.length) { element.replaceChildren(document.createTextNode(next)); template.appliedHtml = element.innerHTML; return; }
  const after = Array.from(next), output = nodes.map(() => "");
  let oldCursor = 0, newCursor = 0;
  for (const [oldIndex, newIndex] of [...matchingCharacters(before, after), [before.length, after.length] as [number, number]]) {
    const owner = oldCursor < oldIndex ? owners[oldCursor] : owners[Math.max(0, oldCursor - 1)] ?? 0;
    while (newCursor < newIndex) output[owner] += after[newCursor++];
    if (newIndex < after.length) output[owners[oldIndex] ?? owner] += after[newCursor++];
    oldCursor = oldIndex + 1;
  }
  nodes.forEach((node, index) => { node.data = output[index]; });
  element.replaceChildren(fragment);
  template.appliedHtml = element.innerHTML;
  if (element instanceof HTMLElement) element.style.whiteSpace = next.includes("\n") ? "pre-wrap" : template.whitespace;
}
