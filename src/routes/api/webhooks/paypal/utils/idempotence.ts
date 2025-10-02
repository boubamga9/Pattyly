// utils/idempotence.ts

/**
 * Idempotence check for PayPal webhooks
 * Ensures each event is processed exactly once
 * 
 * @param eventId - PayPal webhook event ID
 * @param eventType - PayPal event type (for logging)
 * @param locals - SvelteKit locals with supabaseServiceRole
 * @returns Response | null - Response if duplicate/error, null if event should be processed
 */
export async function checkPayPalIdempotence(
    eventId: string,
    eventType: string,
    locals: any
): Promise<Response | null> {
    if (!eventId || !eventType) {
        console.error('❌ Missing eventId or eventType in idempotence check');
        return new Response('Invalid event structure', { status: 400 });
    }

    // Vérifie si l'event existe déjà
    const { data: existingEvent, error: selectError } = await locals.supabaseServiceRole
        .from('paypal_events')
        .select('event_id, processed_at')
        .eq('event_id', eventId)
        .single();

    if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Database error checking idempotence:', selectError);
        return new Response('Database error', { status: 500 });
    }

    if (existingEvent) {
        console.log(`⚠️ PayPal event ${eventId} (${eventType}) already processed at ${existingEvent.processed_at}, skipping`);
        return new Response(null, { status: 204 });
    }

    // Enregistre l'event
    const { error: insertError } = await locals.supabaseServiceRole
        .from('paypal_events')
        .insert({
            event_id: eventId,
            event_type: eventType
        });

    if (insertError) {
        if (insertError.code === '23505') {
            console.log(`⚠️ Event ${eventId} is being processed by another request, skipping`);
            return new Response('Event already being processed', { status: 200 });
        }
        console.error('❌ Failed to store PayPal event ID:', insertError);
        return new Response('Failed to store event', { status: 500 });
    }

    return null; // => on peut continuer le traitement normal
}
