import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { NEW_MEMBER, parseMemberInput, validateMember } from '@shared/congregation'
import { witaToday } from '@shared/dates'
import {
  BLOOD_TYPES,
  CATEGORICAL_GROUPS,
  CATEGORICAL_GROUP_LABELS,
  FAMILY_RELATIONS,
  FAMILY_RELATION_LABELS,
  GENDERS,
  GENDER_LABELS,
  MARRIAGE_STATUSES,
  MARRIAGE_STATUS_LABELS,
  MEMBER_STATUSES,
  MEMBER_STATUS_LABELS,
  type CategoricalGroup,
  type FamilyRelation,
  type Gender,
  type MarriageStatus,
  type MemberResponse,
  type MemberStatus,
  type MemberWithFamily,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api, errorMessage } from '@/lib/api'
import {
  EDUCATION_OPTIONS,
  ageOn,
  familyName,
  suggestCategoricalGroup,
  type FamilyChoice,
} from '@/lib/congregation'
import { cn } from '@/lib/utils'
import { FamilyPicker } from './family-picker'
import { describedBy, inputClass, selectClass } from '@/lib/form'
import { FieldError, FieldHint, FormSection } from './form-parts'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kosong berarti menambah anggota baru.
  member?: MemberWithFamily
  // KK tujuan yang sudah pasti, mis. saat menambah dari halaman rincian KK.
  family?: FamilyChoice
  // Isian awal anggota baru, mis. Kepala Keluarga dengan nama dari KK.
  preset?: { full_name?: string; family_relation?: FamilyRelation }
  onSaved: (member: MemberWithFamily, created: boolean) => void
}

// Urutan fokus saat ada kesalahan, mengikuti urutan field di form.
const FIELD_ORDER = [
  'full_name',
  'gender',
  'blood_type',
  'birth_place',
  'birth_date',
  'nik',
  'church_member_number',
  'family_id',
  'family_relation',
  'status',
  'categorical_group',
  'education',
  'occupation',
  'baptism_status',
  'baptism_date',
  'sidi_status',
  'sidi_date',
  'marriage_status',
  'marriage_date',
]

export function MemberFormDialog({ open, onOpenChange, member, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {member ? `Ubah profil ${member.full_name}` : 'Tambah anggota jemaat'}
          </DialogTitle>
          <DialogDescription>
            Yang wajib hanya nama, jenis kelamin, Kartu Keluarga, dan hubungan keluarga; data lain
            bisa dilengkapi kemudian.
          </DialogDescription>
        </DialogHeader>
        <MemberForm member={member} onCancel={() => onOpenChange(false)} {...props} />
      </DialogContent>
    </Dialog>
  )
}

