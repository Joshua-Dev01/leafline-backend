import { IEvent } from "../model/events.model";
import { createManyNotifications } from "../../Notifications/services/notification.service";
import { dashboardEventPath } from "./events.helpers";

const ids = (arr?: unknown[]) => (arr ?? []).map((x) => String(x));

/** Everyone with a stake in the event: going + interested + waitlisted. */
export const eventAudience = (
  event: Pick<IEvent, "goingUsers" | "interestedUsers" | "waitlistUsers">,
  exclude: string[] = [],
): string[] => {
  const skip = new Set(exclude);
  return [
    ...new Set([
      ...ids(event.goingUsers),
      ...ids(event.interestedUsers),
      ...ids(event.waitlistUsers),
    ]),
  ].filter((id) => !skip.has(id));
};

interface NotifyAudienceOptions {
  title: string;
  message: string;
  priority?: "low" | "normal" | "high";
  /** user ids to leave out (usually the person who made the change) */
  exclude?: string[];
  userIds?: string[]; // override the default audience
}

/** Notification to the event's audience. Never throws (see notification service). */
export const notifyEventAudience = async (
  event: Pick<
    IEvent,
    "id" | "goingUsers" | "interestedUsers" | "waitlistUsers"
  >,
  { title, message, priority = "normal", exclude = [], userIds }: NotifyAudienceOptions,
) => {
  const receivers = userIds ?? eventAudience(event, exclude);
  if (receivers.length === 0) return 0;

  return createManyNotifications({
    userIds: receivers,
    type: "event",
    priority,
    title,
    message,
    actionUrl: dashboardEventPath(String(event.id)),
    actionLabel: "View event",
    meta: { eventId: String(event.id) },
  });
};

/** Truncate for notification bodies (max 1000 chars in the model). */
export const clip = (s: string, n = 200) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;
