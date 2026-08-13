import { Matches } from 'class-validator';

export class PayForBookingDto {
  /** E.164-ish — Safaricom's Daraja API expects digits, typically 2547XXXXXXXX. */
  @Matches(/^\+?\d{9,15}$/, { message: 'phone must be a valid phone number' })
  phone: string;
}
