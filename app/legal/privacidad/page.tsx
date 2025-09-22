export const metadata = {
  title: "Política de Privacidad - TradePulse",
};

export default function Privacidad() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Política de Privacidad</h1>
      <p>
        En <b>TradePulse</b> valoramos tu privacidad. Esta política explica
        cómo recopilamos, usamos y protegemos tu información personal.
      </p>

      <h2 className="text-xl font-semibold">1. Datos que recopilamos</h2>
      <p>
        • Datos de registro (correo, contraseña).<br />
        • Datos de uso de la aplicación (ej. tickers guardados, alertas).<br />
        • Información técnica básica (IP, navegador).
      </p>

      <h2 className="text-xl font-semibold">2. Uso de la información</h2>
      <p>
        Usamos los datos para ofrecer el servicio, mejorar la plataforma y, en
        caso de suscripción, procesar pagos a través de proveedores seguros
        como <b>Stripe</b>.
      </p>

      <h2 className="text-xl font-semibold">3. Compartición de datos</h2>
      <p>
        No vendemos tus datos. Solo compartimos con terceros necesarios para
        operar (p.ej. proveedores de pago o analítica).
      </p>

      <h2 className="text-xl font-semibold">4. Seguridad</h2>
      <p>
        Implementamos medidas razonables para proteger tu información.
      </p>

      <h2 className="text-xl font-semibold">5. Derechos del usuario</h2>
      <p>
        Puedes solicitar acceso, corrección o eliminación de tus datos en
        cualquier momento escribiéndonos a{" "}
        <a href="mailto:soporte@tradepulse.com" className="underline">
          soporte@tradepulse.com
        </a>.
      </p>
    </main>
  );
}
