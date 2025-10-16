/**
 * Utilitaires pour formater les données dans les emails
 */

/**
 * Formate une date au format français comme dans l'interface utilisateur
 */
export function formatDateForEmail(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Formate une heure au format HH:MM
 */
export function formatTimeForEmail(timeString: string | null): string {
    if (!timeString) return '';
    return timeString.substring(0, 5);
}

/**
 * Formate une date et heure complète pour les emails
 */
export function formatDateTimeForEmail(dateString: string, timeString?: string | null): string {
    const date = formatDateForEmail(dateString);
    const time = timeString ? formatTimeForEmail(timeString) : '';
    return time ? `${date} ${time}` : date;
}

/**
 * Génère un lien Instagram cliquable
 */
export function formatInstagramForEmail(instagram: string | null | undefined): string {
    if (!instagram) return '';

    const cleanInstagram = instagram.replace('@', '');
    return `<a href="https://instagram.com/${cleanInstagram}" style="color: #f97316;">${instagram}</a>`;
}

/**
 * Génère une ligne de contact Instagram conditionnelle pour les emails
 */
export function generateInstagramEmailRow(instagram: string | null | undefined): string {
    if (!instagram) return '';

    return `
        <tr>
            <td style="padding: 8px 0; font-weight: 600;">Instagram :</td>
            <td style="padding: 8px 0;">${formatInstagramForEmail(instagram)}</td>
        </tr>
    `;
}
