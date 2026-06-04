import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Copy, ExternalLink, Upload, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useBookingStore } from "../store/bookingStore";
import type { BankDetails } from "@/types/api";
import { formatPrice } from "../utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TransferInstructionsProps {
  paymentId: number;
  amount: number;
  bankDetails: BankDetails;
  onUploadComplete?: () => void;
}

interface BankRow {
  label: string;
  value: string;
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-[11px] text-ink3 hover:text-teal-dark transition-colors shrink-0"
      title="Copiar"
    >
      {copied ? (
        <span className="text-teal-dark font-semibold">Copiado!</span>
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TransferInstructions({
  paymentId,
  amount,
  bankDetails,
  onUploadComplete,
}: TransferInstructionsProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [allCopied, setAllCopied] = useState(false);

  const rows: BankRow[] = [
    { label: "Banco", value: bankDetails.bank_name },
    { label: "Tipo de cuenta", value: bankDetails.account_type },
    { label: "Número de cuenta", value: bankDetails.account_number },
    { label: "Titular", value: bankDetails.account_holder },
    { label: "RUT", value: bankDetails.account_rut },
    { label: "Email", value: bankDetails.account_email },
  ];

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("receipt", file);
      const { data } = await api.post(
        `/payments/${paymentId}/upload-receipt/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
    onSuccess: () => {
      setUploadDone(true);
      onUploadComplete?.();
    },
  });

  function validateFile(file: File): string | null {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    const allowedExt = [".pdf", ".jpg", ".jpeg", ".png"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!allowed.includes(file.type) && !allowedExt.includes(ext)) {
      return "Solo se aceptan archivos PDF, JPG o PNG.";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "El archivo no puede superar 10MB.";
    }
    return null;
  }

  function handleFileSelect(file: File) {
    uploadMutation.reset();
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setFileError(null);
    uploadMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCopyAll() {
    const text = rows.map((r) => `${r.label}: ${r.value}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2500);
    } catch {
      // ignore
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Success screen after upload ──────────────────────────────────────────

  if (uploadDone) {
    return (
      <div className="space-y-6">
        <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-8 flex flex-col items-center text-center gap-4">
          <div className="h-14 w-14 rounded-full bg-teal/15 flex items-center justify-center">
            <CheckCircle size={28} className="text-teal-dark" />
          </div>
          <div>
            <h2 className="font-display text-[20px] font-semibold text-ink mb-1">
              Comprobante enviado
            </h2>
            <p className="text-[14px] text-ink2 max-w-[320px]">
              Tu comprobante fue enviado. Te avisaremos por email cuando la doctora lo confirme.
            </p>
          </div>
          <button
            onClick={() => {
              useBookingStore.getState().reset();
              navigate("/portal");
            }}
            className="mt-2 text-[14px] font-semibold text-teal-dark hover:underline flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            Ir a Mis turnos
          </button>
        </div>
      </div>
    );
  }

  // ── Main transfer instructions ───────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Amount to pay */}
      <div className="bg-teal/5 border border-teal/20 rounded-[16px] px-5 py-4 flex items-center justify-between">
        <span className="text-[14px] text-ink2">Monto a transferir</span>
        <span className="text-[20px] font-bold text-teal-dark">
          {formatPrice(amount)}
        </span>
      </div>

      {/* Bank details */}
      <div className="bg-surface rounded-[16px] border border-line p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-ink">Datos bancarios</h3>
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-[12px] font-medium text-teal-dark hover:underline"
          >
            <Copy size={13} />
            {allCopied ? "Copiado!" : "Copiar todos"}
          </button>
        </div>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-ink3 shrink-0 w-[120px]">{row.label}</span>
              <span className="text-[13px] font-semibold text-ink flex-1 text-right">
                {row.value}
              </span>
              <CopyButton text={row.value} />
            </div>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-[16px] px-5 py-4">
        <p className="text-[13px] text-amber-800">
          Una vez que hagas la transferencia, volvé a esta página y subí el comprobante para confirmar tu turno.
        </p>
      </div>

      {/* File upload */}
      <div>
        <p className="text-[13px] font-semibold text-ink mb-2">Comprobante de pago</p>

        {!selectedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-[16px] px-6 py-8 flex flex-col items-center gap-2 cursor-pointer transition-colors",
              isDragging
                ? "border-teal bg-teal/5"
                : "border-line bg-bg hover:border-ink3"
            )}
          >
            <Upload size={24} className="text-ink3" />
            <p className="text-[13px] text-ink2 text-center">
              Arrastrá tu comprobante aquí o{" "}
              <span className="text-teal-dark font-semibold">seleccioná un archivo</span>
            </p>
            <p className="text-[11px] text-ink3">PDF, JPG o PNG · máx. 10MB</p>
          </div>
        ) : (
          <div className="bg-surface rounded-[12px] border border-line px-4 py-3 flex items-center gap-3">
            <Upload size={16} className="text-teal-dark shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-ink3">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="text-ink3 hover:text-coral transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="hidden"
        />

        {fileError && (
          <p className="text-[12px] text-coral mt-2">{fileError}</p>
        )}
      </div>

      {/* Upload error */}
      {uploadMutation.isError && (
        <div className="bg-coral/10 border border-coral/30 rounded-[12px] px-4 py-3">
          <p className="text-[13px] text-ink font-semibold">No se pudo subir el comprobante</p>
          <p className="text-[12px] text-ink2 mt-0.5">
            Verificá tu conexión e intentá de nuevo.
          </p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        disabled={!selectedFile || uploadMutation.isPending}
        onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
        className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3.5 font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
      >
        {uploadMutation.isPending ? "Subiendo..." : "Ya transferí — subir comprobante"}
      </button>
    </div>
  );
}
