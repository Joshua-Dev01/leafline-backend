import { IEvent, DEFAULT_EVENT_DURATION_MS } from "../model/events.model";

const pad = (n: number) => String(n).padStart(2, "0");

/** 20261116T093000Z */
export const toIcsDate = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
  `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

const escapeText = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

/** RFC 5545: lines are max 75 octets; continuation lines start with a space. */
export const foldLine = (line: string): string => {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // never cut a multi-byte character in half
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // the leading space counts toward the 75
  }
  return parts.join("\r\n ");
};

const eventEnd = (e: Pick<IEvent, "startTime" | "endTime" | "endsAt">) =>
  e.endsAt ?? e.endTime ?? new Date(e.startTime.getTime() + DEFAULT_EVENT_DURATION_MS);

export const buildEventIcs = (
  event: IEvent,
  opts: { url: string; now?: Date },
): string => {
  const now = opts.now ?? new Date();
  const place = event.location || event.onlineLink || "";

  const description = [
    event.description,
    event.onlineLink ? `Join online: ${event.onlineLink}` : "",
    `Details: ${opts.url}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LeafLine//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@leafline`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(event.startTime)}`,
    `DTEND:${toIcsDate(eventEnd(event))}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(place ? [`LOCATION:${escapeText(place)}`] : []),
    `URL:${opts.url}`,
    `STATUS:${event.cancelledAt ? "CANCELLED" : "CONFIRMED"}`,
    // higher SEQUENCE lets calendars replace an older copy of this event
    `SEQUENCE:${Math.floor((event.updatedAt ?? now).getTime() / 60000)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Event starts in 1 hour",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
};

/** "Add to calendar" deep links for Google and Outlook (no file needed). */
export const calendarLinks = (event: IEvent, url: string) => {
  const place = event.location || event.onlineLink || "";
  const details = `${event.description}\n\n${url}`;
  const start = event.startTime;
  const end = eventEnd(event);

  const google = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsDate(start)}/${toIcsDate(end)}`,
    details,
    location: place,
  });

  const outlook = new URLSearchParams({
    path: "/calendar/action/compose",
    rrv: "addevent",
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: details,
    location: place,
  });

  return {
    google: `https://calendar.google.com/calendar/render?${google}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlook}`,
  };
};
