import ReactDatePicker, { registerLocale } from 'react-datepicker'
import { es } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

// Registrar español
registerLocale('es', es)

// Convierte string YYYY-MM-DD a Date
function strToDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Convierte Date a string YYYY-MM-DD
function dateToStr(date) {
  if (!date) return ''
  const y  = date.getFullYear()
  const m  = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function DatePicker({ value, onChange, label, required, error, minDate, maxDate, placeholder }) {
  const hoy      = new Date()
  const selected = strToDate(value)
  const min      = minDate ? strToDate(minDate) : new Date(hoy.getFullYear() - 20, 0, 1)
  const max      = maxDate ? strToDate(maxDate) : new Date(hoy.getFullYear() + 20, 11, 31)

  return (
    <div className="datepicker-wrapper">
      {label && (
        <label className="text-xs text-stone-500 block mb-1">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <ReactDatePicker
        selected={selected}
        onChange={date => onChange(dateToStr(date))}
        locale="es"
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder || 'dd/mm/aaaa'}
        minDate={min}
        maxDate={max}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-stone-200'
        }`}
        calendarClassName="propmanager-calendar"
        isClearable={false}
        autoComplete="off"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <style>{`
        .datepicker-wrapper .react-datepicker-wrapper {
          width: 100%;
        }
        .datepicker-wrapper input {
          width: 100%;
          box-sizing: border-box;
        }
        .propmanager-calendar {
          font-family: inherit;
          border: 0.5px solid #E8E6DF;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .propmanager-calendar .react-datepicker__header {
          background: #E6F1FB;
          border-bottom: 0.5px solid #D0E4F5;
          padding: 12px 0 8px;
        }
        .propmanager-calendar .react-datepicker__current-month {
          font-size: 14px;
          font-weight: 600;
          color: #0C447C;
          margin-bottom: 4px;
        }
        .propmanager-calendar .react-datepicker__day-name {
          color: #5A8FC2;
          font-size: 11px;
          font-weight: 500;
          width: 2.2rem;
        }
        .propmanager-calendar .react-datepicker__day {
          width: 2.2rem;
          height: 2.2rem;
          line-height: 2.2rem;
          font-size: 13px;
          color: #2C2C2A;
          border-radius: 50%;
          margin: 1px;
        }
        .propmanager-calendar .react-datepicker__day:hover {
          background: #E6F1FB;
          border-radius: 50%;
        }
        .propmanager-calendar .react-datepicker__day--selected {
          background: #185FA5 !important;
          color: white !important;
          border-radius: 50%;
          font-weight: 600;
        }
        .propmanager-calendar .react-datepicker__day--today {
          border: 1.5px solid #185FA5;
          color: #185FA5;
          font-weight: 600;
          border-radius: 50%;
        }
        .propmanager-calendar .react-datepicker__day--outside-month {
          color: #C8C6BC;
        }
        .propmanager-calendar .react-datepicker__day--disabled {
          color: #D3D1C7;
        }
        .propmanager-calendar .react-datepicker__navigation {
          top: 14px;
        }
        .propmanager-calendar .react-datepicker__navigation-icon::before {
          border-color: #185FA5;
        }
        .propmanager-calendar .react-datepicker__month-dropdown-container,
        .propmanager-calendar .react-datepicker__year-dropdown-container {
          margin: 0 4px;
        }
        .propmanager-calendar .react-datepicker__month-select,
        .propmanager-calendar .react-datepicker__year-select {
          background: white;
          border: 0.5px solid #D0E4F5;
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 13px;
          color: #0C447C;
          font-weight: 500;
          cursor: pointer;
        }
        .propmanager-calendar .react-datepicker__triangle {
          display: none;
        }
      `}</style>
    </div>
  )
}   