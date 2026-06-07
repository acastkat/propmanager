import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MainLayout from '../layouts/MainLayout'
import DatePicker from '../components/DatePicker'

const statusColors = {
  pagado:    { text: 'text-green-700', bg: 'bg-green-50',  dot: 'bg-green-600' },
  pendiente: { text: 'text-amber-700', bg: 'bg-amber-50',  dot: 'bg-amber-500' },
  vencido:   { text: 'text-red-700',   bg: 'bg-red-50',    dot: 'bg-red-500'   },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-AR')
}

function formatCurrency(value) {
  if (!value && value !== 0) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  return '$ ' + num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const emptyForm = {
  property_id: '', type: 'alquiler', period: '',
  amount: '', amountDisplay: '', payment_date: '',
  payment_method: 'transferencia', status: 'pagado', notes: '',
  receipt_number: '', receipt_file: null, receipt_url: null,
}

function AmountInput({ data, setData }) {
  return (
    <div>
      <label className="text-xs text-stone-500 block mb-1">Monto ($)</label>
      <input
        type="text"
        inputMode="decimal"
        required
        value={data.amountDisplay || ''}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9,]/g, '')
          setData({ ...data, amount: raw, amountDisplay: raw })
        }}
        onBlur={() => {
          if (!data.amount) return
          const normalized = data.amount.replace(',', '.')
          const num = parseFloat(normalized)
          if (isNaN(num)) return
          const display = num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          setData({ ...data, amount: String(num), amountDisplay: display })
        }}
        onFocus={() => setData({ ...data, amountDisplay: data.amount ? String(data.amount) : '' })}
        placeholder="Ej: 620000 o 150,50"
        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function ReceiptInput({ data, setData }) {
  const needsReceipt = ['transferencia', 'debito', 'cheque'].includes(data.payment_method) || data.type === 'deposito'
  if (!needsReceipt) return null
  return (
    <div className="border border-stone-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="text-xs text-stone-500 block mb-1">
          Número de comprobante <span className="text-stone-300">(opcional)</span>
        </label>
        <input value={data.receipt_number || ''}
          onChange={e => setData({ ...data, receipt_number: e.target.value })}
          placeholder="Ej: 12345678"
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-stone-500 block mb-1">
          Comprobante <span className="text-stone-300">(PDF o imagen)</span>
        </label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => setData({ ...data, receipt_file: e.target.files[0] })}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
        />
        {data.receipt_url && !data.receipt_file && (
          <a href={data.receipt_url} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
          >Ver comprobante cargado →</a>
        )}
      </div>
    </div>
  )
}

function PaymentForm({ data, setData, onSubmit, onCancel, submitLabel, properties }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-stone-500 block mb-1">Propiedad</label>
          <select required value={data.property_id}
            onChange={e => setData({ ...data, property_id: e.target.value })}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar...</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">Tipo de pago</label>
          <select value={data.type}
            onChange={e => setData({ ...data, type: e.target.value })}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="alquiler">Alquiler mensual</option>
            <option value="deposito">Deposito</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-stone-500 block mb-1">Periodo</label>
          <input value={data.period}
            onChange={e => setData({ ...data, period: e.target.value })}
            placeholder="Ej: Mayo 2026"
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <AmountInput data={data} setData={setData} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DatePicker
          label="Fecha de pago"
          value={data.payment_date}
          onChange={val => setData({ ...data, payment_date: val })}
        />
        <div>
          <label className="text-xs text-stone-500 block mb-1">Forma de pago</label>
          <select value={data.payment_method}
            onChange={e => setData({ ...data, payment_method: e.target.value })}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="transferencia">Transferencia</option>
            <option value="debito">Débito</option>
            <option value="efectivo">Efectivo</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-stone-500 block mb-2">Estado</label>
        <div className="flex gap-3">
          {['pagado', 'pendiente', 'vencido'].map(st => (
            <button key={st} type="button"
              onClick={() => setData({ ...data, status: st })}
              className={`px-4 py-2 rounded-lg text-sm transition-all capitalize ${
                data.status === st
                  ? st === 'pagado'    ? 'bg-green-50 text-green-700 border-2 border-green-500 font-medium'
                  : st === 'pendiente' ? 'bg-amber-50 text-amber-700 border-2 border-amber-500 font-medium'
                  :                     'bg-red-50 text-red-700 border-2 border-red-500 font-medium'
                  : 'border border-stone-200 text-stone-500 hover:border-stone-300'
              }`}
            >{st}</button>
          ))}
        </div>
      </div>

      <ReceiptInput data={data} setData={setData} />

      <div>
        <label className="text-xs text-stone-500 block mb-1">
          Nota <span className="text-stone-300">(opcional)</span>
        </label>
        <input value={data.notes}
          onChange={e => setData({ ...data, notes: e.target.value })}
          placeholder="Ej: incluye pago atrasado de abril..."
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >{submitLabel}</button>
        <button type="button" onClick={onCancel}
          className="border border-stone-200 text-stone-500 px-6 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
        >Cancelar</button>
      </div>
    </form>
  )
}

