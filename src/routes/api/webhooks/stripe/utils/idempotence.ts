// utils/idempotence.ts
export async function checkIdempotence(eventId: string, locals: any): Promise<void> {
    console.log('🔍 Checking idempotence for event:', eventId);

    // Vérifier si l'événement a déjà été traité
    const { data: existing } = await locals.supabaseServiceRole
        .from('stripe_events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();

    if (existing) {
        console.log('⏩ Event déjà traité:', eventId);
        throw new Error('Event already processed');
    }

    // Enregistrer l'événement pour éviter les doublons
    const { error: insertError } = await locals.supabaseServiceRole
        .from('stripe_events')
        .insert({ id: eventId });

    if (insertError) {
        console.error('❌ Erreur enregistrement event.id:', insertError);
        throw new Error('Idempotence error');
    }

    console.log('✅ Event registered for idempotence');
}