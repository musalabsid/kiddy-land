# Define language and localization scope

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: —
Map: ../map.md

## Question

Which languages must v1 support, what is the default locale, and how should localization cover the PWA/desktop UI, receipts and tickets, dates/currency, server alerts, and any future voice output? The SRS names Bahasa Indonesia and the expanded specification exposes language settings; English support is not yet explicit.

## Comments

## Answer

V1 supports both Bahasa Indonesia and English. Bahasa Indonesia is the default for a new installation, and the Owner may change the venue fallback later. Each Staff User may choose a preferred language; when no user is present, a Paired Device uses its configured language or the venue default.

UI labels, system alerts, QR tickets, and receipts follow the active user language, then device/venue fallback. Names, business data, and stored values are not translated. Indonesian Rupiah (IDR/Rp) is fixed for v1; language changes affect number/date presentation only, not the underlying amount or currency.

Voice announcements remain out of scope for v1. If voice is introduced later, it will require its own localized voice decision.
