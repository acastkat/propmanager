
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MainLayout from '../layouts/MainLayout'
import DatePicker from '../components/DatePicker'

const TIPOS_SERVICIO = ['Luz', 'Gas', 'Agua', 'Expensas', 'Internet']

const statusColors = {
  pagado:    { text: 'text-green-700', bg: 'bg-green-50',  dot: 'bg-green-600'  },
  pendiente: { text: 'text-amber-700', bg: 'bg-amber-50',  dot: 'bg-amber-500'  },
  vencido:   { text: 'text-red-700',   bg: 'bg-red-50',    dot: 'bg-red-500'    },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR')
}

function calcStatus(dueDate, paidByOwner, paidByTenant) {
  if (paidByOwner || paidByTenant) return 'pagado'
  if (!dueDate) return 'pendiente'
  const today = new Date()
  const due   = new Date(dueDate)
  return due < today ? 'vencido' : 'pendiente'
}

export default function Services({ session }) {
  const [profile, setProfile]                   = useState(null)
  const [services, setServices]                 = useState([])
  const [properties, setProperties]             = useState([])
  const [loading, setLoading]                   = useState(true)
  const [showForm, setShowForm]                 = useState(false)
  const [selectedService, setSelectedService]   = useState(null)
  const [editMode, setEditMode]                 = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal]   = useState(false)

  const emptyForm = {
    property_id: '', type: '',
    period_from: '', period_to: '', due_date: '', amount: '',
    paid_by_owner: false, owner_payment_date: '',
    paid_by_tenant: false, tenant_payment_date: '',
    invoice_file: null, receipt_file: null, receipt_number: '',
  }

  const [form, setForm]         = useState(emptyForm)
  const [editForm, setEditForm] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: profileData } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    const { data: propertiesData } = await supabase
      .from('properties').select('*').eq('user_id', session.user.id)
    const propIds = (propertiesData || []).map(p => p.id)
    const { data: servicesData } = await supabase
      .from('services').select('*, properties(name, services)')
      .in('property_id', propIds.length > 0 ? propIds : ['none'])
      .order('due_date', { ascending: true })
    setProfile(profileData)
    setProperties(propertiesData || [])
    setServices(servicesData || [])
    setLoading(false)
  }

  const propiedadesFiltradas = (tipoServicio) => {
    if (!tipoServicio) return properties
    return properties.filter(p =>
      (p.services || []).map(s => s.toLowerCase()).includes(tipoServicio.toLowerCase())
    )
  }

  const uploadFile = async (file, bucket) => {
    if (!file) return null
    const ext      = file.name.split('.').pop()
    const fileName = `${session.user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(fileName, file)
    if (error) return null
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)
    const invoiceUrl = await uploadFile(form.invoice_file, 'invoices')
    const receiptUrl = form.paid_by_owner || form.paid_by_tenant
      ? await uploadFile(form.receipt_file, 'receipts') : null
    const status = calcStatus(form.due_date, form.paid_by_owner, form.paid_by_tenant)
    const { error } = await supabase.from('services').insert({
      property_id: form.property_id, type: form.type,
      period_from: form.period_from || null, period_to: form.period_to || null,
      due_date: form.due_date || null,
      amount: form.amount ? parseFloat(form.amount) : null,
      paid_by_owner: form.paid_by_owner,
      owner_payment_date: form.paid_by_owner ? form.owner_payment_date || null : null,
      paid_by_tenant: form.paid_by_tenant,
      tenant_payment_date: form.paid_by_tenant ? form.tenant_payment_date || null : null,
      invoice_url: invoiceUrl, receipt_url: receiptUrl,
      receipt_number: form.receipt_number || null, status,
    })
    setUploading(false)
    if (!error) { setShowForm(false); setForm(emptyForm); fetchData() }
  }

  const handleEditSubmit = async () => {
    setShowConfirmModal(false)
    setUploading(true)
    let invoiceUrl = editForm.invoice_url
    let receiptUrl = editForm.receipt_url
    if (editForm.invoice_file) invoiceUrl = await uploadFile(editForm.invoice_file, 'invoices')
    if (editForm.receipt_file) receiptUrl = await uploadFile(editForm.receipt_file, 'receipts')
    const status = calcStatus(editForm.due_date, editForm.paid_by_owner, editForm.paid_by_tenant)
    await supabase.from('services').update({
      property_id: editForm.property_id, type: editForm.type,
      period_from: editForm.period_from || null, period_to: editForm.period_to || null,
      due_date: editForm.due_date || null,
      amount: editForm.amount ? parseFloat(editForm.amount) : null,
      paid_by_owner: editForm.paid_by_owner,
      owner_payment_date: editForm.paid_by_owner ? editForm.owner_payment_date || null : null,
      paid_by_tenant: editForm.paid_by_tenant,
      tenant_payment_date: editForm.paid_by_tenant ? editForm.tenant_payment_date || null : null,
      invoice_url: invoiceUrl, receipt_url: receiptUrl,
      receipt_number: editForm.receipt_number || null, status,
    }).eq('id', selectedService.id)
    setUploading(false)
    setEditMode(false)
    setEditForm(null)
    await fetchData()
    const { data } = await supabase.from('services')
      .select('*, properties(name, services)').eq('id', selectedService.id).single()
    setSelectedService(data)
  }

  const handleDelete = async () => {
    setShowDeleteModal(false)
    await supabase.from('services').delete().eq('id', selectedService.id)
    setSelectedService(null)
    fetchData()
  }

  const startEdit = () => {
    setEditForm({
      property_id:         selectedService.property_id,
      type:                selectedService.type               || '',
      period_from:         selectedService.period_from        || '',
      period_to:           selectedService.period_to          || '',
      due_date:            selectedService.due_date           || '',
      amount:              selectedService.amount             || '',
      paid_by_owner:       selectedService.paid_by_owner      || false,
      owner_payment_date:  selectedService.owner_payment_date || '',
      paid_by_tenant:      selectedService.paid_by_tenant     || false,
      tenant_payment_date: selectedService.tenant_payment_date|| '',
      invoice_url:         selectedService.invoice_url        || null,
      receipt_url:         selectedService.receipt_url        || null,
      receipt_number:      selectedService.receipt_number     || '',
      invoice_file:        null, receipt_file: null,
    })
    setEditMode(true)
  }

  // ── ServiceForm definido FUERA del componente principal ──
  // (se pasa como prop para evitar remount)
  const serviceFormProps = { properties, propiedadesFiltradas, uploading }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-stone-400 text-sm">Cargando...</p>
    </div>
  )

  if (selectedService) {
    const colors = statusColors[selectedService.status] || statusColors.pendiente
    return (
      <MainLayout session={session} role={profile?.role}>
        <div className="p-8">
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
                <p className="text-lg font-semibold text-stone-800 mb-2">Modificar servicio</p>
                <p className="text-sm text-stone-500 mb-6">Estas a punto de modificar los datos de este servicio. Queres continuar?</p>
                <div className="flex gap-3">
                  <button onClick={handleEditSubmit} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Aceptar</button>
                  <button onClick={() => setShowConfirmModal(false)} className="flex-1 border border-stone-200 text-stone-500 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors">Cancelar</button>
                </div>
              </div>
            </div>
          )}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
                <p className="text-lg font-semibold text-stone-800 mb-2">Eliminar servicio</p>
                <p className="text-sm text-stone-500 mb-6">
                  Estas a punto de eliminar de forma definitiva el registro de{' '}
                  <span className="font-semibold text-stone-800">{selectedService.type}</span>{' '}
                  de <span className="font-semibold text-stone-800">{selectedService.properties?.name}</span>.
                  Esta accion no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleDelete} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">Aceptar</button>
                  <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-stone-200 text-stone-500 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors">Cancelar</button>
                </div>
              </div>
            </div>
          )}
          <button onClick={() => { setSelectedService(null); setEditMode(false); setEditForm(null) }}
            className="text-sm text-stone-400 hover:text-stone-600 mb-6 flex items-center gap-2"
          >&larr; Volver a Gestion de servicios</button>
          <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-blue-900">{selectedService.type} — {selectedService.properties?.name}</h1>
              <p className="text-sm text-blue-600 mt-1">Vencimiento: {formatDate(selectedService.due_date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-4 py-1.5 rounded-full font-medium ${colors.text} ${colors.bg}`}>{selectedService.status}</span>
              {!editMode && <button onClick={startEdit} className="text-sm text-blue-600 border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Editar</button>}
              <button onClick={() => setShowDeleteModal(true)} className="text-sm text-red-500 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Eliminar</button>
            </div>
          </div>
          {editMode && editForm ? (
            <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
              <h2 className="text-sm font-medium text-stone-700 mb-6">Editando servicio</h2>
              <ServiceForm data={editForm} setData={setEditForm} {...serviceFormProps}
                onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true) }}
                onCancel={() => { setEditMode(false); setEditForm(null) }}
                submitLabel="Guardar cambios"
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="text-sm font-medium text-stone-700 mb-4">Detalle del servicio</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { k: 'Propiedad',     v: selectedService.properties?.name },
                  { k: 'Tipo',          v: selectedService.type },
                  { k: 'Periodo',       v: selectedService.period_from ? `${formatDate(selectedService.period_from)} — ${formatDate(selectedService.period_to)}` : '—' },
                  { k: 'Vencimiento',   v: formatDate(selectedService.due_date) },
                  { k: 'Importe',       v: selectedService.amount ? `$ ${parseFloat(selectedService.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—' },
                  { k: 'Estado',        v: selectedService.status },
                  { k: 'Pagado (prop.)',v: selectedService.paid_by_owner  ? `Si — ${formatDate(selectedService.owner_payment_date)}`  : 'No' },
                  { k: 'Pagado (inq.)', v: selectedService.paid_by_tenant ? `Si — ${formatDate(selectedService.tenant_payment_date)}` : 'No' },
                  selectedService.receipt_number && { k: 'Nro. comprobante', v: selectedService.receipt_number },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} className="bg-stone-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-stone-400 mb-1">{row.k}</p>
                    <p className="text-sm font-medium text-stone-800 capitalize">{row.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-stone-100 pt-6">
                <h3 className="text-sm font-medium text-stone-700 mb-4">Archivos</h3>
                <div className="space-y-4">
                  {selectedService.invoice_url ? (
                    <div>
                      <p className="text-xs text-stone-400 mb-2">{selectedService.invoice_url.split('/').pop()}</p>
                      <a href={selectedService.invoice_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium">Ver factura →</a>
                    </div>
                  ) : <p className="text-sm text-stone-400">Sin factura</p>}
                  {selectedService.receipt_url && (
                    <div>
                      <p className="text-xs text-stone-400 mb-2">{selectedService.receipt_url.split('/').pop()}</p>
                      <a href={selectedService.receipt_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium">Ver comprobante →</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout session={session} role={profile?.role}>
      <div className="p-8">
        <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-blue-900">Gestion de servicios</h1>
            <p className="text-sm text-blue-600 mt-1">Todas las propiedades</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setForm(emptyForm) }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >+ Nueva factura</button>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { val: services.filter(s => s.status === 'pendiente').length, lbl: 'Pendientes de pago', accent: 'bg-amber-500' },
            { val: services.filter(s => s.status === 'vencido').length,   lbl: 'Vencidos',           accent: 'bg-red-500'   },
            { val: services.filter(s => s.status === 'pagado').length,    lbl: 'Pagados',            accent: 'bg-green-600' },
          ].map((st, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-200 p-5 flex items-center gap-4">
              <div className={`w-1 h-10 rounded-full ${st.accent}`} />
              <div>
                <p className="text-2xl font-semibold text-stone-800">{st.val}</p>
                <p className="text-sm text-stone-400">{st.lbl}</p>
              </div>
            </div>
          ))}
        </div>
        {showForm && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
            <h2 className="text-sm font-medium text-stone-700 mb-6">Registrar nueva factura</h2>
            <ServiceForm data={form} setData={setForm} {...serviceFormProps}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setForm(emptyForm) }}
              submitLabel="Guardar servicio"
            />
          </div>
        )}
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Registros de servicios</p>
          </div>
          {services.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-2xl mb-3">⚡</p>
              <p className="text-sm text-stone-400">No hay servicios registrados todavia</p>
            </div>
          ) : (
            services.map((svc, i) => {
              const colors = statusColors[svc.status] || statusColors.pendiente
              return (
                <div key={svc.id} onClick={() => setSelectedService(svc)}
                  className={`flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-stone-50 transition-colors ${i < services.length - 1 ? 'border-b border-stone-100' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800">{svc.type} — {svc.properties?.name}</p>
                    <p className="text-xs text-stone-400">
                      Vence {formatDate(svc.due_date)}
                      {svc.paid_by_tenant && ' · Abonado por inquilino'}
                      {svc.invoice_url && ' · Factura'}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-stone-800">
                    {svc.amount ? `$ ${parseFloat(svc.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'}
                  </p>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${colors.text} ${colors.bg}`}>{svc.status}</span>
                  <span className="text-stone-300 text-sm">→</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </MainLayout>
  )
}

