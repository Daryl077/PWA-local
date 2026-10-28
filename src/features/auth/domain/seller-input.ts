import { z } from 'zod'

/** Datos que el Dueño escribe para crear un vendedor (RF-SEG-03). */
export const sellerInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(60, 'El nombre no puede superar los 60 caracteres.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(128, 'La contraseña no puede superar los 128 caracteres.'),
})

export type SellerInput = z.infer<typeof sellerInputSchema>
