import SEOHead from "@/components/seo/SEOHead";

export default function PrivacyPage() {
  return (
    <>
      <SEOHead
        title="Política de Privacidad — estefipediatra.com"
        description="Cómo recopilamos, usamos y protegemos los datos personales de los usuarios y pacientes de estefipediatra.com."
        url="https://estefipediatra.com/privacy"
      />

      <div className="max-w-[720px] mx-auto px-4 py-12">
        <h1 className="font-display text-[32px] font-semibold text-ink mb-2">
          Política de Privacidad
        </h1>
        <p className="text-[14px] text-ink2 mb-8">
          <strong className="text-ink">Sitio:</strong> estefipediatra.com &nbsp;·&nbsp;{" "}
          <strong className="text-ink">Última actualización:</strong> 31 de mayo de 2025
        </p>

        <p className="text-[15px] text-ink2 leading-relaxed mb-4">
          Esta Política de Privacidad describe cómo se recopilan, utilizan, almacenan y protegen los
          datos personales de los usuarios y pacientes del sitio web estefipediatra.com (en adelante,
          el "Sitio"), operado por la{" "}
          <strong className="text-ink">Dra. Estefanía Ortigosa</strong>, médica pediatra (en
          adelante, la "Profesional" o "Responsable del tratamiento").
        </p>
        <p className="text-[15px] text-ink2 leading-relaxed mb-4">
          Al marcar la casilla de aceptación y completar el pago de una consulta, usted (en
          adelante, el "Usuario" o "Tutor") declara haber leído y aceptado esta Política.
        </p>
        <p className="text-[15px] text-ink2 leading-relaxed mb-8">
          Esta Política se rige por la{" "}
          <strong className="text-ink">Ley N° 19.628 sobre Protección de la Vida Privada</strong> y
          la{" "}
          <strong className="text-ink">Ley N° 20.584 sobre Derechos y Deberes de los Pacientes</strong>{" "}
          de Chile.
        </p>

        <hr className="border-line my-8" />

        {/* 1 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          1. Responsable del tratamiento
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          La responsable del tratamiento de los datos personales es la Dra. Estefanía Ortigosa.
        </p>
        <ul className="list-disc list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>
            <strong className="text-ink">Contacto para temas de privacidad:</strong>{" "}
            <a href="mailto:contacto@estefipediatra.com" className="text-teal-dark hover:underline">
              contacto@estefipediatra.com
            </a>
          </li>
        </ul>

        {/* 2 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          2. Datos que recopilamos
        </h2>

        <h3 className="font-semibold text-[16px] text-ink mt-6 mb-2">
          2.1. Datos del Tutor (quien reserva)
        </h3>
        <ul className="list-disc list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>Nombre y apellidos</li>
          <li>RUT o documento de identidad</li>
          <li>Correo electrónico</li>
          <li>Teléfono de contacto</li>
          <li>Relación con el paciente (madre, padre, tutor legal)</li>
          <li>Dirección, comuna, región y país (cuando corresponda)</li>
        </ul>

        <h3 className="font-semibold text-[16px] text-ink mt-6 mb-2">
          2.2. Datos del Paciente (menor de edad)
        </h3>
        <ul className="list-disc list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>Nombre y apellidos</li>
          <li>Fecha de nacimiento</li>
          <li>Sexo asignado al nacer</li>
          <li>RUT o documento de identidad</li>
          <li>Previsión de salud (FONASA, Isapre, particular)</li>
          <li>
            Datos clínicos: antecedentes, mediciones de crecimiento (peso, talla, perímetro
            cefálico), exámenes, evolución, diagnósticos e indicaciones
          </li>
          <li>
            Archivos médicos que el Tutor cargue voluntariamente (exámenes, informes, certificados)
          </li>
        </ul>

        <h3 className="font-semibold text-[16px] text-ink mt-6 mb-2">
          2.3. Datos de pago
        </h3>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          El procesamiento del pago se realiza a través de un proveedor externo (pasarela de pago).{" "}
          <strong className="text-ink">
            No almacenamos los datos completos de tarjetas de crédito o débito.
          </strong>{" "}
          Solo conservamos el estado de la transacción, el monto y un identificador de referencia.
        </p>

        <h3 className="font-semibold text-[16px] text-ink mt-6 mb-2">
          2.4. Datos técnicos
        </h3>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Dirección IP, tipo de navegador y datos de navegación recopilados mediante cookies y
          tecnologías similares.
        </p>

        {/* 3 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          3. Finalidad del tratamiento
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Los datos se utilizan para:
        </p>
        <ol className="list-[lower-alpha] list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>Gestionar la reserva, confirmación y recordatorio de consultas.</li>
          <li>Procesar pagos y emitir comprobantes.</li>
          <li>
            Crear y mantener la ficha clínica del paciente, conforme a la Ley N° 20.584.
          </li>
          <li>Brindar la atención médica y su seguimiento.</li>
          <li>
            Enviar comunicaciones relacionadas con la consulta (confirmaciones, recordatorios,
            indicaciones).
          </li>
          <li>Cumplir obligaciones legales, tributarias y sanitarias.</li>
          <li>Mejorar el funcionamiento y la seguridad del Sitio.</li>
        </ol>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Los datos clínicos <strong className="text-ink">no se utilizan con fines publicitarios ni se comercializan</strong>.
        </p>

        {/* 4 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          4. Base de legitimación
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          El tratamiento se basa en:
        </p>
        <ul className="list-disc list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>
            El <strong className="text-ink">consentimiento</strong> del Tutor, otorgado al aceptar
            esta Política y reservar la consulta.
          </li>
          <li>
            La <strong className="text-ink">ejecución de la prestación</strong> del servicio médico
            solicitado.
          </li>
          <li>
            El <strong className="text-ink">cumplimiento de obligaciones legales</strong> (sanitarias,
            tributarias y de protección al consumidor).
          </li>
        </ul>

        {/* 5 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          5. Consentimiento para datos de salud de menores
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          5.1. Los datos de salud son{" "}
          <strong className="text-ink">datos sensibles</strong> y reciben protección reforzada.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          5.2. Al reservar una consulta, el Tutor declara ser madre, padre o tutor legal del
          paciente menor de edad y{" "}
          <strong className="text-ink">
            otorga su consentimiento libre, expreso e informado
          </strong>{" "}
          para el tratamiento de los datos de salud del menor con la finalidad de recibir la
          atención médica.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          5.3. La ficha clínica es un documento privado y reservado, conforme a la Ley N° 20.584.
          Solo accederán a ella la Profesional y el personal autorizado, y el propio Tutor respecto
          del paciente a su cargo.
        </p>

        {/* 6 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          6. Con quién compartimos datos
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Los datos pueden ser compartidos únicamente con:
        </p>
        <ul className="list-disc list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>
            <strong className="text-ink">
              Proveedores que prestan servicios al Sitio
            </strong>{" "}
            (pasarela de pago, proveedor de envío de correos, proveedor de almacenamiento de
            archivos, infraestructura de servidores), quienes tratan los datos solo para esos fines
            y bajo obligaciones de confidencialidad.
          </li>
          <li>
            <strong className="text-ink">Autoridades competentes</strong>, cuando exista una
            obligación legal o requerimiento judicial.
          </li>
        </ul>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          No se transfieren datos a terceros con fines comerciales.
        </p>

        {/* 7 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          7. Conservación de los datos
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          7.1. Los datos clínicos se conservan por el plazo que exige la normativa sanitaria
          chilena.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          7.2. Los datos de pago y facturación se conservan por los plazos exigidos por la normativa
          tributaria.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          7.3. Los datos de cuenta se conservan mientras la cuenta permanezca activa.
        </p>

        {/* 8 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          8. Derechos del titular
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Conforme a la Ley N° 19.628, el Usuario puede ejercer los derechos de:
        </p>
        <ul className="list-disc list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>
            <strong className="text-ink">Acceso:</strong> conocer qué datos tenemos.
          </li>
          <li>
            <strong className="text-ink">Rectificación:</strong> corregir datos inexactos.
          </li>
          <li>
            <strong className="text-ink">Cancelación / eliminación:</strong> solicitar la
            eliminación, con las limitaciones que impone la normativa sanitaria respecto de la ficha
            clínica.
          </li>
          <li>
            <strong className="text-ink">Oposición:</strong> oponerse a determinados tratamientos.
          </li>
        </ul>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Para ejercerlos, escriba a{" "}
          <a href="mailto:contacto@estefipediatra.com" className="text-teal-dark hover:underline">
            contacto@estefipediatra.com
          </a>
          . Responderemos en los plazos legales.
        </p>

        {/* 9 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          9. Seguridad
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Aplicamos medidas técnicas y organizativas para proteger los datos, entre ellas:
        </p>
        <ul className="list-disc list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>Cifrado de la comunicación (HTTPS).</li>
          <li>Cifrado de datos sensibles en reposo.</li>
          <li>Control de acceso por roles y autenticación.</li>
          <li>Registro de auditoría de accesos a fichas clínicas.</li>
          <li>Copias de seguridad periódicas.</li>
        </ul>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Ningún sistema es completamente infalible, pero trabajamos para mantener estándares de
          seguridad acordes a la sensibilidad de los datos médicos.
        </p>

        {/* 10 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          10. Cookies
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          El Sitio utiliza cookies propias y de terceros para el funcionamiento, la seguridad y el
          análisis de uso. El Usuario puede configurar su navegador para rechazar cookies, aunque
          ello puede afectar algunas funcionalidades.
        </p>

        {/* 11 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          11. Menores de edad
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          El Sitio está dirigido a tutores adultos. Los datos de menores se tratan exclusivamente
          bajo el consentimiento y la responsabilidad del Tutor.
        </p>

        {/* 12 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          12. Cambios en esta Política
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Podemos actualizar esta Política. Los cambios regirán desde su publicación en el Sitio.
          Recomendamos revisarla periódicamente.
        </p>

        {/* 13 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          13. Contacto
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Para consultas sobre privacidad o ejercicio de derechos:{" "}
          <a href="mailto:contacto@estefipediatra.com" className="text-teal-dark hover:underline">
            contacto@estefipediatra.com
          </a>
          .
        </p>

        <hr className="border-line my-8" />

        <a href="/" className="text-teal-dark hover:underline text-[14px]">
          ← Volver al inicio
        </a>
      </div>
    </>
  );
}
