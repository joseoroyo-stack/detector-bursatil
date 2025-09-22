export const metadata = {
  title: "Aviso Legal - TradePulse",
};

export default function Aviso() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Aviso Legal</h1>
      <p>
        Este sitio web pertenece a <b>TradePulse</b>. El acceso y uso de esta
        plataforma implica la aceptación de este aviso legal.
      </p>

      <h2 className="text-xl font-semibold">1. Propiedad intelectual</h2>
      <p>
        Todo el contenido de esta web (código, textos, imágenes, logotipo) está
        protegido por derechos de autor. No se permite su copia sin permiso.
      </p>

      <h2 className="text-xl font-semibold">2. Condiciones de uso</h2>
      <p>
        El usuario se compromete a hacer un uso adecuado y lícito de la
        plataforma.
      </p>

      <h2 className="text-xl font-semibold">3. Exclusión de garantías</h2>
      <p>
        TradePulse no se responsabiliza de daños derivados del mal uso de la
        información o interrupciones del servicio.
      </p>

      <h2 className="text-xl font-semibold">4. Contacto</h2>
      <p>
        Para cualquier consulta, contáctanos en{" "}
        <a href="mailto:soporte@tradepulse.com" className="underline">
          soporte@tradepulse.com
        </a>.
      </p>
    </main>
  );
}