export default function Payments({ session }) {
  const [profile, setProfile]                   = useState(null)
  const [payments, setPayments]                 = useState([])
  const [properties, setProperties]             = useState([])
  const [loading, setLoading]                   = useState(true)
  const [showForm, setShowForm]                 = useState(false)
  const [form, setForm]                         = useState(emptyForm)
  const [selectedPayment, setSelectedPayment]   = useState(null)
  const [editMode, setEditMode]                 = useState(false)
  const [editForm, setEditForm]                 = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal]   = useState(false)
  const [uploading, setUploading]               = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: profileData } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    const { data: propertiesData } = await supabase
      .from('properties').select('*').eq('user_id', session.user.id)
    const propIds = (propertiesData || []).map(p => p.id)
    const { data: paymentsData } = await supabase
      .from('payments').select('*, properties(name)')
      .in('property_id', propIds.length > 0 ? propIds : ['none'])
      .order('created_at', { ascending: false })
    setProfile(profileData)
    setProperties(propertiesData || [])
    setPayments(paymentsData || [])
    setLoading(false)
  }

  const uploadFile = async (file, bucket) => {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const fileName = `${session.user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(fileName, file)
    if (error) return null
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)
    const receiptUrl = form.receipt_file ? await uploadFile(form.receipt_file, 'receipts') : null
    const { error } = await supabase.from('payments').insert({
      property_id: form.property_id, type: form.type, period: form.period,
      amount: parseFloat(form.amount), payment_date: form.payment_date,
      payment_method: form.payment_method, status: form.status, notes: form.notes,
      receipt_number: form.receipt_number || null, receipt_url: receiptUrl,
    })
    setUploading(false)
    if (!error) { setShowForm(false); setForm(emptyForm); fetchData() }
  }

  const startEdit = () => {
    const num = selectedPayment.amount || ''
    const display = num ? parseFloat(num).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
    setEditForm({
      property_id: selectedPayment.property_id || '', type: selectedPayment.type || 'alquiler',
      period: selectedPayment.period || '', amount: String(num), amountDisplay: display,
      payment_date: selectedPayment.payment_date || '', payment_method: selectedPayment.payment_method || 'transferencia',
      status: selectedPayment.status || 'pagado', notes: selectedPayment.notes || '',
      receipt_number: selectedPayment.receipt_number || '', receipt_file: null,
      receipt_url: selectedPayment.receipt_url || null,
    })
    setEditMode(true)
  }

  const handleEditSubmit = async () => {
    setShowConfirmModal(false)
    setUploading(true)
    let receiptUrl = editForm.receipt_url
    if (editForm.receipt_file) receiptUrl = await uploadFile(editForm.receipt_file, 'receipts')
    await supabase.from('payments').update({
      property_id: editForm.property_id, type: editForm.type, period: editForm.period,
      amount: parseFloat(editForm.amount), payment_date: editForm.payment_date,
      payment_method: editForm.payment_method, status: editForm.status, notes: editForm.notes,
      receipt_number: editForm.receipt_number || null, receipt_url: receiptUrl,
    }).eq('id', selectedPayment.id)
    setUploading(false)
    setEditMode(false)
    setEditForm(null)
    await fetchData()
    const { data } = await supabase.from('payments').select('*, properties(name)').eq('id', selectedPayment.id).single()
    setSelectedPayment(data)
  }

  const handleDelete = async () => {
    setShowDeleteModal(false)
    await supabase.from('payments').delete().eq('id', selectedPayment.id)
    setSelectedPayment(null)
    fetchData()
  }

  const now = new Date()
  const mesActual = payments.filter(p => {
    const d = new Date(p.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalMes = mesActual.filter(p => p.status === 'pagado').reduce((acc, p) => acc + p.amount, 0)
  const pendientesMes = mesActual.filter(p => p.status === 'pendiente').length
  const mes = now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  if (loading) return <div className="flex items-center justify-center h-screen"><p className="text-stone-400 text-sm">Cargando...</p></div>

  if (selectedPayment) {
    const colors = statusColors[selectedPayment.status] || statusColors.pendiente
    return (
      <MainLayout session={session} role={profile?.role}>
        <div className="p-8">
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
                <p className="text-lg font-semibold text-stone-800 mb-2">Modificar pago</p>
                <p className="text-sm text-stone-500 mb-6">Estas a punto de modificar los datos de este pago. Queres continuar?</p>
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
                <p className="text-lg font-semibold text-stone-800 mb-2">Eliminar pago</p>
                <p className="text-sm text-stone-500 mb-6">
                  Estas a punto de eliminar de forma definitiva el registro de pago de{' '}
                  <span className="font-semibold text-stone-800">{selectedPayment.type} — {selectedPayment.properties?.name}</span>.
                  Esta accion no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleDelete} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">Aceptar</button>
                  <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-stone-200 text-stone-500 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors">Cancelar</button>
                </div>
              </div>
            </div>
          )}
          <button onClick={() => { setSelectedPayment(null); setEditMode(false); setEditForm(null) }}
            className="text-sm text-stone-400 hover:text-stone-600 mb-6 flex items-center gap-2"
          >&larr; Volver a Pagos</button>
          <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-blue-900 capitalize">{selectedPayment.type} — {selectedPayment.properties?.name}</h1>
              <p className="text-sm text-blue-600 mt-1">{selectedPayment.period && `${selectedPayment.period} · `}{formatDate(selectedPayment.payment_date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-4 py-1.5 rounded-full font-medium ${colors.text} ${colors.bg}`}>{selectedPayment.status}</span>
              {!editMode && <button onClick={startEdit} className="text-sm text-blue-600 border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Editar</button>}
              <button onClick={() => setShowDeleteModal(true)} className="text-sm text-red-500 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Eliminar</button>
            </div>
          </div>
          {editMode && editForm ? (
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="text-sm font-medium text-stone-700 mb-6">Editando pago</h2>
              <PaymentForm data={editForm} setData={setEditForm} properties={properties}
                onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true) }}
                onCancel={() => { setEditMode(false); setEditForm(null) }}
                submitLabel="Guardar cambios"
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-6">
              <div>
                <h2 className="text-sm font-medium text-stone-700 mb-4">Detalle del pago</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { k: 'Propiedad',     v: selectedPayment.properties?.name        },
                    { k: 'Tipo',          v: selectedPayment.type                     },
                    { k: 'Periodo',       v: selectedPayment.period     || '—'        },
                    { k: 'Monto',         v: formatCurrency(selectedPayment.amount)   },
                    { k: 'Fecha de pago', v: formatDate(selectedPayment.payment_date) },
                    { k: 'Forma de pago', v: selectedPayment.payment_method || '—'    },
                    { k: 'Estado',        v: selectedPayment.status                   },
                    { k: 'Nota',          v: selectedPayment.notes || '—'             },
                  ].map((row, i) => (
                    <div key={i} className="bg-stone-50 rounded-lg px-4 py-3">
                      <p className="text-xs text-stone-400 mb-1">{row.k}</p>
                      <p className="text-sm font-medium text-stone-800 capitalize">{row.v}</p>
                    </div>
                  ))}
                </div>
              </div>
              {(['transferencia', 'debito', 'cheque'].includes(selectedPayment.payment_method) || selectedPayment.type === 'deposito') && (
                <div className="border-t border-stone-100 pt-6">
                  <h2 className="text-sm font-medium text-stone-700 mb-4">Comprobante</h2>
                  <div className="space-y-3">
                    {selectedPayment.receipt_number && (
                      <div className="bg-stone-50 rounded-lg px-4 py-3">
                        <p className="text-xs text-stone-400 mb-1">Número de comprobante</p>
                        <p className="text-sm font-medium text-stone-800">{selectedPayment.receipt_number}</p>
                      </div>
                    )}
                    {selectedPayment.receipt_url && (
                      <div>
                        <p className="text-xs text-stone-400 mb-2">{selectedPayment.receipt_url.split('/').pop()}</p>
                        <a href={selectedPayment.receipt_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium">Ver comprobante →</a>
                      </div>
                    )}
                    {!selectedPayment.receipt_number && !selectedPayment.receipt_url && (
                      <p className="text-sm text-stone-400">Sin comprobante cargado</p>
                    )}
                  </div>
                </div>
              )}
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
            <h1 className="text-2xl font-semibold text-blue-900">Pagos</h1>
            <p className="text-sm text-blue-600 mt-1 capitalize">{mes}</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setForm(emptyForm) }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >+ Registrar pago</button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 p-6 flex items-center gap-4">
            <div className="w-1 h-12 bg-blue-600 rounded-full" />
            <div>
              <p className="text-2xl font-semibold text-stone-800">{formatCurrency(totalMes)}</p>
              <p className="text-sm text-stone-400 mt-1">Cobrado este mes</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-6 flex items-center gap-4">
            <div className="w-1 h-12 bg-amber-500 rounded-full" />
            <div>
              <p className="text-2xl font-semibold text-stone-800">{pendientesMes}</p>
              <p className="text-sm text-stone-400 mt-1">Pendientes este mes</p>
            </div>
          </div>
        </div>
        {showForm && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
            <h2 className="text-sm font-medium text-stone-700 mb-6">Registrar pago</h2>
            <PaymentForm data={form} setData={setForm} properties={properties}
              onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setForm(emptyForm) }}
              submitLabel="Guardar pago"
            />
          </div>
        )}
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Todos los pagos</p>
          </div>
          {payments.length === 0 ? (
            <div className="px-6 py-12 text-center"><p className="text-sm text-stone-400">No hay pagos registrados todavia</p></div>
          ) : (
            payments.map((payment, i) => {
              const colors = statusColors[payment.status] || statusColors.pendiente
              return (
                <div key={payment.id} onClick={() => setSelectedPayment(payment)}
                  className={`flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-stone-50 transition-colors ${i < payments.length - 1 ? 'border-b border-stone-100' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800 capitalize">{payment.type} — {payment.properties?.name}</p>
                    <p className="text-xs text-stone-400">{payment.period && `${payment.period} · `}{payment.payment_method}{payment.notes && ` · ${payment.notes}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-stone-800">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-stone-400">{formatDate(payment.payment_date)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${colors.text} ${colors.bg}`}>{payment.status}</span>
                  <span className="text-stone-300 text-sm">&rarr;</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </MainLayout>
  )
}