function MemberForm({
  member,
  family: fixedFamily,
  preset,
  onCancel,
  onSaved,
}: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const educationListId = useId()
  const [today] = useState(witaToday)
  const [family, setFamily] = useState<FamilyChoice | null>(
    member
      ? {
          id: member.family_id,
          kk_number: member.kk_number,
          family_head_name: member.family_head_name,
          rayon_name: member.rayon_name,
        }
      : (fixedFamily ?? null),
  )
  const [gender, setGender] = useState<Gender | ''>(member?.gender ?? '')
  const [birthDate, setBirthDate] = useState(member?.birth_date ?? '')
  const [marriageStatus, setMarriageStatus] = useState<MarriageStatus | ''>(
    member?.marriage_status ?? '',
  )
  const [categorical, setCategorical] = useState<CategoricalGroup | ''>(
    member?.categorical_group ?? '',
  )
  const [baptized, setBaptized] = useState(member?.baptism_status ?? false)
  const [confirmed, setConfirmed] = useState(member?.sidi_status ?? false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const age = ageOn(birthDate || null, today)
  const married = marriageStatus !== '' && marriageStatus !== 'SINGLE'
  const suggestion = suggestCategoricalGroup({ age, gender, marriageStatus })

  function clearError(...fields: string[]) {
    if (!fields.some((field) => errors[field])) return
    const next = { ...errors }
    for (const field of fields) delete next[field]
    setErrors(next)
  }

  function focusFirstError(details: FieldErrors) {
    const field = FIELD_ORDER.find((name) => details[name])
    const element = field ? formRef.current?.elements.namedItem(field) : null
    if (element instanceof RadioNodeList) (element[0] as HTMLElement | undefined)?.focus()
    else if (element instanceof HTMLElement) element.focus()
    // KK yang sudah terpilih tidak punya field; tombol "Ganti"-nya yang difokuskan.
    else if (field === 'family_id') {
      formRef.current?.querySelector<HTMLElement>('[data-family] button')?.focus()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '')
    const body: Record<string, unknown> = {
      family_id: family?.id ?? null,
      church_member_number: text('church_member_number'),
      nik: text('nik'),
      full_name: text('full_name'),
      gender,
      birth_place: text('birth_place'),
      birth_date: birthDate,
      blood_type: text('blood_type'),
      family_relation: text('family_relation'),
      education: text('education'),
      occupation: text('occupation'),
      categorical_group: categorical,
      baptism_status: baptized,
      baptism_date: baptized ? text('baptism_date') : null,
      sidi_status: confirmed,
      sidi_date: confirmed ? text('sidi_date') : null,
      marriage_status: marriageStatus,
      marriage_date: married ? text('marriage_date') : null,
      status: text('status') || 'ACTIVE',
    }

    // Form selalu mengirim profil lengkap, jadi aturan anggota baru berlaku untuk
    // keduanya. Aturannya sama dengan API (src/shared/congregation.ts).
    const { input, details } = parseMemberInput(body, 'create', today)
    const placeholders = {
      family_id: 0,
      full_name: '',
      gender: 'MALE',
      family_relation: 'CHILD',
    } as const
    validateMember({ ...NEW_MEMBER, ...placeholders, ...input }, details)
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) return focusFirstError(details)

    setSubmitting(true)
    try {
      const result = member
        ? await api.put<MemberResponse>(`/members/${member.id}`, body)
        : await api.post<MemberResponse>('/members', body)
      onSaved(result.member, !member)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) {
        setErrors(err.details)
        focusFirstError(err.details)
      }
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const field = (name: string, label: string, control: ReactNode, hint?: ReactNode) => (
    <div className="grid content-start gap-2">
      <Label htmlFor={name}>{label}</Label>
      {control}
      {hint && <FieldHint id={`${name}-hint`}>{hint}</FieldHint>}
      <FieldError id={`${name}-error`} messages={errors[name]} />
    </div>
  )
  const a11y = (name: string, hasHint = false) => ({
    id: name,
    name,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': describedBy(errors, name, hasHint ? `${name}-hint` : undefined),
  })

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      onChange={({ target }: { target: EventTarget }) => {
        if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
          clearError(target.name)
        }
      }}
      className="grid gap-6"
    >
      <FormSection title="Identitas" className="border-t-0 pt-0 sm:grid-cols-2">
        <div className="sm:col-span-2">
          {field(
            'full_name',
            'Nama lengkap',
            <Input
              {...a11y('full_name')}
              defaultValue={member?.full_name ?? preset?.full_name ?? ''}
              autoComplete="off"
              className={inputClass}
            />,
          )}
        </div>
        <fieldset
          className="grid content-start gap-2"
          aria-describedby={describedBy(errors, 'gender')}
        >
          <legend className="mb-2 text-sm font-medium">Jenis kelamin</legend>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((value) => (
              <ChoicePill
                key={value}
                name="gender"
                value={value}
                checked={gender === value}
                invalid={Boolean(errors.gender)}
                onChange={() => setGender(value)}
              >
                {GENDER_LABELS[value]}
              </ChoicePill>
            ))}
          </div>
          <FieldError id="gender-error" messages={errors.gender} />
        </fieldset>
        {field(
          'blood_type',
          'Golongan darah',
          <select
            {...a11y('blood_type')}
            defaultValue={member?.blood_type ?? ''}
            className={selectClass}
          >
            <option value="">Belum diketahui</option>
            {BLOOD_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>,
        )}
        {field(
          'birth_place',
          'Tempat lahir',
          <Input
            {...a11y('birth_place')}
            defaultValue={member?.birth_place ?? ''}
            autoComplete="off"
            className={inputClass}
          />,
        )}
        {field(
          'birth_date',
          'Tanggal lahir',
          <Input
            {...a11y('birth_date', age !== null)}
            type="date"
            max={today}
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className={inputClass}
          />,
          age !== null && age >= 0 ? `Umur ${age} tahun` : undefined,
        )}
        {field(
          'nik',
          'NIK',
          <Input
            {...a11y('nik')}
            defaultValue={member?.nik ?? ''}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            className={cn(inputClass, 'tabular-nums')}
          />,
        )}
        {field(
          'church_member_number',
          'Nomor Induk Gereja',
          <Input
            {...a11y('church_member_number')}
            defaultValue={member?.church_member_number ?? ''}
            autoComplete="off"
            spellCheck={false}
            className={cn(inputClass, 'uppercase')}
          />,
        )}
      </FormSection>

      <FormSection title="Keluarga" className="sm:grid-cols-2">
        <div className="grid content-start gap-2 sm:col-span-2" data-family>
          {fixedFamily && !member ? (
            <>
              <p className="text-sm font-medium">Kartu Keluarga</p>
              <p className="text-sm">
                {familyName(fixedFamily)}{' '}
                <span className="text-muted-foreground">· Rayon {fixedFamily.rayon_name}</span>
              </p>
            </>
          ) : (
            <>
              <Label htmlFor="family_id">Kartu Keluarga</Label>
              <FamilyPicker
                value={family}
                onChange={(next) => {
                  setFamily(next)
                  clearError('family_id', 'family_relation')
                }}
                invalid={Boolean(errors.family_id)}
                describedById={describedBy(
                  errors,
                  'family_id',
                  member ? 'family_id-hint' : undefined,
                )}
              />
              {member && (
                <FieldHint id="family_id-hint">
                  Mengganti KK memindahkan {member.full_name} beserta rayonnya.
                </FieldHint>
              )}
            </>
          )}
          <FieldError id="family_id-error" messages={errors.family_id} />
        </div>
        {field(
          'family_relation',
          'Hubungan dalam keluarga',
          <select
            {...a11y('family_relation')}
            defaultValue={member?.family_relation ?? preset?.family_relation ?? ''}
            className={selectClass}
          >
            <option value="" disabled>
              Pilih hubungan
            </option>
            {FAMILY_RELATIONS.map((value) => (
              <option key={value} value={value}>
                {FAMILY_RELATION_LABELS[value]}
              </option>
            ))}
          </select>,
        )}
        {field(
          'status',
          'Status keanggotaan',
          <select
            {...a11y('status', true)}
            defaultValue={member?.status ?? 'ACTIVE'}
            className={selectClass}
          >
            {MEMBER_STATUSES.map((value: MemberStatus) => (
              <option key={value} value={value}>
                {MEMBER_STATUS_LABELS[value]}
              </option>
            ))}
          </select>,
          'Jemaat yang pindah atau meninggal tetap tercatat di KK-nya.',
        )}
      </FormSection>

      <FormSection title="Pelayanan & pekerjaan" className="sm:grid-cols-2">
        <fieldset
          className="grid content-start gap-2 sm:col-span-2"
          aria-describedby={describedBy(errors, 'categorical_group', 'categorical_group-hint')}
        >
          <legend className="mb-2 text-sm font-medium">Kategori pelayanan</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORICAL_GROUPS.map((value) => (
              <ChoicePill
                key={value}
                name="categorical_group"
                value={value}
                checked={categorical === value}
                invalid={Boolean(errors.categorical_group)}
                onChange={() => setCategorical(value)}
              >
                {CATEGORICAL_GROUP_LABELS[value]}
              </ChoicePill>
            ))}
            <ChoicePill
              name="categorical_group"
              value=""
              checked={categorical === ''}
              onChange={() => setCategorical('')}
            >
              Belum ada
            </ChoicePill>
          </div>
          <p id="categorical_group-hint" className="text-[0.8125rem] text-muted-foreground">
            {suggestion && suggestion !== categorical ? (
              <>
                Sesuai umur dan status nikah: {CATEGORICAL_GROUP_LABELS[suggestion]}.{' '}
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4"
                  onClick={() => setCategorical(suggestion)}
                >
                  Pakai {CATEGORICAL_GROUP_LABELS[suggestion]}
                </button>
              </>
            ) : (
              'PAR untuk anak dan remaja, Pemuda sampai menikah, Lansia mulai 60 tahun.'
            )}
          </p>
          <FieldError id="categorical_group-error" messages={errors.categorical_group} />
        </fieldset>
        {field(
          'education',
          'Pendidikan terakhir',
          <>
            <Input
              {...a11y('education')}
              list={educationListId}
              defaultValue={member?.education ?? ''}
              autoComplete="off"
              className={inputClass}
            />
            <datalist id={educationListId}>
              {EDUCATION_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </>,
        )}
        {field(
          'occupation',
          'Pekerjaan',
          <Input
            {...a11y('occupation')}
            defaultValue={member?.occupation ?? ''}
            autoComplete="off"
            className={inputClass}
          />,
        )}
      </FormSection>

      <FormSection title="Sakramen & pernikahan" className="sm:grid-cols-2">
        <CheckField
          name="baptism_status"
          label="Sudah dibaptis"
          checked={baptized}
          invalid={Boolean(errors.baptism_status)}
          onChange={(checked) => {
            setBaptized(checked)
            // Sidi hanya untuk yang sudah dibaptis.
            if (!checked) setConfirmed(false)
            clearError('baptism_date', 'sidi_status')
          }}
          error={<FieldError id="baptism_status-error" messages={errors.baptism_status} />}
        />
        {field(
          'baptism_date',
          'Tanggal baptis',
          <Input
            {...a11y('baptism_date')}
            type="date"
            max={today}
            min={birthDate || undefined}
            disabled={!baptized}
            defaultValue={member?.baptism_date ?? ''}
            className={inputClass}
          />,
        )}
        <CheckField
          name="sidi_status"
          label="Sudah sidi"
          hint={baptized ? undefined : 'Centang "Sudah dibaptis" dulu.'}
          checked={confirmed}
          disabled={!baptized}
          invalid={Boolean(errors.sidi_status)}
          onChange={(checked) => {
            setConfirmed(checked)
            clearError('sidi_date')
          }}
          error={<FieldError id="sidi_status-error" messages={errors.sidi_status} />}
        />
        {field(
          'sidi_date',
          'Tanggal sidi',
          <Input
            {...a11y('sidi_date')}
            type="date"
            max={today}
            min={birthDate || undefined}
            disabled={!confirmed}
            defaultValue={member?.sidi_date ?? ''}
            className={inputClass}
          />,
        )}
        {field(
          'marriage_status',
          'Status pernikahan',
          <select
            {...a11y('marriage_status')}
            value={marriageStatus}
            onChange={(event) => {
              setMarriageStatus(event.target.value as MarriageStatus | '')
              clearError('marriage_date')
            }}
            className={selectClass}
          >
            <option value="">Belum diisi</option>
            {MARRIAGE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {MARRIAGE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>,
        )}
        {field(
          'marriage_date',
          'Tanggal pemberkatan nikah',
          <Input
            {...a11y('marriage_date')}
            type="date"
            max={today}
            min={birthDate || undefined}
            disabled={!married}
            defaultValue={member?.marriage_date ?? ''}
            className={inputClass}
          />,
        )}
      </FormSection>

      <div role="alert" aria-live="assertive">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 rounded-b-lg border-t bg-popover px-4 py-3">
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Menyimpan…' : member ? 'Simpan profil' : 'Tambah anggota'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Radio berbentuk tombol untuk pilihan pendek (jenis kelamin, kategori pelayanan).
function ChoicePill({
  name,
  value,
  checked,
  invalid,
  onChange,
  children,
}: {
  name: string
  value: string
  checked: boolean
  invalid?: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label
      className={cn(
        'flex h-10 cursor-pointer items-center justify-center rounded-lg border border-input bg-card px-3.5 text-sm',
        'has-checked:border-primary has-checked:font-medium has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
        invalid && 'border-destructive',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        aria-invalid={invalid}
        className="sr-only"
      />
      <span className="whitespace-nowrap">{children}</span>
    </label>
  )
}

function CheckField({
  name,
  label,
  hint,
  checked,
  disabled,
  invalid,
  onChange,
  error,
}: {
  name: string
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  invalid?: boolean
  onChange: (checked: boolean) => void
  error: ReactNode
}) {
  return (
    <div className="grid content-start gap-2 sm:pt-7">
      <label
        className={cn(
          'flex h-10 items-center gap-2.5 text-sm',
          disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer',
        )}
      >
        <input
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={invalid}
          aria-describedby={hint ? `${name}-hint` : undefined}
          className="size-4 accent-primary"
        />
        {label}
      </label>
      {hint && <FieldHint id={`${name}-hint`}>{hint}</FieldHint>}
      {error}
    </div>
  )
}
