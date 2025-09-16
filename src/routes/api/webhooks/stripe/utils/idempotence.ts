// utils/idempotence.ts
export async function checkIdempotence(eventId: string, locals: any): Promise<void> {
    const { data: existing, error: selectError } = await locals.supabaseServiceRole
        .from('stripe_events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();

    if (selectError) {
        console.error('Error checking idempotence', selectError);
        throw new Error('Idempotence check failed');
    }

    if (existing) {
        return;
    }

    const { error: insertError } = await locals.supabaseServiceRole
        .from('stripe_events')
        .insert({ id: eventId });

    if (insertError) {
        // Here we ignore the error if the event is already processed
        if (insertError.code === '23505') {
            return;
        }
        //console.error('Error inserting idempotence', insertError);
        throw new Error('Idempotence insert failed');
    }
}
