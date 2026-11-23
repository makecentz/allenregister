import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";

export default function UpdatePasswordPage() {
  return <main className="auth-page"><Link href="/">← Back to home</Link><section className="auth-card"><p className="eyebrow">Secure your account</p><h1>Choose a new password</h1><form action={updatePassword}><label>New password<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><button className="button button-primary">Save password</button></form></section></main>;
}
