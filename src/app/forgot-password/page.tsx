import Link from "next/link";
import { sendPasswordReset } from "@/app/auth/actions";

export default function ForgotPasswordPage() {
  return <main className="auth-page"><Link href="/login">← Back to sign in</Link><section className="auth-card"><p className="eyebrow">Account help</p><h1>Reset your password</h1><p>Enter your email and we’ll send instructions to reset your password.</p><form action={sendPasswordReset}><label>Email<input name="email" type="email" required autoComplete="email" /></label><button className="button button-primary">Send reset link</button></form></section></main>;
}
