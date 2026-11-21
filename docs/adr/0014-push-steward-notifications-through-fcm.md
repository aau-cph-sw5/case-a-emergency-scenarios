# ADR 0014. Send Steward Notifications as Push Messages Through Firebase Cloud Messaging

**Status.** Proposed
**Date.** 2026-11-18
**Deciders.** Anas Elmansari, Group 9
**Related backlog items.** MET-A-018 (#18, #412, #413, #414), MET-A-029

## Context

MET-A-018 requires a steward to get a visible notification when a scenario
starts or ends, and when a message is sent to the chat of the station they are
checked in at. The notification must arrive when the app is in the background
or closed, because a steward on a platform has the phone in a pocket, not open
on the screen.

Today the server tells stewards about changes over Socket.IO (ADR 0008). That
only works while the app is running. When the app is in the background, Android
pauses it to save battery (Doze and app standby), and the socket is closed. An
event sent then reaches nobody.

What Metro told us constrains the choice:

- The steward phones are Samsung Galaxy A52 to A55 on Android 14 and 15
  (Metro, August 2026). They are consumer phones with Google Play services.
- The phones are enrolled in SOTI, Metro's device management, running on
  Metro's own server. The app can be installed on the fleet without the public
  store, and the notification permission can be granted centrally instead of
  asking the steward.

Two facts about our setup matter as well. The team develops the steward app in
Expo Go, and Expo Go cannot receive remote push messages on Android since Expo
SDK 53. And the server keeps exactly one session per user (ADR 0009), so "the
steward is logged in" already has one place in the database.

## Decision

The server sends steward notifications as push messages through Firebase Cloud
Messaging (FCM), directly with Google's `firebase-admin` package.

**Registration.** After login, the app asks Android for its FCM device token
(`getDevicePushTokenAsync` in `expo-notifications`) and sends it to the server.
The server stores it on the steward's row in `auth_sessions`. Logging out, or
logging in again, clears it, so only logged-in stewards receive notifications.
When FCM answers that a token is no longer registered, the server deletes it.
The app skips registration in Expo Go and on the web, where push is not
available.

**Sending.** The server sends the push in the same place it already emits the
socket event, after the change is saved: on activation and stand-down to the
logged-in stewards of that line group (#413), and on a new station message to
the stewards checked in at that station (#414). A failed send is logged and
never fails the request. The socket events stay as they are, so an open app
keeps updating as today.

**Message.** Each push is a notification message, so Android shows it even when
the app is closed. It is sent with high priority, so a phone in Doze shows it at
once. It carries only what the notification shows: the scenario name and
whether it started or ended, or that a new station message arrived. No steward
names or other personal data, in line with MET-A-029.

**No connection at send time.** FCM stores a message for a phone that is
offline and delivers it when the phone reconnects, until the message's time to
live (TTL) runs out.

| Notification | Collapse key | TTL | Phone offline when sent |
| --- | --- | --- | --- |
| Scenario started or ended | `scenario-<lineGroup>` | 1 hour | Only the newest is delivered when it reconnects within the hour, later it is dropped |
| Station chat message | none | 1 hour | Every message is delivered when it reconnects within the hour, later they are dropped |

The collapse key means a newer scenario message replaces an older one that is
still waiting. A steward who was in a tunnel while a scenario started and was
stood down gets only "ended", never a "started" that is no longer true. A
switch (stand-down plus activation) gives only the newest "started".

A message dropped after its TTL loses only the alert, not the information:
when the app opens or reconnects it fetches the scenario state again (ADR 0011)
and shows the station thread.

**Third-party dependency.** The decision depends on Google: a Firebase project
for sending, and Google Play services on the phone for receiving. When FCM is
unavailable, the push fails and is logged. The scenario is still saved and
logged, the socket still delivers to apps that are open, and every app shows the
current state when it is opened. The steward misses the alert, not the
scenario.

## Consequences

What becomes easier:

- The notification works on the stewards' phones in every state: open, in the
  background, and closed. That is what MET-A-018 asks for, and it works because
  the Samsung phones already run Google Play services, which keeps one
  connection open for every app on the phone.
- Waking the phone, storing messages while it is offline, and showing the
  notification are done by Android and FCM, not by code we write and test.
- No extra battery use and no permanent "app is running" notification, because
  the app does not keep its own connection open.
- SOTI can grant the notification permission, so the steward is never asked at
  a bad moment.
- #413 and #414 use the same token, the same send function and the same rules,
  so the second one is mostly a new recipient list.

What becomes harder:

- Push does not work in Expo Go. Testing notifications needs a development
  build of the app on an Android phone, or on an emulator with Google Play. The
  rest of the team can keep using Expo Go, because the app skips registration
  there, and only people working on notifications need the development build.
  The build has to be redone when the app's native setup changes, not for normal
  code changes.
- New configuration: an Android package name and Firebase's
  `google-services.json` in the app, and a Firebase service account key on the
  server. The key is a secret and lives in `.env`, never in git.
- The notification text passes through Google. We keep it to what is shown on
  the screen.
- An alert is lost if the phone is offline for more than an hour. The state is
  not.

What this commits us to:

- Google as the delivery path for alerts. Moving away means a new channel in the
  app and the server, but the token storage and the send points stay.

## Alternatives considered

**Keep the app's own socket open in the background.** A foreground service
keeps the app running so the existing Socket.IO events arrive. It needs no third
party, but it does not meet the requirement: it stops when the steward swipes
the app away or the phone restarts, so a closed app gets nothing. Android
requires it to show a permanent notification and, from Android 14, to declare a
service type. It keeps the radio busy all shift, which costs battery. Expo has
no module for it, so we would write and maintain native code. And when the
phone is offline the server sends only to connected sockets, so an event sent
then is lost instead of stored.

**Polling or background tasks.** The app asks the server for changes now and
then. Android runs background tasks at most about every 15 minutes, so a
steward could learn that a scenario started a quarter of an hour late. That is
too late for an emergency scenario.

**Push through Expo's push service.** The server posts to Expo, and Expo
forwards to FCM. It needs a little less server code, but it adds Expo as a
second third party on top of Google, Expo gives no uptime guarantee, and the
notification text passes through one more company. Sending to FCM directly
keeps the dependency to Google alone.

## Notes

- Revisit this decision if Metro ever disables Google services on the steward
  phones, because FCM needs them.
- The 1-hour TTL is a first choice. It is longer than a tunnel dropout and
  short enough that a steward is not alerted about something old. If scenarios
  turn out to be shorter, or Metro wants old alerts kept, change the TTL, not
  the channel.
- Sources: Expo, "What you need to know about notifications" and the push
  notification FAQ (push needs a development build, not in Expo Go from SDK 53);
  Firebase, "Setting the lifespan of a message" (offline storage, TTL up to 28
  days, collapse keys); Android, "Foreground service types".
