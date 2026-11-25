import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export const instant = false;

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return <main className="auth-page"><Link href="/">← Back to home</Link><section className="auth-card"><p className="eyebrow">Create your account</p><h1>Join Allens Lane</h1><p>Create an account to register, purchase, and keep your experiences together.</p>{error ? <p className="form-error" role="alert">{error}</p> : null}<form action={signUp}><input type="hidden" name="next" value={destination} /><label>Name<input name="fullName" required autoComplete="name" /></label><label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Password<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><label className="check-label"><input name="legalAccepted" type="checkbox" value="yes" required />I agree to the <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link>.</label><button className="button button-primary">Create account</button></form><p>Already have an account? <Link href={`/login?next=${encodeURIComponent(destination)}`}>Sign in</Link></p></section></main>;
}
