/**
 * Same shape as billing/gateways/payment-gateway.interface.ts: one interface, swappable
 * implementations, nothing else in the codebase needs to know which vendor is behind it.
 * See ARCHITECTURE.md §4, §6, §12.
 */

export interface CreateRoomParams {
  bookingId: string;
}

export interface CreateRoomResult {
  /** Opaque identifier stored on Session.roomRef — vendor's room name/id, not a URL. */
  roomRef: string;
}

export interface CreateJoinTokenParams {
  roomRef: string;
  /** pseudonym_id — never a real name. Shown to the *other* participant as their identity. */
  userId: string;
}

export interface CreateJoinTokenResult {
  token: string;
  /** The URL the client actually opens/embeds to join the call. */
  url: string;
  expiresAt: Date;
}

export interface VideoGateway {
  /** Called once per session, at session start. */
  createRoom(params: CreateRoomParams): Promise<CreateRoomResult>;

  /** Called per participant, right before they join — keeps token exposure short-lived. */
  createJoinToken(params: CreateJoinTokenParams): Promise<CreateJoinTokenResult>;
}

export const VIDEO_GATEWAY = Symbol('VIDEO_GATEWAY');
