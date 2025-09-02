<script lang="ts">
	import { page } from '$app/stores';

	// SEO
	$: page.meta = {
		title: 'Politique de Confidentialité - Pattyly',
		description:
			'Politique de confidentialité et protection des données personnelles de la plateforme Pattyly - Conformité RGPD.',
		keywords:
			'confidentialité, RGPD, données personnelles, protection, vie privée',
	};
</script>

<svelte:head>
	<title>Politique de Confidentialité - Pattyly</title>
	<meta
		name="description"
		content="Politique de confidentialité et protection des données personnelles de la plateforme Pattyly - Conformité RGPD."
	/>
</svelte:head>

<div class="min-h-screen bg-white">
	<div class="container mx-auto max-w-4xl px-4 pb-12 pt-24">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold text-gray-900">
				Politique de Confidentialité
			</h1>
			<p class="text-lg text-gray-600">
				Protection des données personnelles - Dernière mise à jour : {new Date().toLocaleDateString(
					'fr-FR',
				)}
			</p>
		</div>

		<!-- Contenu -->
		<div class="space-y-8">
			<!-- Introduction -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					1. Introduction
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Pattyly s'engage à protéger votre vie privée et vos données
						personnelles. Cette politique de confidentialité explique comment
						nous collectons, utilisons et protégeons vos informations
						personnelles conformément au Règlement Général sur la Protection des
						Données (RGPD).
					</p>
					<p>
						En utilisant notre plateforme, vous acceptez les pratiques décrites
						dans cette politique de confidentialité.
					</p>
				</div>
			</section>

			<!-- Responsable du traitement -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					2. Responsable du traitement
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						<strong>Responsable :</strong> Boubacar Maiga - Micro-entreprise
					</p>
					<p>
						<strong>Adresse :</strong> 45 Résidence du Parc Le Nôtre, 95310 Saint-Ouen-l'Aumône,
						France
					</p>
					<p>
						<strong>Email :</strong>
						<a
							href="mailto:privacy@pattyly.com"
							class="text-blue-600 hover:text-blue-800">privacy@pattyly.com</a
						>
					</p>
					<p>
						<strong>Téléphone :</strong> 07 67 76 21 72
					</p>
				</div>
			</section>

			<!-- Données collectées -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					3. Données personnelles collectées
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						3.1 Données des Pâtissiers
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>
							<strong>Données d'identification :</strong> Nom, prénom, adresse email
						</li>
						<li>
							<strong>Données de contact :</strong> Numéro de téléphone, adresse
							postale
						</li>
						<li>
							<strong>Données de boutique :</strong> Nom de la boutique, description,
							logo
						</li>
						<li>
							<strong>Données de paiement :</strong> Informations Stripe Connect
							(gérées par Stripe)
						</li>
						<li>
							<strong>Données d'utilisation :</strong> Historique des connexions,
							actions sur la plateforme
						</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						3.2 Données des Clients
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li><strong>Données d'identification :</strong> Nom, prénom</li>
						<li>
							<strong>Données de contact :</strong> Adresse email, numéro de téléphone
						</li>
						<li>
							<strong>Données de commande :</strong> Produits commandés, personnalisations,
							messages
						</li>
						<li>
							<strong>Données de livraison :</strong> Date de récupération, préférences
						</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						3.3 Données techniques
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>
							<strong>Données de connexion :</strong> Adresse IP, logs de connexion
						</li>
						<li>
							<strong>Données de navigation :</strong> Pages visitées, durée de session
						</li>
						<li>
							<strong>Données d'appareil :</strong> Empreinte digitale (FingerprintJS),
							type de navigateur
						</li>
						<li>
							<strong>Cookies :</strong> Cookies de session, préférences utilisateur
						</li>
					</ul>
				</div>
			</section>

			<!-- Finalités du traitement -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					4. Finalités et bases légales du traitement
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						4.1 Exécution du contrat (Article 6.1.b RGPD)
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>Fourniture des services de la plateforme</li>
						<li>Gestion des comptes utilisateurs</li>
						<li>Traitement des commandes et paiements</li>
						<li>Communication entre pâtissiers et clients</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						4.2 Intérêt légitime (Article 6.1.f RGPD)
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>Prévention de la fraude et sécurité de la plateforme</li>
						<li>
							Amélioration des services et développement de nouvelles
							fonctionnalités
						</li>
						<li>Analyses statistiques anonymisées</li>
						<li>Maintenance et support technique</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						4.3 Consentement (Article 6.1.a RGPD)
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>Cookies non essentiels</li>
						<li>Communications marketing (si applicable)</li>
						<li>Traitement de données sensibles (si applicable)</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						4.4 Obligation légale (Article 6.1.c RGPD)
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>Conservation des données de facturation (10 ans)</li>
						<li>Respect des obligations comptables et fiscales</li>
						<li>Coopération avec les autorités compétentes</li>
					</ul>
				</div>
			</section>

			<!-- Durée de conservation -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					5. Durée de conservation des données
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						5.1 Données des comptes actifs
					</h3>
					<p>
						Conservées pendant toute la durée de l'abonnement + 3 ans après la
						dernière activité.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						5.2 Données de facturation
					</h3>
					<p>
						Conservées 10 ans conformément aux obligations comptables
						françaises.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						5.3 Données de commandes
					</h3>
					<p>
						Conservées 3 ans après la dernière commande pour les besoins de
						service client.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						5.4 Données techniques
					</h3>
					<p>Logs de connexion conservés 12 mois maximum.</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						5.5 Données supprimées
					</h3>
					<p>
						Après les délais de conservation, les données sont supprimées de
						manière définitive ou anonymisées pour les besoins statistiques.
					</p>
				</div>
			</section>

			<!-- Destinataires -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					6. Destinataires des données
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						6.1 Accès interne
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>Équipe technique Pattyly (accès limité et sécurisé)</li>
						<li>Service client (données nécessaires au support)</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						6.2 Sous-traitants
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>
							<strong>Supabase :</strong> Hébergement base de données et stockage
						</li>
						<li><strong>Stripe :</strong> Traitement des paiements</li>
						<li><strong>Resend :</strong> Envoi d'emails transactionnels</li>
						<li><strong>Cloudflare :</strong> CDN et sécurité</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						6.3 Partages entre utilisateurs
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>
							Les pâtissiers accèdent aux données de leurs clients (commandes,
							contact)
						</li>
						<li>
							Les clients voient les informations publiques des pâtissiers
							(boutique, produits)
						</li>
					</ul>
				</div>
			</section>

			<!-- Transferts internationaux -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					7. Transferts internationaux
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Certains de nos sous-traitants sont situés en dehors de l'Union
						Européenne :
					</p>
					<ul class="list-inside list-disc space-y-2">
						<li>
							<strong>Stripe (États-Unis) :</strong> Décision d'adéquation + Clauses
							contractuelles types
						</li>
						<li>
							<strong>Cloudflare (États-Unis) :</strong> Décision d'adéquation +
							Clauses contractuelles types
						</li>
						<li>
							<strong>Resend (États-Unis) :</strong> Décision d'adéquation + Clauses
							contractuelles types
						</li>
					</ul>
					<p>
						Tous les transferts sont encadrés par des garanties appropriées
						conformément au RGPD.
					</p>
				</div>
			</section>

			<!-- Droits des utilisateurs -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">8. Vos droits</h2>
				<div class="prose prose-gray max-w-none">
					<p>Conformément au RGPD, vous disposez des droits suivants :</p>

					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						8.1 Droit d'accès (Article 15 RGPD)
					</h3>
					<p>
						Obtenir une copie de vos données personnelles et des informations
						sur leur traitement.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						8.2 Droit de rectification (Article 16 RGPD)
					</h3>
					<p>
						Corriger ou compléter vos données personnelles inexactes ou
						incomplètes.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						8.3 Droit à l'effacement (Article 17 RGPD)
					</h3>
					<p>
						Demander la suppression de vos données dans certaines circonstances.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						8.4 Droit à la limitation (Article 18 RGPD)
					</h3>
					<p>
						Limiter le traitement de vos données dans certaines circonstances.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						8.5 Droit à la portabilité (Article 20 RGPD)
					</h3>
					<p>Récupérer vos données dans un format structuré et lisible.</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						8.6 Droit d'opposition (Article 21 RGPD)
					</h3>
					<p>
						Vous opposer au traitement de vos données pour des raisons tenant à
						votre situation particulière.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						8.7 Exercice des droits
					</h3>
					<p>
						Pour exercer vos droits, contactez-nous à :
						<a
							href="mailto:privacy@pattyly.com"
							class="text-blue-600 hover:text-blue-800">privacy@pattyly.com</a
						>
					</p>
					<p>
						Nous vous répondrons dans un délai d'un mois. En cas de refus, vous
						pouvez saisir la CNIL.
					</p>
				</div>
			</section>

			<!-- Cookies -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					9. Cookies et technologies similaires
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						9.1 Cookies utilisés
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>
							<strong>Cookies de session :</strong> Authentification et navigation
							(nécessaires)
						</li>
						<li>
							<strong>FingerprintJS :</strong> Prévention de la fraude (intérêt légitime)
						</li>
						<li>
							<strong>Préférences :</strong> Paramètres utilisateur (consentement)
						</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						9.2 Gestion des cookies
					</h3>
					<p>
						Vous pouvez gérer vos préférences de cookies via les paramètres de
						votre navigateur ou notre bannière de cookies.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						9.3 Cookies tiers
					</h3>
					<p>
						Stripe peut déposer des cookies pour le traitement des paiements.
						Consultez leur politique de confidentialité pour plus
						d'informations.
					</p>
				</div>
			</section>

			<!-- Sécurité -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					10. Sécurité des données
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Nous mettons en œuvre des mesures techniques et organisationnelles
						appropriées :
					</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Chiffrement SSL/TLS pour les transmissions</li>
						<li>Authentification forte et gestion des accès</li>
						<li>Surveillance et détection d'intrusions</li>
						<li>Sauvegardes régulières et sécurisées</li>
						<li>Formation du personnel à la protection des données</li>
						<li>Audits de sécurité réguliers</li>
					</ul>
				</div>
			</section>

			<!-- Violations de données -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					11. Violations de données
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						En cas de violation de données personnelles susceptible d'engendrer
						un risque élevé pour vos droits et libertés, nous vous en
						informerons dans les meilleurs délais et, si nécessaire, nous
						notifierons la violation à la CNIL dans les 72 heures.
					</p>
				</div>
			</section>

			<!-- Modifications -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					12. Modifications de cette politique
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Cette politique de confidentialité peut être modifiée pour refléter
						les changements dans nos pratiques ou pour d'autres raisons
						opérationnelles, légales ou réglementaires.
					</p>
					<p>
						Les modifications importantes seront notifiées par email ou via un
						avis sur la plateforme.
					</p>
				</div>
			</section>

			<!-- Contact -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					13. Contact et réclamations
				</h2>
				<div class="prose prose-gray max-w-none">
					<p><strong>Délégué à la Protection des Données :</strong></p>
					<p>
						Email : <a
							href="mailto:privacy@pattyly.com"
							class="text-blue-600 hover:text-blue-800">privacy@pattyly.com</a
						>
					</p>

					<p class="mt-6"><strong>Autorité de contrôle :</strong></p>
					<p>
						Commission Nationale de l'Informatique et des Libertés (CNIL)<br />
						3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07<br />
						Téléphone : 01 53 73 22 22<br />
						Site web :
						<a
							href="https://www.cnil.fr"
							target="_blank"
							class="text-blue-600 hover:text-blue-800">www.cnil.fr</a
						>
					</p>
				</div>
			</section>
		</div>
	</div>
</div>
