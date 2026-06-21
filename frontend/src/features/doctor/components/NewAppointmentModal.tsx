import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Search,
  ChevronRight,
  Check,
  Loader2,
  User,
  Calendar,
  Clock,
  MapPin,
  Wifi,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import type {
  Patient,
  Service,
  Location,
  AvailableSlot,
  PaginatedResponse,
} from "@/types/api";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── Step type ────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Paciente",
  2: "Servicio",
  3: "Fecha y hora",
  4: "Confirmar",
};

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  patient: Patient | null;
  service: Service | null;
  location: Location | null;
  isOnline: boolean;
  date: string;
  time: string;
  customTime: string;
  useCustomTime: boolean;
  notes: string;
}

const INITIAL_FORM: FormState = {
  patient: null,
  service: null,
  location: null,
  isOnline: false,
  date: "",
  time: "",
  customTime: "",
  useCustomTime: false,
  notes: "",
};

// ─── Age formatting ───────────────────────────────────────────────────────────

function formatAge(age: { years: number; months: number }): string {
  if (age.years === 0) return `${age.months} meses`;
  if (age.months === 0) return `${age.years} año${age.years !== 1 ? "s" : ""}`;
  return `${age.years} a ${age.months} m`;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: Step }) {
  const steps: Step[] = [1, 2, 3, 4];
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all",
                  done
                    ? "bg-teal-dark text-white"
                    : active
                    ? "bg-teal-dark text-white ring-4 ring-teal/20"
                    : "bg-bg border border-line text-ink3",
                ].join(" ")}
              >
                {done ? <Check size={12} /> : step}
              </div>
              <span
                className={[
                  "text-[10.5px] font-semibold whitespace-nowrap",
                  active ? "text-teal-dark" : done ? "text-teal-dark" : "text-ink3",
                ].join(" ")}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={[
                  "w-10 h-px mx-1 mb-4 transition-colors",
                  done ? "bg-teal-dark" : "bg-line",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Patient Search ───────────────────────────────────────────────────

function Step1Patient({
  selected,
  onSelect,
}: {
  selected: Patient | null;
  onSelect: (p: Patient) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["patients-search", debouncedQuery],
    queryFn: () =>
      api
        .get<PaginatedResponse<Patient>>("/patients/", {
          params: { search: debouncedQuery, page_size: 10 },
        })
        .then((r) => r.data.results),
    enabled: debouncedQuery.length >= 2,
  });

  const patients = data ?? [];

  return (
    <div className="space-y-4">
      {selected && (
        <div className="flex items-center gap-3 p-3 rounded-[12px] bg-teal/8 border border-teal/20">
          <div className="w-9 h-9 rounded-full bg-teal/15 flex items-center justify-center text-[13px] font-bold text-teal-dark shrink-0">
            {selected.first_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-ink">{selected.full_name}</p>
            <p className="text-[11.5px] text-ink3">
              {selected.rut} · {formatAge(selected.age)}
            </p>
          </div>
          <button
            onClick={() => setQuery("")}
            className="text-[11.5px] font-semibold text-teal-dark hover:underline shrink-0"
          >
            Cambiar
          </button>
        </div>
      )}

      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o RUT..."
          className="w-full pl-9 pr-4 py-2.5 rounded-[10px] border border-line bg-bg text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30"
        />
        {isLoading && (
          <Loader2
            size={13}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink3"
          />
        )}
      </div>

      {debouncedQuery.length >= 2 && !isLoading && patients.length === 0 && (
        <p className="text-[12.5px] text-ink3 text-center py-3">
          Sin resultados para &quot;{debouncedQuery}&quot;
        </p>
      )}

      {patients.length > 0 && (
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
          {patients.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={[
                "w-full flex items-center gap-3 p-3 rounded-[12px] border transition-all text-left",
                selected?.id === p.id
                  ? "border-teal/30 bg-teal/8"
                  : "border-line hover:border-teal/20 hover:bg-teal/5 bg-surface",
              ].join(" ")}
            >
              <div className="w-9 h-9 rounded-full bg-bg border border-line flex items-center justify-center text-[12px] font-bold text-ink2 shrink-0">
                {p.first_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-ink truncate">{p.full_name}</p>
                <p className="text-[11.5px] text-ink3">
                  {p.rut} · {formatAge(p.age)}
                </p>
              </div>
              {selected?.id === p.id && (
                <Check size={14} className="text-teal-dark shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {debouncedQuery.length < 2 && !selected && (
        <div className="flex flex-col items-center gap-2 py-6 text-ink3">
          <User size={28} className="opacity-30" />
          <p className="text-[12.5px]">Escribí al menos 2 caracteres para buscar</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Service & Location ───────────────────────────────────────────────

function Step2Service({
  selectedService,
  selectedLocation,
  isOnline,
  onSelectService,
  onSelectLocation,
}: {
  selectedService: Service | null;
  selectedLocation: Location | null;
  isOnline: boolean;
  onSelectService: (s: Service) => void;
  onSelectLocation: (l: Location | null, online: boolean) => void;
}) {
  const servicesQ = useQuery({
    queryKey: ["services"],
    queryFn: () =>
      api
        .get<PaginatedResponse<Service>>("/practices/dra-estefi/services/")
        .then((r) => r.data.results),
    staleTime: 1000 * 60 * 10,
  });

  const locationsQ = useQuery({
    queryKey: ["locations"],
    queryFn: () =>
      api
        .get<PaginatedResponse<Location>>("/practices/dra-estefi/locations/")
        .then((r) => r.data.results),
    staleTime: 1000 * 60 * 60,
  });

  const services = (servicesQ.data ?? []).filter((s) => s.is_active);
  const locations = (locationsQ.data ?? []).filter((l) => l.is_active);

  return (
    <div className="space-y-5">
      {/* Services */}
      <div>
        <p className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.08em] mb-2">
          Servicio
        </p>
        {servicesQ.isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin text-teal" />
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectService(s)}
                className={[
                  "w-full flex items-center gap-3 px-3.5 py-3 rounded-[12px] border transition-all text-left",
                  selectedService?.id === s.id
                    ? "border-teal/30 bg-teal/8"
                    : "border-line hover:border-teal/20 hover:bg-teal/5 bg-surface",
                ].join(" ")}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{s.name}</p>
                  <p className="text-[11.5px] text-ink3">
                    {s.duration_minutes} min · ${s.price_clp.toLocaleString("es-CL")}
                  </p>
                </div>
                {selectedService?.id === s.id && (
                  <Check size={14} className="text-teal-dark shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Locations */}
      <div>
        <p className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.08em] mb-2">
          Sede / Modalidad
        </p>
        {locationsQ.isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin text-teal" />
          </div>
        ) : (
          <div className="inline-flex p-1 rounded-[10px] bg-bg gap-1 flex-wrap">
            {locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => onSelectLocation(loc, false)}
                className={[
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[12.5px] font-semibold transition-all",
                  !isOnline && selectedLocation?.id === loc.id
                    ? "bg-surface text-teal-dark shadow-card"
                    : "text-ink2 hover:text-ink",
                ].join(" ")}
              >
                <MapPin size={12} />
                {loc.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onSelectLocation(null, true)}
              className={[
                "flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[12.5px] font-semibold transition-all",
                isOnline
                  ? "bg-surface text-teal-dark shadow-card"
                  : "text-ink2 hover:text-ink",
              ].join(" ")}
            >
              <Wifi size={12} />
              Online
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Date & Time ──────────────────────────────────────────────────────

function Step3DateTime({
  service,
  location,
  isOnline,
  date,
  time,
  customTime,
  useCustomTime,
  onDateChange,
  onTimeSelect,
  onCustomTimeChange,
  onToggleCustomTime,
}: {
  service: Service | null;
  location: Location | null;
  isOnline: boolean;
  date: string;
  time: string;
  customTime: string;
  useCustomTime: boolean;
  onDateChange: (d: string) => void;
  onTimeSelect: (t: string) => void;
  onCustomTimeChange: (t: string) => void;
  onToggleCustomTime: (v: boolean) => void;
}) {
  const canFetchSlots = !!service && !!date && (!!location || isOnline);

  const slotsQ = useQuery({
    queryKey: ["available-slots", service?.id, date, location?.id ?? null],
    queryFn: () => {
      const params: Record<string, string> = {
        service: String(service!.id),
        date,
      };
      if (location) params.location = String(location.id);
      return api
        .get<AvailableSlot[]>("/available-slots/", { params })
        .then((r) => r.data);
    },
    enabled: canFetchSlots,
    staleTime: 1000 * 60 * 2,
  });

  const availableSlots = (slotsQ.data ?? []).filter((s) => s.available);

  return (
    <div className="space-y-4">
      {/* Date */}
      <div>
        <label className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.08em] block mb-2">
          Fecha
        </label>
        <div className="relative">
          <Calendar
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-[10px] border border-line bg-bg text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>
      </div>

      {/* Time slots */}
      {canFetchSlots && date && (
        <div>
          <label className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.08em] block mb-2">
            Horario
          </label>

          {slotsQ.isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-teal" />
            </div>
          )}

          {!slotsQ.isLoading && availableSlots.length > 0 && !useCustomTime && (
            <div className="flex flex-wrap gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.start_time}
                  type="button"
                  onClick={() => onTimeSelect(slot.start_time.slice(0, 5))}
                  className={[
                    "px-3.5 py-2 rounded-[9px] text-[12.5px] font-semibold border transition-all",
                    time === slot.start_time.slice(0, 5) && !useCustomTime
                      ? "bg-teal-dark text-white border-teal-dark"
                      : "border-line bg-surface text-ink2 hover:border-teal/30 hover:bg-teal/5",
                  ].join(" ")}
                >
                  {slot.start_time.slice(0, 5)}
                </button>
              ))}
            </div>
          )}

          {!slotsQ.isLoading && availableSlots.length === 0 && !useCustomTime && (
            <div className="flex items-center gap-2 p-3 rounded-[10px] bg-amber-50 border border-amber-200 text-[12.5px] text-amber-700">
              <AlertCircle size={14} className="shrink-0" />
              Sin horarios disponibles para esta fecha. Podés ingresar un horario personalizado.
            </div>
          )}

          {/* Custom time toggle */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => onToggleCustomTime(!useCustomTime)}
              className="text-[12px] font-semibold text-teal-dark hover:underline"
            >
              {useCustomTime ? "← Ver horarios disponibles" : "Ingresar horario personalizado"}
            </button>
          </div>

          {useCustomTime && (
            <div className="mt-2 relative">
              <Clock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none"
              />
              <input
                type="time"
                value={customTime}
                onChange={(e) => onCustomTimeChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-[10px] border border-line bg-bg text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30"
              />
            </div>
          )}
        </div>
      )}

      {!canFetchSlots && (
        <div className="flex flex-col items-center gap-2 py-6 text-ink3">
          <Clock size={26} className="opacity-30" />
          <p className="text-[12.5px]">
            {!service
              ? "Seleccioná un servicio primero"
              : !date
              ? "Elegí una fecha para ver los horarios"
              : "Seleccioná una sede o modalidad"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Confirm ──────────────────────────────────────────────────────────

function Step4Confirm({
  form,
  notes,
  onNotesChange,
  isPending,
  error,
  onSubmit,
}: {
  form: FormState;
  notes: string;
  onNotesChange: (v: string) => void;
  isPending: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const resolvedTime = form.useCustomTime ? form.customTime : form.time;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-[14px] border border-line bg-bg p-4 space-y-3">
        <SummaryRow
          icon={<User size={13} />}
          label="Paciente"
          value={form.patient?.full_name ?? "—"}
          sub={form.patient ? `${form.patient.rut} · ${formatAge(form.patient.age)}` : undefined}
        />
        <div className="h-px bg-line/60" />
        <SummaryRow
          icon={<Check size={13} />}
          label="Servicio"
          value={form.service?.name ?? "—"}
          sub={
            form.service
              ? `${form.service.duration_minutes} min · $${form.service.price_clp.toLocaleString("es-CL")}`
              : undefined
          }
        />
        <div className="h-px bg-line/60" />
        <SummaryRow
          icon={<MapPin size={13} />}
          label="Sede"
          value={form.isOnline ? "Online" : form.location?.name ?? "—"}
        />
        <div className="h-px bg-line/60" />
        <SummaryRow
          icon={<Calendar size={13} />}
          label="Fecha"
          value={form.date || "—"}
        />
        <div className="h-px bg-line/60" />
        <SummaryRow
          icon={<Clock size={13} />}
          label="Hora"
          value={resolvedTime || "—"}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.08em] block mb-2">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Motivo de consulta, indicaciones especiales..."
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13px] text-ink placeholder:text-ink3 resize-none focus:outline-none focus:ring-2 focus:ring-teal/30"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-[10px] bg-red-50 border border-red-200 text-[12.5px] text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending}
        className="w-full py-3 rounded-[12px] text-white text-[14px] font-semibold bg-teal-dark hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] transition-all disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Agendando...
          </>
        ) : (
          "Agendar turno"
        )}
      </button>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[12px] text-ink3 font-medium shrink-0 pt-0.5">
        {icon}
        {label}
      </span>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-ink">{value}</p>
        {sub && <p className="text-[11.5px] text-ink3">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function SuccessToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[110] flex items-center gap-2 px-4 py-3 rounded-[12px] text-white text-[12.5px] font-semibold shadow-[var(--shadow-pop)] animate-in fade-in slide-in-from-bottom-2 duration-200 bg-teal-dark">
      <Check size={14} />
      {message}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function NewAppointmentModal({ open, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setForm(INITIAL_FORM);
      setSubmitError(null);
      setToast(null);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // ── Mutation ──

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post("/appointments/", payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setToast("Turno agendado correctamente");
      setTimeout(() => {
        setToast(null);
        onSuccess?.();
        onClose();
      }, 1800);
    },
    onError: (err: unknown) => {
      let msg = "No se pudo agendar el turno. Verificá los datos e intentá de nuevo.";
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: unknown } }).response?.data === "object"
      ) {
        const data = (err as { response: { data: Record<string, unknown> } }).response.data;
        const first = Object.values(data)[0];
        if (Array.isArray(first)) msg = String(first[0]);
        else if (typeof first === "string") msg = first;
      }
      setSubmitError(msg);
    },
  });

  // ── Handlers ──

  const handleSelectPatient = useCallback((p: Patient) => {
    setForm((f) => ({ ...f, patient: p }));
  }, []);

  const handleSelectService = useCallback((s: Service) => {
    setForm((f) => ({ ...f, service: s, time: "", customTime: "", useCustomTime: false }));
  }, []);

  const handleSelectLocation = useCallback((loc: Location | null, online: boolean) => {
    setForm((f) => ({
      ...f,
      location: loc,
      isOnline: online,
      time: "",
      customTime: "",
      useCustomTime: false,
    }));
  }, []);

  const handleDateChange = useCallback((d: string) => {
    setForm((f) => ({ ...f, date: d, time: "", customTime: "", useCustomTime: false }));
  }, []);

  const handleTimeSelect = useCallback((t: string) => {
    setForm((f) => ({ ...f, time: t, useCustomTime: false }));
  }, []);

  const handleCustomTimeChange = useCallback((t: string) => {
    setForm((f) => ({ ...f, customTime: t }));
  }, []);

  const handleToggleCustomTime = useCallback((v: boolean) => {
    setForm((f) => ({ ...f, useCustomTime: v, time: v ? "" : f.time }));
  }, []);

  const handleNotesChange = useCallback((v: string) => {
    setForm((f) => ({ ...f, notes: v }));
  }, []);

  // ── Step validation ──

  function canAdvance(): boolean {
    if (step === 1) return !!form.patient;
    if (step === 2) return !!form.service && (!!form.location || form.isOnline);
    if (step === 3) {
      const t = form.useCustomTime ? form.customTime : form.time;
      return !!form.date && !!t;
    }
    return true;
  }

  function handleNext() {
    if (step < 4) setStep((s) => (s + 1) as Step);
  }

  function handleBack() {
    if (step > 1) {
      setSubmitError(null);
      setStep((s) => (s - 1) as Step);
    }
  }

  function handleSubmit() {
    setSubmitError(null);
    const resolvedTime = form.useCustomTime ? form.customTime : form.time;
    const payload: Record<string, unknown> = {
      patient: form.patient!.id,
      service: form.service!.id,
      scheduled_date: form.date,
      start_time: resolvedTime,
      is_online: form.isOnline,
      notes: form.notes,
    };
    if (form.location) {
      payload.location = form.location.id;
    }
    createMutation.mutate(payload);
  }

  if (!open) return null;

  const stepTitles: Record<Step, string> = {
    1: "Seleccionar paciente",
    2: "Servicio y sede",
    3: "Fecha y horario",
    4: "Confirmar turno",
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-appt-title"
          className="relative w-full max-w-[520px] bg-surface rounded-[20px] border border-line shadow-[var(--shadow-pop)] animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-line/60 shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2
                  id="new-appt-title"
                  className="text-[17px] font-bold text-ink"
                >
                  Nuevo turno
                </h2>
                <p className="text-[12.5px] text-ink3 mt-0.5">{stepTitles[step]}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-[8px] text-ink3 hover:text-ink hover:bg-bg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <Stepper current={step} />
          </div>

          {/* Body */}
          <div className="px-6 py-5 overflow-y-auto flex-1">
            {step === 1 && (
              <Step1Patient selected={form.patient} onSelect={handleSelectPatient} />
            )}
            {step === 2 && (
              <Step2Service
                selectedService={form.service}
                selectedLocation={form.location}
                isOnline={form.isOnline}
                onSelectService={handleSelectService}
                onSelectLocation={handleSelectLocation}
              />
            )}
            {step === 3 && (
              <Step3DateTime
                service={form.service}
                location={form.location}
                isOnline={form.isOnline}
                date={form.date}
                time={form.time}
                customTime={form.customTime}
                useCustomTime={form.useCustomTime}
                onDateChange={handleDateChange}
                onTimeSelect={handleTimeSelect}
                onCustomTimeChange={handleCustomTimeChange}
                onToggleCustomTime={handleToggleCustomTime}
              />
            )}
            {step === 4 && (
              <Step4Confirm
                form={form}
                notes={form.notes}
                onNotesChange={handleNotesChange}
                isPending={createMutation.isPending}
                error={submitError}
                onSubmit={handleSubmit}
              />
            )}
          </div>

          {/* Footer navigation (steps 1–3) */}
          {step < 4 && (
            <div className="px-6 py-4 border-t border-line/60 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={step === 1 ? onClose : handleBack}
                className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 border border-line hover:bg-bg transition-colors"
              >
                {step === 1 ? "Cancelar" : "← Atrás"}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] text-white text-[13px] font-semibold bg-teal-dark hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {step === 3 ? "Revisar" : "Siguiente"}
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Back button for step 4 */}
          {step === 4 && (
            <div className="px-6 pb-4 shrink-0">
              <button
                type="button"
                onClick={handleBack}
                disabled={createMutation.isPending}
                className="text-[12.5px] font-medium text-ink3 hover:text-ink transition-colors disabled:opacity-50"
              >
                ← Volver a editar
              </button>
            </div>
          )}
        </div>
      </div>

      <SuccessToast message={toast} />
    </>
  );
}
