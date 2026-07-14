export const getHealth = (_req: unknown, res: { json: (body: unknown) => void }) => {
  res.json({ status: 'ok' });
};
