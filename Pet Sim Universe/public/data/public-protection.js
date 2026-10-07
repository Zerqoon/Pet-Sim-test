// Discourages ordinary browser copying. Public assets and source cannot be secret.
const artwork = 'img, picture, svg, canvas, .card-art, .modal-art-shell, .calc-picker-art, .home-menu-decor, .drop-source-card';
const editable = 'input, textarea, [contenteditable]:not([contenteditable="false"])';
const element = node => node?.nodeType === 3 ? node.parentElement : node;
const within = (node, selector) => !!element(node)?.closest?.(selector);

function selectionContainsArtwork(document) {
  try {
    const selection = document.getSelection?.();
    if (!selection || selection.isCollapsed) return false;
    for (let index = 0; index < selection.rangeCount; index++) {
      if (selection.getRangeAt(index).cloneContents().querySelector(artwork)) return true;
    }
  } catch {}
  return false;
}

export function enablePublicProtection(document = globalThis.document) {
  const listeners = [];
  const listen = (type, handler) => {
    document.addEventListener(type, handler, {capture:true});
    listeners.push([type, handler]);
  };
  const block = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const editing = event => within(event.target, editable) || within(document.activeElement, editable);
  const copyingArtwork = event => within(event.target, artwork) || within(document.activeElement, artwork) || selectionContainsArtwork(document);

  document.querySelectorAll('img').forEach(image => {
    image.setAttribute('draggable', 'false');
    image.setAttribute('decoding', 'async');
  });
  listen('contextmenu', block);
  listen('dragstart', event => {
    if (!editing(event) && copyingArtwork(event)) block(event);
  });
  listen('copy', event => {
    // Preserve search fields and the existing Copy Code textarea fallback.
    if (!editing(event) && copyingArtwork(event)) block(event);
  });
  listen('cut', event => {
    if (!editing(event) && copyingArtwork(event)) block(event);
  });
  listen('keydown', event => {
    const key = String(event.key || '').toLowerCase();
    const command = event.ctrlKey || event.metaKey;
    const devtools = key === 'f12' ||
      ((event.ctrlKey && event.shiftKey || event.metaKey && (event.altKey || event.shiftKey)) && ['i', 'j', 'c', 'k'].includes(key));
    const sourceOrSave = command && (key === 'u' || key === 's');
    const contextMenu = key === 'contextmenu' || event.shiftKey && key === 'f10';
    if (devtools || sourceOrSave || contextMenu || command && ['c', 'x'].includes(key) && !editing(event) && copyingArtwork(event)) block(event);
  });

  // Delegated events also cover cards and images rendered later by the app.
  return () => listeners.forEach(([type, handler]) => document.removeEventListener(type, handler, {capture:true}));
}
