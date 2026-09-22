export const getAvatarColor = (name?: string | null) => {
  const safeName = name && name.trim().length > 0 ? name : "?";
  let hash = 0;

  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
};