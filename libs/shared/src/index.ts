/**
 * Shared DTOs/types between apps/api and apps/worker (see ARCHITECTURE.md §7).
 *
 * Currently empty on purpose: the two processes only talk to each other over the
 * internal HTTP endpoint in modules/billing and the BullMQ 'notifications' queue, both
 * of which use small literal payload shapes duplicated at each end (see the "must match"
 * comments in queue.notifier.ts / notifications.processor.ts). Move a type here once it's
 * shared by more than two call sites, or once it needs to be the single source of truth
 * for a wire format both processes depend on.
 */
export {};
