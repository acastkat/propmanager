import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MainLayout from '../layouts/MainLayout'

const INDICES = [
  { id: 'ICL',    label: 'ICL — Índice de Contratos de Locación' },
  { id: 'IPC',    label: 'IPC — Índice de Precios al Consumidor' },
  { id: 'UVA',    label: 'UVA — Unidad de Valor Adquisitivo'     },
  { id: 'RIPTE',  label: 'RIPTE — Remun. Prom. Trab. Estables'   },
  { id: 'MANUAL', label: 'Libre / Acuerdo entre partes'          },
]

const SERVICIOS = ['Luz', 'Gas', 'Expensas', 'Agua', 'Internet']

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
]

const indiceInfo = {
  ICL:    'Elaborado por el BCRA. Combina inflación (IPC) y salarios (RIPTE). El más usado.',
  IPC:    'Mide la inflación mensual. Publicado por INDEC. Muy usado desde el DNU 70/23.',
  UVA:    'Sigue la inflación via CER. Publicado por el BCRA.',
  RIPTE:  'Mide salarios de trabajadores formales. Publicado por el Ministerio de Trabajo.',
  MANUAL: 'Acuerdo libre entre partes. Permitido desde el DNU 70/23.',
}

function formatCurrency(value) {
  if (!value && value !== 0) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return '$ ' + num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function validarFechaInicio(fecha) {
  if (!fecha) return null
  const d = new Date(fecha)
  const hace20 = new Date()
  hace20.setFullYear(hace20.getFullYear() - 20)
  if (d < hace20) return 'La fecha no puede ser mayor a 20 años atrás'
  return null
}

function validarFechaFin(inicio, fin) {
  if (!inicio || !fin) return null
  const dInicio = new Date(inicio)
  const dFin = new Date(fin)
  const max = new Date(dInicio)
  max.setFullYear(dInicio.getFullYear() + 20)
  if (dFin < dInicio) return 'La fecha de fin no puede ser anterior al inicio'
  if (dFin > max) return 'El contrato no puede durar más de 20 años'
  return null
}

const propStatusColors = {
  alquilada: { text: 'text-green-700', bg: 'bg-green-50',  label: 'Alquilada'   },
  vacia:     { text: 'text-stone-500', bg: 'bg-stone-100', label: 'Vacía'       },
  propia:    { text: 'text-blue-700',  bg: 'bg-blue-50',   label: 'Mi vivienda' },
}

const stepLabels = ['Tipo', 'Datos', 'Estado', 'Confirmar']

const emptyForm = {
  tipo: '', nombre: '',
  calle: '', numero: '', piso: '', dpto: '', barrio: '', localidad: '', provincia: '',
  servicios: [], estado: '', inquilino: '', inicioContrato: '',
  finContrato: '', alquiler: '', alquilerRaw: '', indiceId: '', periodicidadMeses: '',
}

// Estados disponibles según tipo de propiedad
function getEstados(tipo) {
  const base = [
    { id: 'alquilada', label: 'Alquilada',   dotColor: 'bg-green-500' },
    { id: 'vacia',     label: 'Vacía',       dotColor: 'bg-stone-400' },
  ]
  if (tipo !== 'local') {
    base.push({ id: 'propia', label: 'Mi vivienda', dotColor: 'bg-blue-500' })
  }
  return base
}

export default function Properties({ session }) {
  const [profile, setProfile]                   = useState(null)
  const [properties, setProperties]             = useState([])
  const [loading, setLoading]                   = useState(true)
  const [step, setStep]                         = useState(0)
  const [showForm, setShowForm]                 = useState(false)
  const [form, setForm]                         = useState(emptyForm)
  const [errors, setErrors]                     = useState({})
  const [selectedProp, setSelectedProp]         = useState(null)
  const [editMode, setEditMode]                 = useState(false)
  const [editForm, setEditForm]                 = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal]   = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: profileData } = await supabase
      .from('profiles').select('*')
      .eq('id', session.user.id).single()

    const { data: propertiesData } = await supabase
      .from('properties')
      .select('*, contracts(*)')
      .eq('user_id', session.user.id)

    setProfile(profileData)
    setProperties(propertiesData || [])
    setLoading(false)
  }

  const toggleServicio = (s) => {
    const svcs = form.servicios
    setForm({
      ...form,
      servicios: svcs.includes(s) ? svcs.filter(x => x !== s) : [...svcs, s]
    })
  }

  const handleAlquilerChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setForm({ ...form, alquilerRaw: raw, alquiler: raw })
  }

  const validarPaso2 = () => {
    const errs = {}
    if (!form.calle)     errs.calle     = 'Requerido'
    if (!form.numero)    errs.numero    = 'Requerido'
    if (!form.localidad) errs.localidad = 'Requerido'
    if (!form.provincia) errs.provincia = 'Requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validarPaso3 = () => {
    const errs = {}
    const errInicio = validarFechaInicio(form.inicioContrato)
    const errFin    = validarFechaFin(form.inicioContrato, form.finContrato)
    if (errInicio) errs.inicioContrato = errInicio
    if (errFin)    errs.finContrato    = errFin
    if (form.alquiler) {
      const decimales = form.alquiler.includes('.') ? form.alquiler.split('.')[1].length : 0
      if (decimales > 2) errs.alquiler = 'Máximo 2 decimales'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Guardar propiedad completa
  const handleSubmit = async (isIncomplete = false) => {
    const address = [
      form.calle, form.numero,
      form.piso  ? `Piso ${form.piso}` : '',
      form.dpto  ? `Dpto ${form.dpto}` : '',
      form.barrio, form.localidad, form.provincia,
    ].filter(Boolean).join(', ')

    const { data: propData, error: propError } = await supabase
      .from('properties')
      .insert({
        user_id:       session.user.id,
        name:          form.nombre || `${form.calle} ${form.numero}`,
        address,
        type:          form.tipo,
        status:        form.estado || 'vacia',
        floor:         form.piso,
        unit:          form.dpto,
        services:      form.servicios,
        is_incomplete: isIncomplete,
      })
      .select().single()

    if (propError || !propData) return

    if (form.estado === 'alquilada' && form.inquilino) {
      await supabase.from('contracts').insert({
        property_id:   propData.id,
        tenant_name:   form.inquilino,
        start_date:    form.inicioContrato,
        end_date:      form.finContrato,
        monthly_rent:  parseFloat(form.alquiler),
        update_index:  form.indiceId,
        update_months: parseInt(form.periodicidadMeses),
      })
    }

    setShowForm(false)
    setStep(0)
    setForm(emptyForm)
    setErrors({})
    fetchData()
  }

  const startEdit = () => {
    const contract = selectedProp.contracts?.[0]
    setEditForm({
      tipo:              selectedProp.type     || '',
      nombre:            selectedProp.name     || '',
      calle:             selectedProp.address  || '',
      numero:            '',
      piso:              selectedProp.floor    || '',
      dpto:              selectedProp.unit     || '',
      barrio:            '',
      localidad:         '',
      provincia:         '',
      servicios:         selectedProp.services || [],
      estado:            selectedProp.status   || '',
      inquilino:         contract?.tenant_name   || '',
      inicioContrato:    contract?.start_date    || '',
      finContrato:       contract?.end_date      || '',
      alquiler:          contract?.monthly_rent  || '',
      alquilerRaw:       contract?.monthly_rent  || '',
      indiceId:          contract?.update_index  || '',
      periodicidadMeses: contract?.update_months || '',
    })
    setEditMode(true)
  }

  const handleEditSubmit = async () => {
    setShowConfirmModal(false)

    const address = [
      editForm.calle, editForm.numero,
      editForm.piso  ? `Piso ${editForm.piso}` : '',
      editForm.dpto  ? `Dpto ${editForm.dpto}` : '',
      editForm.barrio, editForm.localidad, editForm.provincia,
    ].filter(Boolean).join(', ')

    await supabase.from('properties').update({
      name:          editForm.nombre || `${editForm.calle} ${editForm.numero}`,
      address,
      type:          editForm.tipo,
      status:        editForm.estado,
      floor:         editForm.piso,
      unit:          editForm.dpto,
      services:      editForm.servicios || [],
      is_incomplete: false,
    }).eq('id', selectedProp.id)

    if (editForm.inquilino && selectedProp.contracts?.[0]) {
      await supabase.from('contracts').update({
        tenant_name:   editForm.inquilino,
        start_date:    editForm.inicioContrato,
        end_date:      editForm.finContrato,
        monthly_rent:  parseFloat(editForm.alquiler || 0),
        update_index:  editForm.indiceId,
        update_months: parseInt(editForm.periodicidadMeses || 0),
      }).eq('id', selectedProp.contracts[0].id)
    }

    setEditMode(false)
    setEditForm(null)
    await fetchData()
    const { data } = await supabase
      .from('properties')
      .select('*, contracts(*)')
      .eq('id', selectedProp.id)
      .single()
    setSelectedProp(data)
  }

  const handleDelete = async () => {
    setShowDeleteModal(false)
    await supabase.from('properties').delete().eq('id', selectedProp.id)
    setSelectedProp(null)
    fetchData()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-stone-400 text-sm">Cargando...</p>
    </div>
  )

  // ── Vista detalle ──────────────────────────────────────
  if (selectedProp) {
    const contract = selectedProp.contracts?.[0]
    const colors   = propStatusColors[selectedProp.status] || propStatusColors.vacia

    return (
      <MainLayout session={session} role={profile?.role}>
        <div className="p-8">

          {/* Modal confirmar edición */}
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
                <p className="text-lg font-semibold text-stone-800 mb-2">Modificar propiedad</p>
                <p className="text-sm text-stone-500 mb-6">
                  Estás a punto de modificar los datos de esta propiedad. ¿Querés continuar?
                </p>
                <div className="flex gap-3">
                  <button onClick={handleEditSubmit}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >Aceptar</button>
                  <button onClick={() => setShowConfirmModal(false)}
                    className="flex-1 border border-stone-200 text-stone-500 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                  >Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal confirmar eliminación */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
                <p className="text-lg font-semibold text-stone-800 mb-2">Eliminar propiedad</p>
                <p className="text-sm text-stone-500 mb-6">
                  Estás a punto de eliminar de forma definitiva la propiedad{' '}
                  <span className="font-semibold text-stone-800">{selectedProp.name}</span>.
                  Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleDelete}
                    className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >Aceptar</button>
                  <button onClick={() => setShowDeleteModal(false)}
                    className="flex-1 border border-stone-200 text-stone-500 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                  >Cancelar</button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => { setSelectedProp(null); setEditMode(false); setEditForm(null) }}
            className="text-sm text-stone-400 hover:text-stone-600 mb-6 flex items-center gap-2"
          >
            ← Volver a propiedades
          </button>

          {/* Header detalle */}
          <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-blue-900">{selectedProp.name}</h1>
                {selectedProp.is_incomplete && (
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium border border-amber-200">
                    ⚠ Datos incompletos
                  </span>
                )}
              </div>
              <p className="text-sm text-blue-600 mt-1">{selectedProp.address}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-4 py-1.5 rounded-full font-medium ${colors.text} ${colors.bg}`}>
                {colors.label}
              </span>
              {!editMode && (
                <button onClick={startEdit}
                  className="text-sm text-blue-600 border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >Editar</button>
              )}
              <button onClick={() => setShowDeleteModal(true)}
                className="text-sm text-red-500 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >Eliminar</button>
            </div>
          </div>

          {/* Aviso datos incompletos */}
          {selectedProp.is_incomplete && !editMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 mb-6 flex items-center justify-between">
              <p className="text-sm text-amber-700">
                Esta propiedad tiene datos pendientes de completar.
              </p>
              <button onClick={startEdit}
                className="text-sm text-amber-700 font-medium hover:underline"
              >Completar ahora →</button>
            </div>
          )}

          {/* Modo edición */}
          {editMode && editForm ? (
            <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
              <h2 className="text-sm font-medium text-stone-700 mb-6">Editando propiedad</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Nombre o apodo</label>
                  <input value={editForm.nombre}
                    onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-stone-500 block mb-1">Calle <span className="text-red-400">*</span></label>
                    <input value={editForm.calle}
                      onChange={e => setEditForm({ ...editForm, calle: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Número <span className="text-red-400">*</span></label>
                    <input value={editForm.numero}
                      onChange={e => setEditForm({ ...editForm, numero: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Piso</label>
                    <input value={editForm.piso}
                      onChange={e => setEditForm({ ...editForm, piso: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Dpto.</label>
                    <input value={editForm.dpto}
                      onChange={e => setEditForm({ ...editForm, dpto: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Barrio</label>
                    <input value={editForm.barrio}
                      onChange={e => setEditForm({ ...editForm, barrio: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Localidad <span className="text-red-400">*</span></label>
                    <input value={editForm.localidad}
                      onChange={e => setEditForm({ ...editForm, localidad: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Provincia <span className="text-red-400">*</span></label>
                    <select value={editForm.provincia}
                      onChange={e => setEditForm({ ...editForm, provincia: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-2">Estado</label>
                  <div className="flex gap-3">
                    {getEstados(editForm.tipo).map(e => (
                      <button key={e.id} type="button"
                        onClick={() => setEditForm({ ...editForm, estado: e.id })}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          editForm.estado === e.id
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-500 font-medium'
                            : 'border border-stone-200 text-stone-500 hover:border-stone-300'
                        }`}
                      >{e.label}</button>
                    ))}
                  </div>
                </div>
                {editForm.estado === 'alquilada' && (
                  <div className="space-y-4 border border-stone-100 rounded-xl p-4 bg-stone-50">
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Inquilino</label>
                      <input value={editForm.inquilino}
                        onChange={e => setEditForm({ ...editForm, inquilino: e.target.value })}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-stone-500 block mb-1">Inicio contrato</label>
                        <input type="date" value={editForm.inicioContrato}
                          onChange={e => setEditForm({ ...editForm, inicioContrato: e.target.value })}
                          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 block mb-1">Fin contrato</label>
                        <input type="date" value={editForm.finContrato}
                          onChange={e => setEditForm({ ...editForm, finContrato: e.target.value })}
                          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Alquiler mensual ($)</label>
                      <input value={editForm.alquilerRaw}
                        onChange={e => setEditForm({ ...editForm, alquilerRaw: e.target.value, alquiler: e.target.value })}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {editForm.alquilerRaw && (
                        <p className="text-xs text-stone-400 mt-1">{formatCurrency(editForm.alquilerRaw)}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Índice de actualización</label>
                      <select value={editForm.indiceId}
                        onChange={e => setEditForm({ ...editForm, indiceId: e.target.value })}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar...</option>
                        {INDICES.map(ind => <option key={ind.id} value={ind.id}>{ind.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">
                        ¿Cada cuántos meses actualiza el importe de la mensualidad?
                      </label>
                      <input type="number" min="1" max="24"
                        value={editForm.periodicidadMeses}
                        onChange={e => setEditForm({ ...editForm, periodicidadMeses: e.target.value })}
                        className="w-24 border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowConfirmModal(true)}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >Guardar cambios</button>
                  <button onClick={() => { setEditMode(false); setEditForm(null) }}
                    className="border border-stone-200 text-stone-500 px-6 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                  >Cancelar</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {contract ? (
                <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
                  <h2 className="text-sm font-medium text-stone-700 mb-4">Datos del contrato</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { k: 'Inquilino',        v: contract.tenant_name },
                      { k: 'Alquiler mensual', v: formatCurrency(contract.monthly_rent) },
                      { k: 'Inicio contrato',  v: contract.start_date },
                      { k: 'Fin contrato',     v: contract.end_date   },
                      { k: 'Índice',           v: contract.update_index  || '—' },
                      { k: 'Actualización',    v: contract.update_months ? `Cada ${contract.update_months} meses` : '—' },
                    ].map((row, i) => (
                      <div key={i} className="bg-stone-50 rounded-lg px-4 py-3">
                        <p className="text-xs text-stone-400 mb-1">{row.k}</p>
                        <p className="text-sm font-medium text-stone-800">{row.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 px-6 py-8 text-center mb-6">
                  <p className="text-sm text-stone-400">No hay contrato registrado para esta propiedad</p>
                </div>
              )}
              {(selectedProp.services || []).length > 0 && (
                <div className="bg-white rounded-xl border border-stone-200 p-6">
                  <h2 className="text-sm font-medium text-stone-700 mb-3">Servicios registrados</h2>
                  <div className="flex gap-2 flex-wrap">
                    {selectedProp.services.map(svc => (
                      <span key={svc} className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </MainLayout>
    )
  }

  // ── Vista lista ────────────────────────────────────────
  return (
    <MainLayout session={session} role={profile?.role}>
      <div className="p-8">

        <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-blue-900">Propiedades</h1>
            <p className="text-sm text-blue-600 mt-1">{properties.length} propiedades registradas</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setStep(0); setForm(emptyForm); setErrors({}) }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nueva propiedad
          </button>
        </div>

        {/* Formulario alta */}
        {showForm && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 mb-8">

            {/* Stepper */}
            <div className="flex items-center gap-2 mb-8">
              {stepLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    i < step   ? 'bg-green-100 text-green-700' :
                    i === step ? 'bg-blue-600 text-white' :
                                 'bg-stone-100 text-stone-400'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${i === step ? 'text-blue-600 font-medium' : 'text-stone-400'}`}>
                    {label}
                  </span>
                  {i < stepLabels.length - 1 && (
                    <div className={`w-12 h-px mx-1 ${i < step ? 'bg-green-300' : 'bg-stone-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Paso 1 — Tipo */}
            {step === 0 && (
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-4">
                  ¿Qué tipo de inmueble es?
                </p>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { id: 'depto', label: 'Departamento', icon: '🏢', sub: 'Unidad en edificio'     },
                    { id: 'casa',  label: 'Casa',          icon: '🏠', sub: 'Vivienda independiente' },
                    { id: 'local', label: 'Local',         icon: '🏪', sub: 'Comercial'              },
                    { id: 'otro',  label: 'Otro',          icon: '📦', sub: 'Cochera, terreno...'    },
                  ].map(t => (
                    <div key={t.id} onClick={() => setForm({ ...form, tipo: t.id, estado: '' })}
                      className={`border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        form.tipo === t.id
                          ? 'border-blue-500 bg-blue-50 border-2'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                        form.tipo === t.id ? 'bg-blue-100' : 'bg-stone-100'
                      }`}>{t.icon}</div>
                      <p className="text-sm font-medium text-stone-800">{t.label}</p>
                      <p className="text-xs text-stone-400 text-center">{t.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} disabled={!form.tipo}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >Continuar</button>
                  <button onClick={() => { setShowForm(false); setForm(emptyForm) }}
                    className="border border-stone-200 text-stone-500 px-6 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                  >Cancelar</button>
                </div>
              </div>
            )}

            {/* Paso 2 — Datos */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    Nombre o apodo <span className="text-stone-300">(opcional)</span>
                  </label>
                  <input value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Depto Palermo"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-stone-500 block mb-1">Calle <span className="text-red-400">*</span></label>
                    <input value={form.calle}
                      onChange={e => setForm({ ...form, calle: e.target.value })}
                      placeholder="Av. Santa Fe"
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.calle ? 'border-red-400' : 'border-stone-200'}`}
                    />
                    {errors.calle && <p className="text-xs text-red-500 mt-1">{errors.calle}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Número <span className="text-red-400">*</span></label>
                    <input value={form.numero}
                      onChange={e => setForm({ ...form, numero: e.target.value })}
                      placeholder="1234"
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.numero ? 'border-red-400' : 'border-stone-200'}`}
                    />
                    {errors.numero && <p className="text-xs text-red-500 mt-1">{errors.numero}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Piso</label>
                    <input value={form.piso}
                      onChange={e => setForm({ ...form, piso: e.target.value })}
                      placeholder="3"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Dpto.</label>
                    <input value={form.dpto}
                      onChange={e => setForm({ ...form, dpto: e.target.value })}
                      placeholder="B"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Barrio</label>
                    <input value={form.barrio}
                      onChange={e => setForm({ ...form, barrio: e.target.value })}
                      placeholder="Palermo"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Localidad <span className="text-red-400">*</span></label>
                    <input value={form.localidad}
                      onChange={e => setForm({ ...form, localidad: e.target.value })}
                      placeholder="Buenos Aires"
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.localidad ? 'border-red-400' : 'border-stone-200'}`}
                    />
                    {errors.localidad && <p className="text-xs text-red-500 mt-1">{errors.localidad}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Provincia <span className="text-red-400">*</span></label>
                    <select value={form.provincia}
                      onChange={e => setForm({ ...form, provincia: e.target.value })}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.provincia ? 'border-red-400' : 'border-stone-200'}`}
                    >
                      <option value="">Seleccionar...</option>
                      {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
                    </select>
                    {errors.provincia && <p className="text-xs text-red-500 mt-1">{errors.provincia}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-2">Servicios a registrar</label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICIOS.map(s => (
                      <button key={s} type="button" onClick={() => toggleServicio(s)}
                        className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                          form.servicios.includes(s)
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-500 font-medium'
                            : 'border border-stone-200 text-stone-500 hover:border-stone-300'
                        }`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { if (validarPaso2()) setStep(2) }}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >Continuar</button>
                  <button onClick={() => setStep(0)}
                    className="border border-stone-200 text-stone-500 px-6 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                  >Atrás</button>
                </div>
              </div>
            )}

            {/* Paso 3 — Estado */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Estado actual</p>
                <div className="grid grid-cols-3 gap-3">
                  {getEstados(form.tipo).map(e => (
                    <div key={e.id} onClick={() => setForm({ ...form, estado: e.id })}
                      className={`border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${
                        form.estado === e.id
                          ? 'border-blue-500 bg-blue-50 border-2'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${e.dotColor}`} />
                      <span className="text-sm font-medium text-stone-800">{e.label}</span>
                    </div>
                  ))}
                </div>

                {form.estado === 'alquilada' && (
                  <div className="space-y-4 border border-stone-100 rounded-xl p-5 bg-stone-50">
                    <div className="bg-blue-50 rounded-lg px-4 py-3">
                      <p className="text-xs text-blue-700">Podés completar los datos del contrato ahora o después.</p>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Nombre del inquilino</label>
                      <input value={form.inquilino}
                        onChange={e => setForm({ ...form, inquilino: e.target.value })}
                        placeholder="Ej: Juan García"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-stone-500 block mb-1">Inicio contrato</label>
                        <input type="date" value={form.inicioContrato}
                          onChange={e => setForm({ ...form, inicioContrato: e.target.value })}
                          className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.inicioContrato ? 'border-red-400' : 'border-stone-200'}`}
                        />
                        {errors.inicioContrato && <p className="text-xs text-red-500 mt-1">{errors.inicioContrato}</p>}
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 block mb-1">Fin contrato</label>
                        <input type="date" value={form.finContrato}
                          onChange={e => setForm({ ...form, finContrato: e.target.value })}
                          className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.finContrato ? 'border-red-400' : 'border-stone-200'}`}
                        />
                        {errors.finContrato && <p className="text-xs text-red-500 mt-1">{errors.finContrato}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Alquiler mensual ($)</label>
                      <input value={form.alquilerRaw}
                        onChange={handleAlquilerChange}
                        placeholder="150000"
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.alquiler ? 'border-red-400' : 'border-stone-200'}`}
                      />
                      {form.alquilerRaw && (
                        <p className="text-xs text-stone-400 mt-1">{formatCurrency(form.alquilerRaw)}</p>
                      )}
                      {errors.alquiler && <p className="text-xs text-red-500 mt-1">{errors.alquiler}</p>}
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Índice de actualización</label>
                      <select value={form.indiceId}
                        onChange={e => setForm({ ...form, indiceId: e.target.value })}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar...</option>
                        {INDICES.map(ind => <option key={ind.id} value={ind.id}>{ind.label}</option>)}
                      </select>
                    </div>
                    {form.indiceId && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                        <p className="text-xs text-blue-700">{indiceInfo[form.indiceId]}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">
                        ¿Cada cuántos meses actualiza el importe de la mensualidad?
                      </label>
                      <div className="flex items-center gap-3">
                        <input type="number" min="1" max="24"
                          value={form.periodicidadMeses}
                          onChange={e => setForm({ ...form, periodicidadMeses: e.target.value })}
                          placeholder="3"
                          className="w-24 border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                        <span className="text-sm text-stone-400">
                          {form.periodicidadMeses === '1'  ? 'mes (mensual)'         :
                           form.periodicidadMeses === '3'  ? 'meses (trimestral)'    :
                           form.periodicidadMeses === '4'  ? 'meses (cuatrimestral)' :
                           form.periodicidadMeses === '6'  ? 'meses (semestral)'     :
                           form.periodicidadMeses === '12' ? 'meses (anual)'         :
                           form.periodicidadMeses ? 'meses' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { if (validarPaso3()) setStep(3) }} disabled={!form.estado}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >Continuar</button>
                  <button onClick={() => { handleSubmit(true) }}
                    className="border border-stone-200 text-stone-400 px-6 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                  >Completar después</button>
                  <button onClick={() => setStep(1)}
                    className="border border-stone-200 text-stone-500 px-6 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                  >Atrás</button>
                </div>
              </div>
            )}

            {/* Paso 4 — Confirmar */}
            {step === 3 && (
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-4">Revisá y confirmá</p>
                <div className="bg-stone-50 rounded-xl p-6 space-y-1 mb-6">
                  {[
                    { k: 'Tipo',           v: form.tipo          },
                    { k: 'Nombre/Apodo',   v: form.nombre || '—' },
                    { k: 'Calle',          v: form.calle         },
                    { k: 'Número',         v: form.numero        },
                    form.piso   && { k: 'Piso',    v: form.piso   },
                    form.dpto   && { k: 'Dpto.',   v: form.dpto   },
                    form.barrio && { k: 'Barrio',  v: form.barrio },
                    { k: 'Localidad',      v: form.localidad     },
                    { k: 'Provincia',      v: form.provincia     },
                    { k: 'Estado',         v: form.estado        },
                    form.servicios.length > 0 && { k: 'Servicios', v: form.servicios.join(' · ') },
                    form.inquilino         && { k: 'Inquilino',               v: form.inquilino                   },
                    form.inicioContrato    && { k: 'Inicio contrato',         v: form.inicioContrato              },
                    form.finContrato       && { k: 'Fin contrato',            v: form.finContrato                 },
                    form.alquilerRaw       && { k: 'Alquiler mensual',        v: formatCurrency(form.alquilerRaw) },
                    form.indiceId          && { k: 'Índice',                  v: form.indiceId                    },
                    form.periodicidadMeses && { k: 'Actualización del importe', v: `Cada ${form.periodicidadMeses} meses` },
                  ].filter(Boolean).map((row, i, arr) => (
                    <div key={i} className={`flex justify-between items-center py-2.5 ${i < arr.length - 1 ? 'border-b border-stone-200' : ''}`}>
                      <span className="text-xs text-stone-400">{row.k}</span>
                      <span className="text-sm font-medium text-stone-800 capitalize">{row.v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleSubmit(false)}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >✓ Guardar propiedad</button>
                  <button onClick={() => setStep(2)}
                    className="border border-stone-200 text-stone-500 px-6 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                  >Atrás</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lista */}
        <div className="space-y-4">
          {properties.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 px-6 py-16 text-center">
              <p className="text-2xl mb-3">🏠</p>
              <p className="text-sm font-medium text-stone-700">Todavía no tenés propiedades</p>
              <p className="text-xs text-stone-400 mt-1">Cliqueá "+ Nueva propiedad" para empezar</p>
            </div>
          ) : (
            properties.map(prop => {
              const colors   = propStatusColors[prop.status] || propStatusColors.vacia
              const contract = prop.contracts?.[0]
              return (
                <div key={prop.id} onClick={() => setSelectedProp(prop)}
                  className="bg-white rounded-xl border border-stone-200 px-6 py-5 flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">⌂</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-800">{prop.name}</p>
                      {prop.is_incomplete && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium border border-amber-200">
                          ⚠ Incompleta
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400">{prop.address}</p>
                    {contract && (
                      <p className="text-xs text-stone-400 mt-1">
                        {contract.tenant_name} · {formatCurrency(contract.monthly_rent)}/mes
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${colors.text} ${colors.bg}`}>
                    {colors.label}
                  </span>
                  <span className="text-stone-300 text-sm">→</span>
                </div>
              )
            })
          )}
          <button
            onClick={() => { setShowForm(true); setStep(0); setForm(emptyForm); setErrors({}) }}
            className="w-full border border-dashed border-blue-300 rounded-xl py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          >
            + Agregar propiedad
          </button>
        </div>
      </div>
    </MainLayout>
  )
}