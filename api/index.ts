// Archivo base para endpoint en Vercel
export default function handler(req, res) {
  res.status(200).json({ message: "¡Funciona en Vercel!" });
}
