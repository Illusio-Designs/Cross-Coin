export default function appVersion(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  return res.status(200).json({ version: process.env.NEXT_PUBLIC_OBZUS_RELEASE || null });
}
