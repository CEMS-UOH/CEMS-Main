// Small browser helpers shared by every area: save a file the page built itself (an .ics
// calendar entry, a CSV export) and copy text. Nothing here talks to the network.

/** Saves `content` as a file called `filename`, the same as clicking a download link. */
export function downloadFile(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before the object URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copies text to the clipboard; false when the browser refuses (old browser, no permission). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** A file name from a title: keeps letters in any script, digits and dashes; never empty. */
export function safeFileName(title: string, fallback = 'event'): string {
  const name = title
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
  return name || fallback;
}
