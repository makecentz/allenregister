import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export default function SignUpPage() {
  return <main className="auth-page"><Link href="/">← Back to home</Link><section className="auth-card"><p className="eyebrow">Create your account</p><h1>Join Allens Lane</h1><form action={signUp}><label>Name<input name="fullName" required autoComplete="name" /></label><label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Password<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><button className="button button-primary">Create account</button></form><p>Already have an account? <Link href="/login">Sign in</Link></p></section></main>;
}
