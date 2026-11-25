export function isMembershipActive(status: string, expiresAt: string) {
  return (
    status === "active" && new Date(expiresAt).getTime() > new Date().getTime()
  );
}
