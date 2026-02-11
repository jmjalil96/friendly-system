import { Upload } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function ClaimDocumentsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 sm:gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-blue-300)] text-base font-bold text-white sm:size-11 sm:rounded-2xl sm:text-lg">
            03
          </span>
          <span className="text-[var(--color-gray-900)]">Documentos</span>
        </CardTitle>
        <CardDescription className="pl-12 sm:pl-14">
          Adjunta facturas, órdenes médicas u otros soportes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--color-blue-300)]/25 bg-[var(--color-blue-50)]/30 px-6 py-10 opacity-50 cursor-not-allowed">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-blue-50)]">
            <Upload className="size-5 text-[var(--color-blue-300)]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--color-gray-500)]">
              Arrastra archivos aquí o haz click para subir
            </p>
            <p className="mt-1 text-xs text-[var(--color-gray-400)]">
              PDF, imágenes o documentos (máx. 10MB)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
