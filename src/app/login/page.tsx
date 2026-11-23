import Link from "next/link";
import { signIn } from "@/app/auth/actions";

export default function LoginPage() {
  return <main className="auth-page"><Link href="/">← Back to home</Link><section className="auth-card"><p className="eyebrow">Welcome back</p><h1>Sign in</h1><form action={signIn}><label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Password<input name="password" type="password" required autoComplete="current-password" /></label><button className="button button-primary">Sign in</button></form><p><Link href="/forgot-password">Forgot password?</Link></p><p>New here? <Link href="/signup">Create an account</Link></p></section></main>;
}
