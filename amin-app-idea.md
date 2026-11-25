# Amin — App Idea

## What it is

Amin is a mobile-first safety app for Morocco. It helps people feel safer when moving around, and it gives communities a way to flag problem areas, without tracking anyone's daily movements or ranking neighborhoods as "safe" or "unsafe."

The name Amin (أمين) means "trustworthy" in Arabic.

## The problem

- People walking home, taking a taxi, or traveling alone at night want a simple way to let someone know where they are, just in case.
- Theft, harassment, and suspicious activity often go unreported, so other people have no way to know a street or area has had recent problems.
- Most "safety map" apps either track people's movement history (a privacy risk) or reduce a whole neighborhood to a single danger score (often unfair and misleading, since busy areas just get more reports).

Amin is built to avoid both of those problems.

## Who it's for

Anyone who wants a bit more peace of mind while moving around: students, women commuting alone, families, delivery workers, and night-shift workers.

## Core features

### 1. Share your trip, your way
Instead of maintaining a saved list of "trusted contacts" inside the app, Amin generates a one-time, private link for each trip. You share that link through whatever app you already use (WhatsApp, SMS, Messages) using your phone's own share menu. Whoever you send it to can see your live status until the trip ends, and the link stops working automatically once it does. Nothing is kept afterward.

If something feels wrong, one button sends an alert with your trip link and the emergency numbers (DGSN: 19, Gendarmerie: 177) through the same share menu.

### 2. Report an incident
Report theft, harassment, or suspicious activity by picking a street or neighborhood and a time of day, not an exact location. Reports can stay anonymous. A reminder always points to the real emergency numbers for anything urgent.

### 3. One map for zones and routes
A single map screen shows reported activity as a heat map over streets and neighborhoods, color-coded by how many reports an area has received, not by a danger rating. Areas with too few reports simply show "not enough reports yet." The same screen lets you plan a route and see informational notes for the areas along the way; it's one map, not two separate screens.

### 4. Everything stays unverified, and says so
Every piece of community-reported data is labeled "user-reported, unverified." Amin never claims to know the truth of a report, and it never tells you an area is officially dangerous.

## What Amin deliberately does not do

- It does not build a history of where any individual usually goes.
- It does not store a contact list; sharing happens fresh, per trip, through your own apps.
- It does not score or rank neighborhoods as safe or unsafe.
- It does not replace the police. Every safety feature points back to the real emergency numbers.

## Design principles

- **Calm, not alarming.** No fear-based colors or language.
- **Privacy by default.** Collect the least data needed, delete it as soon as it's no longer needed.
- **Honest data.** Show counts and context, not false certainty.
- **Local fit.** Supports Arabic, Darija, and French, with Moroccan emergency numbers built in.

## What's next

The current build plan covers trip sharing, incident reporting, and the combined zone/route map as the first real version. Later phases could add route-based alerts, partnerships with local associations to help validate reports, and support for satellite-based messaging once that technology becomes available in Morocco.
