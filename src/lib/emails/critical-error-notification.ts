import { EmailContainer, EmailHeader, EmailTitle, EmailParagraph, EmailTable } from './components';
import { EMAIL_SPACING, EMAIL_COLORS, EMAIL_TYPOGRAPHY } from './styles';

export function CriticalErrorNotificationEmail({
    errorMessage,
    errorStack,
    errorName,
    severity,
    context,
    metadata,
    timestamp,
}: {
    errorMessage: string;
    errorStack?: string;
    errorName: string;
    severity: 'critical' | 'error' | 'warning';
    context: Record<string, any>;
    metadata: Record<string, any>;
    timestamp: string;
}) {
    const severityColors = {
        critical: '#dc2626',
        error: '#ea580c',
        warning: '#d97706'
    };

    const severityColor = severityColors[severity] || severityColors.error;
    const severityLabel = severity === 'critical' ? 'Critique' : severity === 'error' ? 'Erreur' : 'Avertissement';

    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'pastry',
    });

    const title = EmailTitle(`Erreur ${severityLabel} Détectée`, severityColor);

    const severityInfo = EmailTable([
        { label: 'Date', value: new Date(timestamp).toLocaleString('fr-FR') },
        { label: 'Niveau', value: `<span style="text-transform: uppercase; font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.bold};">${severity}</span>` },
        { label: 'Type', value: errorName },
        { label: 'Message', value: errorMessage },
    ]);

    const errorDetails = `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; background-color: ${EMAIL_COLORS.neutral[50]}; border-left: 3px solid ${severityColor};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.md} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Détails de l'erreur</h3>
            ${errorStack ? `
            <details style="margin-top: ${EMAIL_SPACING.md};">
                <summary style="cursor: pointer; font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium}; color: ${EMAIL_COLORS.neutral[600]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.sm};">Stack Trace (cliquer pour voir)</summary>
                <pre style="margin-top: ${EMAIL_SPACING.sm}; padding: ${EMAIL_SPACING.md}; border-radius: ${EMAIL_SPACING.sm}; background-color: white; border: 1px solid ${EMAIL_COLORS.neutral[200]}; overflow-x: auto; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xs}; white-space: pre-wrap; word-break: break-all; color: ${EMAIL_COLORS.neutral[700]};">${errorStack}</pre>
            </details>
            ` : ''}
        </div>
    `;

    const contextSection = Object.keys(context).length > 0 ? `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; background-color: ${EMAIL_COLORS.neutral[50]}; border-left: 3px solid ${EMAIL_COLORS.accent.primary};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.md} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Contexte</h3>
            <pre style="margin: 0; padding: ${EMAIL_SPACING.md}; border-radius: ${EMAIL_SPACING.sm}; background-color: white; border: 1px solid ${EMAIL_COLORS.neutral[200]}; overflow-x: auto; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xs}; white-space: pre-wrap; word-break: break-all; color: ${EMAIL_COLORS.neutral[700]};">${JSON.stringify(context, null, 2)}</pre>
        </div>
    ` : '';

    const metadataSection = Object.keys(metadata).length > 0 ? `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; background-color: ${EMAIL_COLORS.neutral[50]}; border-left: 3px solid ${EMAIL_COLORS.accent.primary};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.md} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Métadonnées</h3>
            <pre style="margin: 0; padding: ${EMAIL_SPACING.md}; border-radius: ${EMAIL_SPACING.sm}; background-color: white; border: 1px solid ${EMAIL_COLORS.neutral[200]}; overflow-x: auto; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xs}; white-space: pre-wrap; word-break: break-all; color: ${EMAIL_COLORS.neutral[700]};">${JSON.stringify(metadata, null, 2)}</pre>
        </div>
    ` : '';

    const footer = `
        <div style="margin-top: ${EMAIL_SPACING['2xl']}; padding-top: ${EMAIL_SPACING.lg}; border-top: 1px solid ${EMAIL_COLORS.neutral[200]};">
            <p style="color: ${EMAIL_COLORS.neutral[500]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xs};">
                Cette notification a été envoyée automatiquement par le système de logging d'erreurs de Pattyly.
            </p>
        </div>
    `;

    return EmailContainer(
        `
            ${header}
            ${title}
            ${severityInfo}
            ${errorDetails}
            ${contextSection}
            ${metadataSection}
            ${footer}
        `
    );
}

