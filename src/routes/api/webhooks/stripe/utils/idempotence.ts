// utils/idempotence.ts
export async function checkIdempotence(eventId: string, locals: any): Promise<void> {

    // Vérifier si l'événement a déjà été traité
    const { data: existing } = await locals.supabaseServiceRole
        .from('stripe_events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();

    if (existing) {
        throw new Error('Event already processed');
    }

    // Enregistrer l'événement pour éviter les doublons
    const { error: insertError } = await locals.supabaseServiceRole
        .from('stripe_events')
        .insert({ id: eventId });

    if (insertError) {
        throw new Error('Idempotence error');
    }

}