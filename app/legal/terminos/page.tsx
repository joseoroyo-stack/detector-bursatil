export const metadata = {
  title: "Términos y Condiciones - TradePulse",
};

export default function Terminos() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Términos y Condiciones</h1>
      <p>
        Estos Términos regulan el uso de <b>TradePulse</b>. Al usar la
        plataforma aceptas estas condiciones.
      </p>

      <h2 className="text-xl font-semibold">1. Servicio</h2>
      <p>
        TradePulse es una herramienta educativa de análisis de mercados. No
        constituye asesoramiento financiero ni recomendación de inversión.
      </p>

      <h2 className="text-xl font-semibold">2. Registro</h2>
      <p>
        Debes proporcionar datos veraces en tu cuenta. Eres responsable de
        mantener la confidencialidad de tu acceso.
      </p>

      <h2 className="text-xl font-semibold">3. Suscripciones</h2>
      <p>
        • Plan Gratis con funciones básicas.<br />
        • Plan Premium con funciones avanzadas.<br />
        • La facturación se gestiona mediante <b>Stripe</b>. Puedes cancelar en
        cualquier momento.
      </p>

      <h2 className="text-xl font-semibold">4. Limitación de responsabilidad</h2>
      <p>
        El uso de la plataforma es bajo tu propia responsabilidad. TradePulse no
        garantiza resultados ni asume pérdidas derivadas de decisiones de
        inversión.
      </p>

      <h2 className="text-xl font-semibold">5. Modificaciones</h2>
      <p>
        Nos reservamos el derecho a modificar estos términos. Publicaremos los
        cambios en esta página.
      </p>
    </main>
  );
}
