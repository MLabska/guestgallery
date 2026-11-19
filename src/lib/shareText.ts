/** Text for the system share sheet (SPEC 1.3): contains the event name and the code. */
export function buildShareText(name: string, code: string): string {
  return `Join "${name}" on GuestGallery! Event code: ${code}`;
}
