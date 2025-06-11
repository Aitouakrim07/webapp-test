import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🧪 Test route called!')
  res.status(200).json({ message: 'Test route works!' })
}
