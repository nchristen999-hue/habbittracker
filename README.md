# Overload

Täglicher Ziel-Tracker nach dem Prinzip **Progressive Overload**: Schaffst du ein Ziel mehrere Tage in Folge,
schlägt die App den nächsten Schritt vor (z. B. 100 → 110 Liegestütze, 2300 → 2250 kcal). Nie automatisch, immer mit „Annehmen“ / „Später“.

React + TypeScript + Vite · Tailwind CSS v4 · shadcn/ui-Komponenten (Radix, angepasst) · Zustand · localStorage · Lucide · dnd-kit · motion

## Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
npm test           # Unit-Tests für Streaks, Overload, Import (Vitest)
npm run lint       # oxlint
```

Beim ersten Start kannst du „Mit Beispieldaten testen“ wählen: 10 Wochen Verlauf inkl. offenem Overload-Vorschlag.

## Hosting (GitHub Pages)

`.github/workflows/pages.yml` testet, baut und veröffentlicht die App bei jedem Push.
Einmalig nötig: **Settings → Pages → Source: „GitHub Actions“**. Danach erreichbar unter
`https://nchristen999-hue.github.io/habbittracker/`.

## Funktionen

- **Zwei Zieltypen:** „Mindestens“ (Wert ≥ Ziel) und „Höchstens“/Limit (Wert ≤ Ziel, zählt erst, wenn etwas eingetragen ist).
- **Tages- und Wochenziele** (Wochenziele summieren Mo–So).
- **Heute-Ansicht:** Fortschrittsbalken, Quick-Add-Buttons (pro Ziel konfigurierbar), direkte Eingabe per Tipp auf die Zahl, Abhaken, Tage vor/zurück blättern.
- **Progressive Overload:** konfigurierbar pro Ziel (nach X Tagen/Wochen, Schrittgröße). Gezählt wird nur die Serie seit der letzten Zieländerung. Ist der heutige Tag schon geschafft, gilt das neue Ziel ab morgen.
- **Ziel-Historie:** jede Änderung wird mit Startdatum gespeichert; vergangene Tage werden mit dem damals gültigen Ziel bewertet.
- **Streaks:** aktuell + längste pro Ziel, „perfekte Tage“ (alle Tagesziele erfüllt), Meilensteine bei 7 / 30 / 100.
- **Ruhetage** pausieren Streaks, statt sie zu brechen. **Notizen** pro Tag.
- **Statistik:** Erfolgsquote, Verlaufs-Chart mit Ziel-Linie (Hover/Touch-Tooltip, Tabellenansicht), Kalender-Heatmap, persönliche Rekorde.
- **Drag-to-Reorder** in „Ziele“ (Maus, Touch, Tastatur), Archivieren, Löschen.
- **Backup:** Export/Import als JSON unter „Mehr“.
- Dark Mode als Standard, heller Modus optional.

## Projektstruktur

```
src/
  lib/          Datenmodell (types.ts), Logik (logic.ts), Persistenz (storage.ts), Datum, Icons
  store/        Zustand-Store mit persist-Middleware (localStorage-Key "overload:v1"), Demo-Daten, UI-State
  components/   UI-Grundbausteine (components/ui = shadcn-Stil) + Hintergrund, Reveal, HeroBeam
  features/     today / stats / goals / settings
```

Die gesamte Bewertungslogik (Streaks, Vorschläge, perfekte Tage) steckt in reinen Funktionen in `src/lib/logic.ts` und ist getestet.

## iOS-App mit Capacitor

Das Projekt ist dafür vorbereitet: relative Asset-Pfade (`base: './'`), Fonts lokal gebündelt (kein CDN),
`viewport-fit=cover` + Safe-Area-Insets, keine Router-URLs, `capacitor.config.json` liegt bereit.

```bash
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios      # öffnet Xcode (macOS erforderlich)
```

Nach jeder Web-Änderung: `npm run build && npx cap sync ios`.

Hinweis: In der WebView bleibt localStorage erhalten, iOS kann es aber bei Speicherknappheit räumen.
Für die App lohnt sich später ein Wechsel auf `@capacitor/preferences` – dafür nur den `storage` in
`src/store/useStore.ts` (`createJSONStorage`) austauschen. Regelmäßige JSON-Backups helfen bis dahin.
