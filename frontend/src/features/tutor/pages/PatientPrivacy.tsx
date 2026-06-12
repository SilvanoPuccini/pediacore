import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";

export default function PatientPrivacy() {
  return (
    <>
      <SEOHead
        title="Derechos del Paciente y Privacidad Médica"
        description="Tus derechos como paciente y tutor: ficha clínica, datos de salud, acceso, rectificación y protección de datos médicos."
        url="https://estefipediatra.com/portal/privacidad"
      />

      <div className="max-w-[720px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
            <Shield size={20} className="text-teal-dark" />
          </div>
          <div>
            <h1 className="font-display text-[26px] font-semibold text-ink">
              Privacidad y Derechos del Paciente
            </h1>
            <p className="text-[13px] text-ink3">
              Cómo protegemos los datos médicos de tu familia
            </p>
          </div>
        </div>

        <p className="text-[14px] text-ink2 leading-relaxed">
          En <strong className="text-ink">Dra. Estefi Pediatra</strong> nos tomamos muy en serio
          la protección de los datos de salud de tus hijos. Esta página detalla tus derechos como
          tutor y paciente, conforme a la legislación vigente en Chile.
        </p>

        <hr className="border-line" />

        {/* 1 — Marco legal */}
        <Section title="1. Marco legal aplicable">
          <p>
            Los datos de salud gestionados en esta plataforma están protegidos por:
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>
              <strong className="text-ink">Ley N° 20.584</strong> — Regula los derechos y deberes
              que tienen las personas en relación con acciones vinculadas a su atención en salud.
            </li>
            <li>
              <strong className="text-ink">Ley N° 19.628</strong> — Sobre protección de la vida
              privada y datos personales.
            </li>
            <li>
              <strong className="text-ink">Decreto Supremo N° 41/2012</strong> — Reglamento sobre
              fichas clínicas del Ministerio de Salud.
            </li>
            <li>
              <strong className="text-ink">Código Sanitario</strong> — Artículos relativos al
              secreto profesional médico.
            </li>
          </ul>
        </Section>

        {/* 2 — Ficha clínica */}
        <Section title="2. La ficha clínica">
          <p>
            La ficha clínica es el instrumento obligatorio en el que se registra el conjunto de
            antecedentes relativos a las diferentes áreas relacionadas con la salud de las personas.
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>
              Es un <strong className="text-ink">documento privado y reservado</strong>. Solo pueden
              acceder a ella el equipo de salud tratante y el titular o su representante legal.
            </li>
            <li>
              Se conserva por un <strong className="text-ink">mínimo de 15 años</strong> desde el
              último registro, conforme al DS 41/2012.
            </li>
            <li>
              Incluye: datos de identificación, antecedentes médicos, consultas (notas SOAP), examen
              físico, antropometría, diagnósticos, indicaciones y archivos adjuntos.
            </li>
            <li>
              Cada acceso a la ficha clínica queda registrado en un{" "}
              <strong className="text-ink">log de auditoría</strong> con fecha, hora y usuario.
            </li>
          </ul>
        </Section>

        {/* 3 — Datos sensibles */}
        <Section title="3. Datos sensibles de menores">
          <p>
            Los datos de salud de menores de edad son{" "}
            <strong className="text-ink">datos sensibles</strong> con protección reforzada:
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>
              Solo el tutor (madre, padre o tutor legal) puede autorizar el tratamiento de datos de
              salud de un menor.
            </li>
            <li>
              La plataforma registra qué adulto autorizó cada acción (reserva, creación de perfil,
              carga de archivos).
            </li>
            <li>
              Los co-responsables que registres pueden agendar turnos y acompañar al menor, pero{" "}
              <strong className="text-ink">no acceden a la ficha clínica</strong> salvo que sean
              designados como tutores.
            </li>
            <li>
              Los datos de salud{" "}
              <strong className="text-ink">nunca se usan con fines publicitarios</strong>,
              estadísticos ni se comparten con terceros fuera del contexto asistencial.
            </li>
          </ul>
        </Section>

        {/* 4 — Derechos */}
        <Section title="4. Tus derechos como tutor y paciente">
          <p>Conforme a la ley, tenés derecho a:</p>

          <div className="space-y-3 mt-3">
            <RightCard
              title="Acceso"
              text="Solicitar una copia completa de la ficha clínica de tu hijo/a. La plataforma permite
              exportar tus datos personales desde el perfil."
            />
            <RightCard
              title="Rectificación"
              text="Corregir datos personales inexactos (nombre, RUT, teléfono, dirección). Los datos
              clínicos solo pueden ser modificados por la profesional tratante con justificación clínica."
            />
            <RightCard
              title="Cancelación / eliminación"
              text="Podés solicitar la eliminación de tu cuenta y datos personales. Sin embargo, la ficha
              clínica no puede eliminarse antes del plazo legal de 15 años (DS 41/2012)."
            />
            <RightCard
              title="Oposición"
              text="Podés oponerte a determinados tratamientos de datos no esenciales (ej: comunicaciones
              informativas). Las notificaciones de turnos confirmados no pueden desactivarse ya que son
              parte del servicio contratado."
            />
            <RightCard
              title="Portabilidad"
              text="Podés solicitar tus datos en formato estructurado y legible por máquina (JSON). Usá
              el botón 'Exportar datos' en tu perfil para descargar una copia inmediata."
            />
            <RightCard
              title="Información"
              text="Tenés derecho a conocer qué datos almacenamos, con qué finalidad, quién accede a
              ellos y por cuánto tiempo se conservan. Esta página cumple con ese deber de información."
            />
          </div>
        </Section>

        {/* 5 — Seguridad */}
        <Section title="5. Medidas de seguridad">
          <p>Implementamos las siguientes medidas para proteger los datos médicos:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>Comunicación cifrada de extremo a extremo (HTTPS/TLS 1.2+).</li>
            <li>Contraseñas almacenadas con hash Argon2 (imposible de revertir).</li>
            <li>Control de acceso por roles (tutor, médico, administrador).</li>
            <li>Registro de auditoría de todos los accesos a fichas clínicas.</li>
            <li>Rate limiting para prevenir ataques de fuerza bruta.</li>
            <li>Copias de seguridad cifradas periódicas.</li>
            <li>Headers de seguridad HTTP (HSTS, CSP, X-Frame-Options).</li>
          </ul>
        </Section>

        {/* 6 — Quién accede */}
        <Section title="6. Quién puede acceder a los datos">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-[13px] border border-line rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-cream text-ink text-left">
                  <th className="px-3 py-2 font-semibold border-b border-line">Rol</th>
                  <th className="px-3 py-2 font-semibold border-b border-line">Acceso</th>
                </tr>
              </thead>
              <tbody className="text-ink2">
                <tr className="border-b border-line">
                  <td className="px-3 py-2 font-medium text-ink">Dra. Estefi (Médica)</td>
                  <td className="px-3 py-2">
                    Ficha clínica completa, datos del tutor, historial de consultas, archivos médicos.
                  </td>
                </tr>
                <tr className="border-b border-line">
                  <td className="px-3 py-2 font-medium text-ink">Tutor (vos)</td>
                  <td className="px-3 py-2">
                    Datos propios, perfiles de tus hijos, turnos, archivos que subiste, resumen de consultas.
                    No accedés a notas clínicas internas (SOAP) si la doctora las restringe.
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-ink">Co-responsable</td>
                  <td className="px-3 py-2">
                    Solo puede agendar turnos y/o acompañar al menor. No accede a datos clínicos ni al portal.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 7 — Cómo ejercer */}
        <Section title="7. Cómo ejercer tus derechos">
          <p>Para cualquier solicitud relacionada con tus datos:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>
              <strong className="text-ink">Desde el portal:</strong> usá los botones "Editar perfil"
              y "Exportar datos" en tu perfil.
            </li>
            <li>
              <strong className="text-ink">Por email:</strong> escribí a{" "}
              <a
                href="mailto:contacto@estefipediatra.com"
                className="text-teal-dark hover:underline"
              >
                contacto@estefipediatra.com
              </a>{" "}
              indicando tu nombre, RUT y el derecho que querés ejercer.
            </li>
            <li>
              <strong className="text-ink">Plazo de respuesta:</strong> 2 días hábiles para
              solicitudes simples; hasta 20 días hábiles para solicitudes complejas (ej: copia
              completa de ficha clínica).
            </li>
          </ul>
        </Section>

        {/* 8 — Retención */}
        <Section title="8. Plazos de conservación">
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong className="text-ink">Ficha clínica:</strong> 15 años desde el último registro
              (obligación legal).
            </li>
            <li>
              <strong className="text-ink">Datos de pago:</strong> 6 años (obligación tributaria).
            </li>
            <li>
              <strong className="text-ink">Datos de cuenta:</strong> mientras la cuenta esté activa.
              Tras eliminación, se anonimiza en 30 días.
            </li>
            <li>
              <strong className="text-ink">Logs de auditoría:</strong> 15 años (acompañan la ficha
              clínica).
            </li>
          </ul>
        </Section>

        <hr className="border-line" />

        <p className="text-[13px] text-ink3">
          Última actualización: junio de 2026. Esta política se revisa periódicamente y se
          notificará cualquier cambio significativo a los usuarios registrados.
        </p>

        <Link
          to="/portal/perfil"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-teal-dark hover:underline"
        >
          <ArrowLeft size={14} />
          Volver a mi perfil
        </Link>
      </div>
    </>
  );
}

// ─── Reusable section ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-[18px] font-semibold text-ink mb-2">{title}</h2>
      <div className="text-[14px] text-ink2 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function RightCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-cream/60 border border-line rounded-[12px] px-4 py-3">
      <p className="text-[13px] font-bold text-ink mb-0.5">{title}</p>
      <p className="text-[13px] text-ink2 leading-relaxed">{text}</p>
    </div>
  );
}
