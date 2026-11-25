type TransactionalEmail = {
  to?: string | null;
  subject: string;
  html: string;
  text: string;
};

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

/**
 * Sends an email only when Resend is configured. A delivery problem must never
 * undo a completed purchase or a saved registration.
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
}: TransactionalEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return { delivered: false, reason: "not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.RESEND_FROM ??
          "Allens Lane Art Center <tara@allenslane.org>",
        to: [to],
        subject,
        html,
        text,
      }),
    });
    return { delivered: response.ok, reason: response.ok ? undefined : "rejected" };
  } catch {
    return { delivered: false, reason: "unavailable" };
  }
}
