import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <p className="font-serif text-5xl font-semibold text-gold">404</p>
      <h1 className="font-serif text-2xl font-semibold">Esta página se perdeu no deserto</h1>
      <p className="text-muted">Mas, como a ovelha perdida, você pode voltar ao rebanho.</p>
      <Link href="/" className="inline-block font-semibold text-primary">
        Voltar ao início
      </Link>
    </div>
  );
}
