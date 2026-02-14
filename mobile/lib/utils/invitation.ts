type ExpiryBadge = {
  label: string;
  variant: 'destructive' | 'default' | 'success';
};

export function getExpiryBadge(expiresAt: string): ExpiryBadge {
  const diff = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 1) return { label: 'Expires today', variant: 'destructive' };
  if (days <= 3) return { label: `${days}d left`, variant: 'default' };
  return { label: `${days}d left`, variant: 'success' };
}