// ── ServiceForm definido FUERA del componente principal ──────
function ServiceForm({ data, setData, properties, propiedadesFiltradas, uploading, onSubmit, onCancel, submitLabel }) {
  const propsFiltradas = propiedadesFiltradas(data.type)
  const inquilino = properties.find(p => p.id === data.property_id)?.status === 'alquilada'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-stone-500 block mb-1">Tipo de servicio <span className="text-red-400">*</span></label>
          <select required value={data.type}
            onChange={e => setData({ ...data, type: e.target.value, property_id: '' })}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar...</option>
            {TIPOS_SERVICIO.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">Propiedad <span className="text-red-400">*</span></label>
          <select required value={data.property_id}
            onChange={e => setData({ ...data, property_id: e.target.value })}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!data.type}
          >
            <option value="">
              {!data.type ? 'Primero selecciona un servicio'
                : propsFiltradas.length === 0 ? 'Ninguna propiedad tiene este servicio'
                : 'Seleccionar...'}
            </option>
            {propsFiltradas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {data.type && propsFiltradas.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Ninguna propiedad tiene registrado el servicio "{data.type}". Podes agregarlo desde Propiedades.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DatePicker
          label="Periodo — Desde"
          value={data.period_from}
          onChange={val => setData({ ...data, period_from: val })}
        />
        <DatePicker
          label="Periodo — Hasta"
          value={data.period_to}
          onChange={val => setData({ ...data, period_to: val })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DatePicker
          label="Fecha de vencimiento"
          value={data.due_date}
          onChange={val => setData({ ...data, due_date: val })}
        />
        <div>
          <label className="text-xs text-stone-500 block mb-1">Importe ($)</label>
          <input type="number" value={data.amount}
            onChange={e => setData({ ...data, amount: e.target.value })}
            placeholder="23800"
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-stone-500 block mb-1">
          Factura <span className="text-stone-300">(PDF o imagen)</span>
        </label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => setData({ ...data, invoice_file: e.target.files[0] })}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
        />
        {data.invoice_url && !data.invoice_file && (
          <div>
            <p className="text-xs text-blue-600 mb-2 font-medium">{data.invoice_url.split('/').pop()}</p>
            <a href={data.invoice_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-block">Ver factura cargada →</a>
          </div>
        )}
      </div>

      {/* Toggle pagado propietario */}
      <div className="border border-stone-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-700">Ya fue abonado</p>
            <p className="text-xs text-stone-400">El pago lo hiciste vos</p>
          </div>
          <button type="button"
            onClick={() => setData({ ...data, paid_by_owner: !data.paid_by_owner })}
            className={`w-10 h-6 rounded-full transition-colors relative ${data.paid_by_owner ? 'bg-blue-600' : 'bg-stone-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${data.paid_by_owner ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
        {data.paid_by_owner && (
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <DatePicker
              label="Fecha en que lo abonaste"
              value={data.owner_payment_date}
              onChange={val => setData({ ...data, owner_payment_date: val })}
            />
            <div>
              <label className="text-xs text-stone-500 block mb-1">
                Comprobante de pago <span className="text-stone-300">(opcional)</span>
              </label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setData({ ...data, receipt_file: e.target.files[0] })}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
              />
              {data.receipt_url && !data.receipt_file && (
                <div>
                  <p className="text-xs text-blue-600 mb-2 font-medium">{data.receipt_url.split('/').pop()}</p>
                  <a href={data.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-block">Ver comprobante cargado →</a>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">
                Nro. de comprobante <span className="text-stone-300">(opcional)</span>
              </label>
              <input value={data.receipt_number}
                onChange={e => setData({ ...data, receipt_number: e.target.value })}
                placeholder="Ej: 0001-00012345"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Toggle pagado inquilino */}
      {inquilino && (
        <div className="border border-stone-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">Abonado por el inquilino</p>
              <p className="text-xs text-stone-400">El inquilino pago este servicio</p>
            </div>
            <button type="button"
              onClick={() => setData({ ...data, paid_by_tenant: !data.paid_by_tenant })}
              className={`w-10 h-6 rounded-full transition-colors relative ${data.paid_by_tenant ? 'bg-blue-600' : 'bg-stone-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${data.paid_by_tenant ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          {data.paid_by_tenant && (
            <div className="pt-2 border-t border-stone-100 space-y-3">
              <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">Inquilino</span>
              <DatePicker
                label="Fecha en que lo abono el inquilino"
                value={data.tenant_payment_date}
                onChange={val => setData({ ...data, tenant_payment_date: val })}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={uploading}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >{uploading ? 'Guardando...' : submitLabel}</button>
        <button type="button" onClick={onCancel}
          className="border border-stone-200 text-stone-500 px-6 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
        >Cancelar</button>
      </div>
    </form>
  )
}