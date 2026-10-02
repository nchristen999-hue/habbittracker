import { Download, FlaskConical, Moon, PartyPopper, Sun, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Reveal } from '@/components/Reveal'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { downloadBackup } from '@/lib/storage'
import { selectData, useStore } from '@/store/useStore'

export function SettingsView() {
  const settings = useStore((s) => s.settings)
  const setTheme = useStore((s) => s.setTheme)
  const setConfetti = useStore((s) => s.setConfetti)
  const importData = useStore((s) => s.importData)
  const loadDemo = useStore((s) => s.loadDemo)
  const reset = useStore((s) => s.reset)
  const goalCount = useStore((s) => s.goals.length)
  const dayCount = useStore((s) => Object.keys(s.days).length)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const onImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text())
      importData(json)
      toast.success('Sicherung importiert', { description: file.name })
    } catch (e) {
      toast.error('Import fehlgeschlagen', { description: e instanceof Error ? e.message : 'Datei nicht lesbar.' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="px-1 pt-2">
        <h1 className="text-3xl font-semibold">
          Ein<span className="font-serif font-normal italic tracking-normal text-accent-gradient">stellungen</span>
        </h1>
        <p className="mt-1 text-sm text-fg-3">
          {goalCount} Ziele · {dayCount} Tage mit Einträgen · alles lokal auf diesem Gerät
        </p>
      </header>

      <Reveal>
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Darstellung</CardTitle>
              <CardDescription>Dunkel ist Standard.</CardDescription>
            </div>
            <Segmented
              ariaLabel="Farbschema"
              value={settings.theme}
              onChange={setTheme}
              options={[
                { value: 'dark', label: (<><Moon /> Dunkel</>) },
                { value: 'light', label: (<><Sun /> Hell</>) },
              ]}
            />
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-line pt-4">
            <span className="flex items-center gap-3">
              <PartyPopper className="size-5 text-fg-3" aria-hidden />
              <span>
                <span className="block text-sm font-semibold">Konfetti beim Abhaken</span>
                <span className="block text-[13px] text-fg-3">Kurz und sparsam.</span>
              </span>
            </span>
            <Switch checked={settings.confetti} onCheckedChange={setConfetti} aria-label="Konfetti" />
          </label>
        </Card>
      </Reveal>

      <Reveal>
        <Card className="flex flex-col gap-4">
          <div>
            <CardTitle>Backup</CardTitle>
            <CardDescription>Exportiere deine Daten als JSON. Beim Import werden die aktuellen Daten ersetzt.</CardDescription>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                downloadBackup(selectData(useStore.getState()))
                toast('Backup erstellt')
              }}
            >
              <Download /> Exportieren
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload /> Importieren
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImport(f)
              e.target.value = ''
            }}
          />
        </Card>
      </Reveal>

      <Reveal>
        <Card className="flex flex-col gap-4">
          <div>
            <CardTitle>Daten</CardTitle>
            <CardDescription>Beispieldaten zeigen 10 Wochen Verlauf. Beides ersetzt deine Einträge.</CardDescription>
          </div>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => {
              loadDemo()
              toast('Beispieldaten geladen')
            }}
          >
            <FlaskConical /> Beispieldaten laden
          </Button>
          {confirmReset ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Abbrechen
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  reset()
                  setConfirmReset(false)
                  toast('Alle Daten gelöscht')
                }}
              >
                Ja, alles löschen
              </Button>
            </div>
          ) : (
            <Button variant="ghost" className="justify-start text-danger hover:text-danger" onClick={() => setConfirmReset(true)}>
              <Trash2 /> Alle Daten löschen
            </Button>
          )}
        </Card>
      </Reveal>

      <p className="px-1 text-center text-[12px] text-fg-3">Overload 0.1 · Kein Konto, keine Cloud.</p>
    </div>
  )
}
