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
        critical: '#dc2626', // red-600
        error: '#ea580c', // orange-600
        warning: '#d97706' // amber-600
    };

    const severityColor = severityColors[severity] || severityColors.error;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erreur ${severity === 'critical' ? 'Critique' : severity === 'error' ? 'Erreur' : 'Avertissement'} - Pattyly</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #fee; border-left: 4px solid ${severityColor}; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
        <h1 style="color: ${severityColor}; margin-top: 0;">🚨 Erreur ${severity === 'critical' ? 'Critique' : severity === 'error' ? 'Erreur' : 'Avertissement'} Détectée</h1>
        <p style="margin: 0;"><strong>Date:</strong> ${new Date(timestamp).toLocaleString('fr-FR')}</p>
        <p style="margin: 5px 0 0 0;"><strong>Niveau:</strong> <span style="text-transform: uppercase; font-weight: bold;">${severity}</span></p>
    </div>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #333;">Détails de l'erreur</h2>
        <p><strong>Type:</strong> ${errorName}</p>
        <p><strong>Message:</strong> ${errorMessage}</p>
        ${errorStack ? `
        <details style="margin-top: 15px;">
            <summary style="cursor: pointer; font-weight: bold; color: #666;">Stack Trace (cliquer pour voir)</summary>
            <pre style="background-color: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin-top: 10px; white-space: pre-wrap; word-break: break-all;">${errorStack}</pre>
        </details>
        ` : ''}
    </div>
    
    ${Object.keys(context).length > 0 ? `
    <div style="background-color: #f0f8ff; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #333;">Contexte</h2>
        <pre style="background-color: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(context, null, 2)}</pre>
    </div>
    ` : ''}
    
    ${Object.keys(metadata).length > 0 ? `
    <div style="background-color: #fffbf0; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #333;">Métadonnées</h2>
        <pre style="background-color: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(metadata, null, 2)}</pre>
    </div>
    ` : ''}
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
        <p>Cette notification a été envoyée automatiquement par le système de logging d'erreurs de Pattyly.</p>
    </div>
</body>
</html>
    `;
}

