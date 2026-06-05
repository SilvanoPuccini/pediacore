import SEOHead from "@/components/seo/SEOHead";

export default function TermsPage() {
  return (
    <>
      <SEOHead
        title="Términos y Condiciones — estefipediatra.com"
        description="Condiciones de uso del sitio y del servicio de reserva de consultas pediátricas con la Dra. Estefanía Ortigosa."
        url="https://estefipediatra.com/terms"
      />

      <div className="max-w-[720px] mx-auto px-4 pt-28 pb-12">
        <h1 className="font-display text-[32px] font-semibold text-ink mb-2">
          Términos y Condiciones
        </h1>
        <p className="text-[14px] text-ink2 mb-8">
          <strong className="text-ink">Sitio:</strong> estefipediatra.com &nbsp;·&nbsp;{" "}
          <strong className="text-ink">Última actualización:</strong> 31 de mayo de 2025
        </p>

        <p className="text-[15px] text-ink2 leading-relaxed mb-8">
          Estos Términos y Condiciones (en adelante, los "Términos") regulan el acceso y uso del
          sitio web estefipediatra.com (en adelante, el "Sitio") y la reserva y pago de consultas
          médicas pediátricas con la{" "}
          <strong className="text-ink">Dra. Estefanía Ortigosa</strong> (en adelante, la
          "Profesional"). Al marcar la casilla de aceptación y completar el pago de una consulta,
          usted (en adelante, el "Usuario", "Tutor" o "Cliente") declara haber leído, comprendido y
          aceptado en su totalidad estos Términos.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-8">
          Si no está de acuerdo con estos Términos, no debe completar la reserva ni el pago.
        </p>

        <hr className="border-line my-8" />

        {/* 1 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          1. Identificación del prestador
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          El Sitio es operado por la Dra. Estefanía Ortigosa, médica pediatra, con atención
          presencial en las ciudades de Pucón y Villarrica (Región de La Araucanía, Chile) y
          atención por modalidad online (telemedicina).
        </p>
        <ul className="list-disc list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>
            <strong className="text-ink">Contacto:</strong>{" "}
            <a href="mailto:contacto@estefipediatra.com" className="text-teal-dark hover:underline">
              contacto@estefipediatra.com
            </a>
          </li>
          <li>
            <strong className="text-ink">Teléfono:</strong> +56 9 5845 5537
          </li>
          <li>
            <strong className="text-ink">Direcciones de atención:</strong> Pucón, Región de La
            Araucanía / Villarrica, Región de La Araucanía
          </li>
        </ul>

        {/* 2 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          2. Objeto del servicio
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          El Sitio permite al Usuario:
        </p>
        <ol className="list-[lower-alpha] list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>Conocer los servicios profesionales ofrecidos por la Profesional.</li>
          <li>
            Reservar horas de consulta médica pediátrica, en modalidad presencial u online.
          </li>
          <li>
            Pagar de forma anticipada el valor de la consulta a través de medios de pago
            electrónico.
          </li>
          <li>
            Recibir confirmaciones, recordatorios y comprobantes asociados a la reserva.
          </li>
          <li>
            Acceder, en calidad de Tutor, a información del paciente menor de edad a su cargo.
          </li>
        </ol>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          El servicio médico propiamente tal se rige por la{" "}
          <strong className="text-ink">Ley N° 20.584 sobre Derechos y Deberes de los Pacientes</strong>{" "}
          y por las normas que regulan el ejercicio de la medicina en Chile.
        </p>

        {/* 3 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          3. Registro y cuenta de usuario
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          3.1. Para reservar una consulta, el Usuario debe crear una cuenta proporcionando datos
          veraces, exactos y actualizados.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          3.2. El Usuario es responsable de la confidencialidad de sus credenciales de acceso y de
          toda actividad realizada bajo su cuenta.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          3.3. El Usuario debe ser mayor de edad y actuar en calidad de madre, padre o tutor legal
          del paciente menor de edad para quien reserva la consulta.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          3.4. La Profesional podrá suspender o cancelar cuentas que registren información falsa,
          usos fraudulentos o incumplimientos de estos Términos.
        </p>

        {/* 4 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          4. Reserva de consultas
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          4.1. El Usuario selecciona sede o modalidad, tipo de consulta, paciente, fecha y hora
          disponible.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          4.2. Al iniciar el proceso de pago, el horario seleccionado queda{" "}
          <strong className="text-ink">reservado temporalmente</strong> por un plazo limitado (por
          defecto, 15 minutos). Si el pago no se completa dentro de ese plazo, la reserva se libera
          automáticamente y el horario vuelve a estar disponible para otros usuarios.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          4.3. La reserva se considera{" "}
          <strong className="text-ink">confirmada</strong> únicamente cuando el pago ha sido
          aprobado por la pasarela de pago y el sistema ha registrado dicha confirmación.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          4.4. La Profesional se reserva el derecho de reprogramar o cancelar una consulta por
          motivos de fuerza mayor, enfermedad u otras causas justificadas, en cuyo caso se ofrecerá
          una nueva fecha o el reembolso íntegro del monto pagado.
        </p>

        {/* 5 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          5. Valores y pagos
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          5.1. Los valores de cada consulta se expresan en{" "}
          <strong className="text-ink">pesos chilenos (CLP)</strong> e incluyen los impuestos que
          correspondan.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          5.2. El pago se realiza de forma anticipada a través de la pasarela de pago habilitada en
          el Sitio. El Usuario será dirigido a un entorno seguro del proveedor de pagos para
          completar la transacción.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          5.3. El Sitio <strong className="text-ink">no almacena</strong> los datos completos de
          tarjetas de crédito o débito; estos son procesados directamente por el proveedor de pagos.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          5.4. Determinados servicios pueden requerir documentación adicional (por ejemplo,
          certificado de afiliación a FONASA vigente para consultas con dicha cobertura). Es
          responsabilidad del Usuario presentar dicha documentación; de no hacerlo, podrá aplicarse
          el valor particular del servicio.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          5.5. Una vez confirmado el pago, el Usuario recibirá un comprobante. La emisión de boleta
          o documento tributario se realizará conforme a la normativa vigente del Servicio de
          Impuestos Internos (SII) de Chile.
        </p>

        {/* 6 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          6. Política de cancelación, reprogramación y reembolsos
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          6.1. El Usuario puede cancelar o reprogramar su consulta según la siguiente política:
        </p>
        <div className="mb-4 space-y-2">
          <div className="flex items-start gap-3 rounded-[12px] bg-green-50 border border-green-200 px-4 py-3">
            <span className="text-green-600 font-bold text-[13px] shrink-0 mt-0.5">+24 h</span>
            <p className="text-[14px] text-green-800 leading-relaxed">
              <strong>Con más de 24 horas de anticipación:</strong> reembolso del 100% del valor
              pagado, o reprogramación sin costo.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-[12px] bg-amber-50 border border-amber-200 px-4 py-3">
            <span className="text-amber-600 font-bold text-[13px] shrink-0 mt-0.5">12–24 h</span>
            <p className="text-[14px] text-amber-800 leading-relaxed">
              <strong>Entre 12 y 24 horas de anticipación:</strong> reembolso del 50% del valor
              pagado, o reprogramación sin costo.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-[12px] bg-red-50 border border-red-200 px-4 py-3">
            <span className="text-red-600 font-bold text-[13px] shrink-0 mt-0.5">&lt;12 h</span>
            <p className="text-[14px] text-red-800 leading-relaxed">
              <strong>Con menos de 12 horas de anticipación:</strong> sin derecho a reembolso.
            </p>
          </div>
        </div>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          6.2. En caso de reprogramación de una consulta ya pagada, el pago se traslada a la nueva
          fecha, sin necesidad de un nuevo cobro.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          6.3. Los reembolsos que correspondan se procesarán a través del mismo medio de pago
          utilizado, en los plazos que determine el proveedor de pagos.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          6.4. La inasistencia sin aviso previo ("no show") no genera derecho a reembolso.
        </p>

        {/* 7 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          7. Consultas en modalidad online (telemedicina)
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          7.1. Las consultas online se realizan mediante videollamada a través del enlace que se
          proporcionará al Usuario con anticipación.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          7.2. El Usuario es responsable de contar con conexión a internet estable y un dispositivo
          adecuado.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          7.3. La telemedicina tiene limitaciones inherentes. La Profesional podrá, según su
          criterio clínico, indicar que la consulta requiere atención presencial, derivación o
          exámenes complementarios.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          7.4. La consulta online <strong className="text-ink">no reemplaza la atención de
          urgencia</strong>. Ante una emergencia, el Usuario debe contactar al servicio de urgencias
          (SAMU 131) o acudir al centro asistencial más cercano.
        </p>

        {/* 8 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          8. Obligaciones del Usuario
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          El Usuario se compromete a:
        </p>
        <ol className="list-[lower-alpha] list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>
            Proporcionar información veraz y completa sobre sí mismo y sobre el paciente a su cargo.
          </li>
          <li>Utilizar el Sitio conforme a la ley, la moral y el orden público.</li>
          <li>No suplantar la identidad de terceros.</li>
          <li>
            No realizar acciones que afecten el funcionamiento del Sitio ni la seguridad de los
            datos.
          </li>
          <li>Presentar la documentación que corresponda al tipo de consulta reservada.</li>
        </ol>

        {/* 9 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          9. Propiedad intelectual
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Todo el contenido del Sitio (textos, diseño, logotipos, código, materiales del blog y
          recursos descargables) es propiedad de la Profesional o de sus respectivos titulares y se
          encuentra protegido por la legislación de propiedad intelectual. Queda prohibida su
          reproducción o uso sin autorización expresa.
        </p>

        {/* 10 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          10. Limitación de responsabilidad
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          10.1. La Profesional realiza sus mejores esfuerzos para mantener el Sitio operativo,
          seguro y disponible, pero no garantiza el funcionamiento ininterrumpido ni libre de
          errores.
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          10.2. La Profesional no será responsable por fallas atribuibles a terceros proveedores
          (pasarela de pago, proveedor de telemedicina, servicios de mensajería o correo
          electrónico, proveedores de infraestructura).
        </p>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          10.3. La responsabilidad por la atención médica se rige por las normas del ejercicio
          profesional de la medicina y la Ley N° 20.584.
        </p>

        {/* 11 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          11. Protección de datos
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          El tratamiento de los datos personales del Usuario y del paciente se rige por la{" "}
          <strong className="text-ink">Política de Privacidad</strong> publicada en{" "}
          <a href="/privacy" className="text-teal-dark hover:underline">
            estefipediatra.com/privacy
          </a>
          , que forma parte integrante de estos Términos. Al aceptar estos Términos, el Usuario
          declara haber leído y aceptado dicha Política.
        </p>

        {/* 12 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          12. Marco legal aplicable
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Estos Términos se rigen por las leyes de la República de Chile, en especial:
        </p>
        <ul className="list-disc list-inside text-[14px] text-ink2 leading-relaxed mb-3 space-y-1">
          <li>
            <strong className="text-ink">Ley N° 19.496</strong>, sobre Protección de los Derechos
            de los Consumidores.
          </li>
          <li>
            <strong className="text-ink">Ley N° 19.628</strong>, sobre Protección de la Vida
            Privada.
          </li>
          <li>
            <strong className="text-ink">Ley N° 20.584</strong>, sobre Derechos y Deberes de los
            Pacientes.
          </li>
        </ul>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Cualquier controversia será sometida a los tribunales competentes de Chile.
        </p>

        {/* 13 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          13. Modificaciones
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          La Profesional podrá modificar estos Términos en cualquier momento. Las modificaciones
          regirán desde su publicación en el Sitio. El uso continuado del Sitio con posterioridad a
          una modificación implica la aceptación de los Términos vigentes.
        </p>

        {/* 14 */}
        <h2 className="font-display text-[20px] font-semibold text-ink mt-10 mb-3">
          14. Contacto
        </h2>
        <p className="text-[14px] text-ink2 leading-relaxed mb-3">
          Para consultas sobre estos Términos, puede escribir a:{" "}
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
