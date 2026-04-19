import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DEFAULT_CATEGORIES, getDocumentById, getDocumentTypes, upsertDocument } from '../services/documentStore'
import type { DocumentListRecord, DocumentStatusBadge } from '../types/documents'

interface UploadEditPageProps {
  mode: 'create' | 'edit'
}

interface FormState {
  name: string
  issuer: string
  code: string
  revision_date: string
  format_type: 'pdf' | 'paper' | 'hybrid'
  status_badge: DocumentStatusBadge
  status: 'active' | 'archived'
  doc_type: string
  categories: string[]
  locations: string
  notes: string
  hazard_tags: string
  pdf_url: string
  audience: string
}

const emptyForm: FormState = {
  name: '',
  issuer: '',
  code: '',
  revision_date: '',
  format_type: 'pdf',
  status_badge: 'active',
  status: 'active',
  doc_type: 'Policy',
  categories: [],
  locations: '',
  notes: '',
  hazard_tags: '',
  pdf_url: '',
  audience: '',
}

export default function UploadEditPage({ mode }: UploadEditPageProps) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const docTypes = useMemo(() => getDocumentTypes(), [])

  useEffect(() => {
    if (mode !== 'edit') return
    const item = getDocumentById(id)
    if (!item) return

    setForm({
      name: item.name,
      issuer: item.issuer,
      code: item.code,
      revision_date: item.revision_date,
      format_type: item.format_type,
      status_badge: item.status_badge,
      status: item.status,
      doc_type: item.doc_type,
      categories: item.categories,
      locations: item.locations.join(', '),
      notes: item.notes,
      hazard_tags: item.hazard_tags.join(', '),
      pdf_url: item.pdf_url,
      audience: item.audience.join(', '),
    })
  }, [id, mode])

  function toggleCategory(category: string) {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(item => item !== category)
        : [...prev.categories, category],
    }))
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setForm(prev => ({ ...prev, pdf_url: objectUrl }))
    setError('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!form.name || !form.issuer || !form.code || !form.revision_date || !form.pdf_url) {
      setError('Name, issuer, code, revision date, and PDF are required.')
      return
    }

    const doc: DocumentListRecord = {
      id: mode === 'edit' ? id : `doc-${crypto.randomUUID()}`,
      name: form.name,
      issuer: form.issuer,
      code: form.code,
      revision_date: form.revision_date,
      format_type: form.format_type,
      status_badge: form.status_badge,
      status: form.status,
      doc_type: form.doc_type,
      categories: form.categories,
      locations: form.locations.split(',').map(item => item.trim()).filter(Boolean),
      notes: form.notes,
      hazard_tags: form.hazard_tags.split(',').map(item => item.trim()).filter(Boolean),
      pdf_url: form.pdf_url,
      audience: form.audience.split(',').map(item => item.trim()).filter(Boolean),
    }

    upsertDocument(doc)
    navigate('/admin/library')
  }

  return (
    <div className="space-y-4">
      <section className="card-shell flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--brand-navy)]">{mode === 'create' ? 'Upload Document' : 'Edit Document'}</h2>
          <p className="text-sm text-slate-600">Manage metadata and source PDF for library records.</p>
        </div>
        <Link to="/admin/library" className="btn-lite">Back to Library</Link>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className="card-shell space-y-3">
          <div
            onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-[3px] border-2 border-dashed p-6 text-center ${dragActive ? 'border-[var(--accent-bg)] bg-blue-50' : 'border-slate-300'}`}
          >
            <p className="font-semibold">PDF Drag & Drop Upload</p>
            <p className="text-sm text-slate-500">Drop a PDF here to update the document viewer URL.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(value) => setForm(prev => ({ ...prev, name: value }))} />
            <Input label="Issuer" value={form.issuer} onChange={(value) => setForm(prev => ({ ...prev, issuer: value }))} />
            <Input label="Code / ID" value={form.code} onChange={(value) => setForm(prev => ({ ...prev, code: value }))} mono />
            <Input label="Revision Date" type="date" value={form.revision_date} onChange={(value) => setForm(prev => ({ ...prev, revision_date: value }))} />
            <Select
              label="Physical Type / Format"
              value={form.format_type}
              onChange={(value) => setForm(prev => ({ ...prev, format_type: value as FormState['format_type'] }))}
              options={['pdf', 'paper', 'hybrid']}
            />
            <Select
              label="Status Badge"
              value={form.status_badge}
              onChange={(value) => setForm(prev => ({ ...prev, status_badge: value as FormState['status_badge'] }))}
              options={['active', 'archived', 'draft']}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(value) => setForm(prev => ({ ...prev, status: value as FormState['status'] }))}
              options={['active', 'archived']}
            />
            <Select
              label="Document Type"
              value={form.doc_type}
              onChange={(value) => setForm(prev => ({ ...prev, doc_type: value }))}
              options={docTypes.map(item => item.name)}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Categories (multi-select)</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-[3px] border px-2 py-1 text-sm ${form.categories.includes(cat) ? 'border-[var(--accent-bg)] bg-blue-100' : 'border-slate-300 bg-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card-shell space-y-3">
          <Input label="Locations (tag input, comma separated)" value={form.locations} onChange={(value) => setForm(prev => ({ ...prev, locations: value }))} />
          <Input label="Audience (comma separated)" value={form.audience} onChange={(value) => setForm(prev => ({ ...prev, audience: value }))} />
          <Input label="Hazard / Warning Tags (optional)" value={form.hazard_tags} onChange={(value) => setForm(prev => ({ ...prev, hazard_tags: value }))} />
          <Input label="PDF URL" value={form.pdf_url} onChange={(value) => setForm(prev => ({ ...prev, pdf_url: value }))} />
          <label className="space-y-1 text-sm font-semibold">
            <span>Notes</span>
            <textarea className="input-shell min-h-32" value={form.notes} onChange={(event) => setForm(prev => ({ ...prev, notes: event.target.value }))} />
          </label>

          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

          <button type="submit" className="btn-primary w-full">
            {mode === 'create' ? 'Save New Document' : 'Update Document'}
          </button>
        </section>
      </form>
    </div>
  )
}

interface InputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  mono?: boolean
}

function Input({ label, value, onChange, type = 'text', mono = false }: InputProps) {
  return (
    <label className="space-y-1 text-sm font-semibold">
      <span>{label}</span>
      <input type={type} className={`input-shell ${mono ? 'font-mono' : ''}`} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

interface SelectProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="space-y-1 text-sm font-semibold">
      <span>{label}</span>
      <select className="input-shell" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
