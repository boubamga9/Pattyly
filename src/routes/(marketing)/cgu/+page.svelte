<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	// SEO
	$: page.meta = {
		title: "Conditions Générales d'Utilisation - Pattyly",
		description:
			"Conditions générales d'utilisation de la plateforme Pattyly pour les pâtissiers indépendants et leurs clients.",
		keywords:
			'CGU, conditions générales, utilisation, pâtissier, plateforme, e-commerce',
	};

	onMount(() => {
		// Scroll vers l'ancre si présente dans l'URL
		const hash = window.location.hash;
		if (hash) {
			setTimeout(() => {
				const element = document.querySelector(hash);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth' });
				}
			}, 100);
		}
	});
</script>

<svelte:head>
	<title>Conditions Générales d'Utilisation - Pattyly</title>
	<meta
		name="description"
		content="Conditions générales d'utilisation de la plateforme Pattyly pour les pâtissiers indépendants et leurs clients."
	/>
</svelte:head>

<div class="min-h-screen bg-white">
	<div class="container mx-auto max-w-4xl px-4 pb-12 pt-24">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold text-gray-900">
				Conditions Générales d'Utilisation
			</h1>
			<p class="text-lg text-gray-600">
				Plateforme Pattyly - Dernière mise à jour : {new Date().toLocaleDateString(
					'fr-FR',
				)}
			</p>
		</div>

		<!-- Table des matières -->
		<div class="mb-8 border-b border-gray-200 pb-8">
			<h2 class="mb-4 text-2xl font-semibold text-gray-900">
				Table des matières
			</h2>
			<nav class="space-y-2">
				<a
					href="#1"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>1. Objet et champ d'application</a
				>
				<a
					href="#2"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>2. Définitions</a
				>
				<a
					href="#3"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>3. Acceptation des conditions</a
				>
				<a
					href="#4"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>4. Description du service</a
				>
				<a
					href="#5"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>5. Inscription et compte utilisateur</a
				>
				<a
					href="#6"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>6. Tarification et facturation</a
				>
				<a
					href="#7"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>7. Commandes et paiements</a
				>
				<a
					href="#8"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>8. Responsabilités</a
				>
				<a
					href="#9"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>9. Propriété intellectuelle</a
				>
				<a
					href="#10"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>10. Protection des données personnelles</a
				>
				<a
					href="#11"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>11. Suspension et résiliation</a
				>
				<a
					href="#12"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>12. Support et assistance</a
				>
				<a
					href="#13"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>13. Disponibilité du service</a
				>
				<a
					href="#14"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>14. Modification des CGU</a
				>
				<a
					href="#15"
					class="block text-blue-600 transition-colors hover:text-blue-800"
					>15. Droit applicable et juridiction</a
				>
			</nav>
		</div>

		<!-- Contenu des CGU -->
		<div class="space-y-8">
			<!-- Article 1 -->
			<section id="1">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					1. Objet et champ d'application
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Les présentes Conditions Générales d'Utilisation (ci-après "CGU")
						régissent l'utilisation de la plateforme Pattyly (ci-après "la
						Plateforme"), accessible à l'adresse <strong>pattyly.com</strong>.
					</p>

					<p>
						Pattyly est une plateforme SaaS destinée aux pâtissiers indépendants
						pour créer et gérer leur boutique en ligne, recevoir des commandes
						et accepter des paiements en ligne.
					</p>

					<p>
						La Plateforme met en relation des pâtissiers professionnels
						(ci-après "Pâtissiers") avec des clients finaux (ci-après "Clients")
						pour la vente de produits de pâtisserie.
					</p>
				</div>
			</section>

			<!-- Article 2 -->
			<section id="2">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					2. Définitions
				</h2>
				<div class="prose prose-gray max-w-none">
					<dl class="space-y-3">
						<dt class="font-semibold text-gray-900">Plateforme :</dt>
						<dd class="ml-4">
							Le service en ligne Pattyly accessible via le site web pattyly.com
						</dd>

						<dt class="font-semibold text-gray-900">Pâtissier :</dt>
						<dd class="ml-4">
							Utilisateur professionnel de la Plateforme proposant des produits
							de pâtisserie
						</dd>

						<dt class="font-semibold text-gray-900">Client :</dt>
						<dd class="ml-4">
							Utilisateur final commandant des produits auprès des Pâtissiers
						</dd>

						<dt class="font-semibold text-gray-900">Boutique :</dt>
						<dd class="ml-4">
							Page publique personnalisée du Pâtissier sur la Plateforme
						</dd>

						<dt class="font-semibold text-gray-900">Commande :</dt>
						<dd class="ml-4">
							Transaction entre un Client et un Pâtissier via la Plateforme
						</dd>

						<dt class="font-semibold text-gray-900">Compte :</dt>
						<dd class="ml-4">
							Espace personnel de l'utilisateur sur la Plateforme
						</dd>
					</dl>
				</div>
			</section>

			<!-- Article 3 -->
			<section id="3">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					3. Acceptation des conditions
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						L'utilisation de la Plateforme implique l'acceptation pleine et
						entière des présentes CGU.
					</p>

					<p>
						Ces conditions s'appliquent à tous les utilisateurs de la
						Plateforme, qu'ils soient Pâtissiers ou Clients.
					</p>

					<p>
						En cas de non-respect de ces conditions, l'accès à la Plateforme
						peut être suspendu ou résilié sans préavis.
					</p>
				</div>
			</section>

			<!-- Article 4 -->
			<section id="4">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					4. Description du service
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						4.1 Services proposés
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>Création et personnalisation d'une boutique en ligne</li>
						<li>Gestion de produits et de commandes</li>
						<li>Système de paiement intégré via Stripe</li>
						<li>Formulaires de personnalisation personnalisables</li>
						<li>Gestion de la disponibilité et des créneaux</li>
						<li>Interface d'administration complète</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						4.2 Fonctionnalités
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>
							<strong>Pour les Pâtissiers :</strong> Dashboard de gestion, création
							de produits, suivi des commandes, paramétrage des formulaires
						</li>
						<li>
							<strong>Pour les Clients :</strong> Navigation dans les boutiques,
							personnalisation de produits, commande et paiement en ligne
						</li>
					</ul>
				</div>
			</section>

			<!-- Article 5 -->
			<section id="5">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					5. Inscription et compte utilisateur
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						5.1 Création de compte
					</h3>
					<p>L'inscription sur la Plateforme est gratuite et nécessite :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Une adresse email valide</li>
						<li>Un mot de passe sécurisé</li>
						<li>L'acceptation des présentes CGU</li>
						<li>La confirmation de l'adresse email</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						5.2 Version gratuite
					</h3>
					<p>
						Une version gratuite est proposée à tous les Pâtissiers, disponible à vie.
						Cette version gratuite permet de créer et gérer une boutique en ligne avec
						des fonctionnalités de base. Les limitations de la version gratuite sont
						détaillées dans les conditions d'utilisation.
					</p>
					<p>
						En cas de tentative de fraude détectée, l'accès à la version gratuite
						peut être refusé ou suspendu.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						5.3 Sécurité du compte
					</h3>
					<p>
						L'utilisateur est responsable de la sécurité de son compte et
						s'engage à :
					</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Maintenir la confidentialité de ses identifiants</li>
						<li>Signaler toute utilisation non autorisée</li>
						<li>Utiliser des mots de passe sécurisés</li>
					</ul>
				</div>
			</section>

			<!-- Article 6 -->
			<section id="6">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					6. Tarification et facturation
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						6.1 Plans d'abonnement
					</h3>
					<ul class="list-inside list-disc space-y-2">
						<li>
							<strong>Plan Basic :</strong> 14,99€/mois - Maximum 10 produits
						</li>
						<li>
							<strong>Plan Premium :</strong> 19,99€/mois - Produits illimités
						</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						6.2 Facturation
					</h3>
					<p>La facturation s'effectue :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Mensuellement en avance</li>
						<li>Via Stripe (carte bancaire, prélèvement SEPA)</li>
						<li>Prix TTC, toutes taxes comprises</li>
						<li>Facture disponible dans l'espace client</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						6.3 Utilisateurs exemptés
					</h3>
					<p>
						Certains utilisateurs peuvent bénéficier d'un accès gratuit
						(administrateurs, partenaires) sur décision de Pattyly.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						6.4 Remboursements
					</h3>
					<p>
						Les remboursements d'abonnement ne sont pas autorisés sauf en cas
						d'erreur technique imputable à Pattyly ou d'obligation légale
						contraire.
					</p>
				</div>
			</section>

			<!-- Article 7 -->
			<section id="7">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					7. Commandes et paiements
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						7.1 Processus de commande
					</h3>
					<p>Les commandes s'effectuent selon le processus suivant :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Sélection du produit et personnalisation</li>
						<li>Saisie des informations de contact</li>
						<li>Choix de la date de récupération</li>
						<li>Paiement via Stripe (3D Secure)</li>
						<li>Confirmation par email</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						7.2 Commandes personnalisées
					</h3>
					<p>Pour les commandes sur mesure :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Le Client soumet sa demande via le formulaire personnalisé</li>
						<li>Le Pâtissier étudie la demande et propose un devis</li>
						<li>Le Client peut accepter ou refuser le devis</li>
						<li>En cas d'acceptation, un acompte de 50% est demandé</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						7.3 Paiements
					</h3>
					<p>
						Les paiements sont traités par Stripe et reversés directement au
						Pâtissier via Stripe Connect.
					</p>
					<p>
						<strong
							>Pattyly décline toute responsabilité concernant les transactions
							Stripe,</strong
						>
						y compris les échecs de paiement, les remboursements, les litiges de
						facturation ou tout problème lié aux services de paiement tiers.
					</p>
					<p>
						Les remboursements sont de la responsabilité exclusive du Pâtissier.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						7.4 Sécurité des paiements
					</h3>
					<p>
						Pattyly utilise Stripe pour assurer la sécurité des transactions
						financières avec chiffrement SSL et conformité PCI DSS. Cependant,
						Pattyly ne peut garantir une sécurité absolue et décline toute
						responsabilité en cas de compromission des données financières.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						7.5 Annulations
					</h3>
					<p>
						Les annulations et remboursements se gèrent directement entre le
						Pâtissier et le Client, hors de la Plateforme.
					</p>
				</div>
			</section>

			<!-- Article 8 -->
			<section id="8">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					8. Responsabilités
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						8.1 Responsabilité de Pattyly
					</h3>
					<p>Pattyly s'engage à :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Fournir un service technique fonctionnel</li>
						<li>Assurer la sécurité des données</li>
						<li>Maintenir la disponibilité de la Plateforme</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						8.2 Limitation de responsabilité
					</h3>
					<p>Pattyly décline toute responsabilité concernant :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>La qualité des produits vendus par les Pâtissiers</li>
						<li>Les litiges entre Pâtissiers et Clients</li>
						<li>Les retards de livraison ou problèmes de récupération</li>
						<li>Les dommages indirects ou perte de profits</li>
						<li>
							La disponibilité continue et l'exactitude des informations
							fournies par les Pâtissiers
						</li>
						<li>Les transactions financières et problèmes de paiement</li>
						<li>
							Les interruptions de service dues à des tiers (Stripe, Supabase,
							etc.)
						</li>
					</ul>

					<p class="mt-4 font-semibold text-gray-900">
						Pattyly ne garantit pas la disponibilité continue de la Plateforme
						(à l'exception des maintenances planifiées) et l'exactitude des
						informations fournies par les Pâtissiers.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						8.3 Force majeure
					</h3>
					<p>
						Pattyly ne peut être tenu responsable en cas de force majeure,
						notamment :
					</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Grèves, conflits sociaux, mouvements sociaux</li>
						<li>Catastrophes naturelles, intempéries exceptionnelles</li>
						<li>Cyberattaques, pannes informatiques majeures</li>
						<li>Décisions gouvernementales, restrictions administratives</li>
						<li>
							Pannes des fournisseurs tiers (Stripe, Supabase, hébergeurs)
						</li>
						<li>Tout événement imprévisible et insurmontable</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						8.4 Responsabilité des Pâtissiers
					</h3>
					<p>Les Pâtissiers sont responsables de :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>La qualité et la conformité de leurs produits</li>
						<li>Le respect des délais de préparation</li>
						<li>La gestion des récupérations</li>
						<li>Le respect de la réglementation alimentaire</li>
						<li>La gestion des remboursements et litiges</li>
					</ul>
				</div>
			</section>

			<!-- Article 9 -->
			<section id="9">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					9. Propriété intellectuelle
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						9.1 Propriété de la Plateforme
					</h3>
					<p>
						Pattyly conserve tous les droits de propriété intellectuelle sur :
					</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Le code source et l'architecture technique</li>
						<li>L'interface utilisateur et le design</li>
						<li>Les marques et logos Pattyly</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						9.2 Contenu des Pâtissiers
					</h3>
					<p>Les Pâtissiers conservent tous les droits sur :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Leurs recettes et créations</li>
						<li>Leurs photos et descriptions de produits</li>
						<li>Leur identité de marque</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						9.3 Utilisation des photos
					</h3>
					<p>
						Pattyly s'autorise à utiliser les photos de gâteaux des Pâtissiers
						sur ses réseaux sociaux et supports de communication, à l'exclusion
						de toute utilisation à but lucratif (vente des photos).
					</p>
				</div>
			</section>

			<!-- Article 10 -->
			<section id="10">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					10. Protection des données personnelles
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						10.1 Données collectées
					</h3>
					<p>Pattyly collecte les données suivantes :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>
							<strong>Pâtissiers :</strong> Email, nom, informations de boutique,
							données Stripe Connect
						</li>
						<li>
							<strong>Clients :</strong> Nom, email, téléphone, messages, préférences
							de commande
						</li>
						<li>
							<strong>Techniques :</strong> ID PayPal (merchant_id), réseaux sociaux
							(Instagram, TikTok) de session
						</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						10.2 Finalités du traitement
					</h3>
					<p>Les données sont utilisées pour :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Fournir les services de la Plateforme</li>
						<li>Traiter les commandes et paiements</li>
						<li>Assurer la sécurité et prévenir la fraude</li>
						<li>Envoyer des communications transactionnelles</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						10.3 Durée de conservation
					</h3>
					<p>
						Les données personnelles sont conservées pendant 3 ans après la
						dernière activité de l'utilisateur, conformément aux obligations
						légales.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						10.4 Droits des utilisateurs
					</h3>
					<p>
						Conformément au RGPD, les utilisateurs disposent des droits suivants
						:
					</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Droit d'accès et de rectification</li>
						<li>Droit à l'effacement (sous réserve des obligations légales)</li>
						<li>Droit à la portabilité</li>
						<li>Droit d'opposition</li>
					</ul>
					<p>
						Pour exercer ces droits, contactez : <a
							href="mailto:privacy@pattyly.com"
							class="text-blue-600 hover:text-blue-800">privacy@pattyly.com</a
						>
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						10.5 Cookies et tracking
					</h3>
					<p>La Plateforme utilise :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Cookies de session pour l'authentification</li>
						<li>PayPal pour la prévention de la fraude et les paiements</li>
						<li>Aucun cookie publicitaire ou de tracking tiers</li>
					</ul>
				</div>
			</section>

			<!-- Article 11 -->
			<section id="11">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					11. Suspension et résiliation
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						11.1 Suspension de compte
					</h3>
					<p>Un compte peut être suspendu en cas de :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Non-paiement de l'abonnement</li>
						<li>Violation des présentes CGU</li>
						<li>Tentative de fraude (version gratuite, paiements)</li>
						<li>Comportement inapproprié ou abusif</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						11.2 Résiliation
					</h3>
					<p>
						L'utilisateur peut résilier son compte à tout moment depuis son
						espace personnel.
					</p>
					<p>
						Pattyly peut résilier un compte avec un préavis de 30 jours, sauf en
						cas de violation grave des CGU.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						11.3 Conséquences de la résiliation
					</h3>
					<p>En cas de résiliation :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>L'accès à la Plateforme est immédiatement suspendu</li>
						<li>Les données sont conservées selon la durée légale</li>
						<li>Aucun remboursement n'est effectué</li>
					</ul>
				</div>
			</section>

			<!-- Article 12 -->
			<section id="12">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					12. Support et assistance
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						12.1 Support technique
					</h3>
					<p>Pattyly fournit un support technique aux Pâtissiers via :</p>
					<ul class="list-inside list-disc space-y-2">
						<li>
							Email : <a
								href="mailto:support@pattyly.com"
								class="text-blue-600 hover:text-blue-800">support@pattyly.com</a
							>
						</li>
						<li>Délai de réponse maximum : 72 heures</li>
						<li>Support en français uniquement</li>
					</ul>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						12.2 Support client
					</h3>
					<p>
						Le support client (litiges, remboursements, qualité des produits)
						est géré directement par les Pâtissiers.
					</p>
					<p>
						Pattyly ne s'implique pas dans les relations commerciales entre
						Pâtissiers et Clients.
					</p>
				</div>
			</section>

			<!-- Article 13 -->
			<section id="13">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					13. Disponibilité du service
				</h2>
				<div class="prose prose-gray max-w-none">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">
						13.1 Disponibilité
					</h3>
					<p>
						Pattyly s'efforce de maintenir la Plateforme disponible 24h/24,
						7j/7.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						13.2 Maintenance
					</h3>
					<p>
						Les maintenances programmées sont annoncées avec un préavis de 24
						heures minimum.
					</p>
					<p>
						Les maintenances d'urgence peuvent être effectuées sans préavis.
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						13.3 Interruptions
					</h3>
					<p>
						Pattyly ne peut être tenu responsable des interruptions de service
						dues à :
					</p>
					<ul class="list-inside list-disc space-y-2">
						<li>Maintenances nécessaires</li>
						<li>Pannes des fournisseurs tiers (Stripe, Supabase)</li>
						<li>Cas de force majeure (voir article 8.3)</li>
						<li>Cyberattaques ou problèmes de sécurité</li>
						<li>Décisions gouvernementales ou restrictions</li>
					</ul>
				</div>
			</section>

			<!-- Article 14 -->
			<section id="14">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					14. Modification des CGU
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Pattyly se réserve le droit de modifier les présentes CGU à tout
						moment.
					</p>

					<p>
						Les modifications importantes sont notifiées aux utilisateurs avec
						un préavis d'un mois minimum par email à l'adresse enregistrée.
					</p>

					<p class="font-semibold text-gray-900">
						L'utilisation continue de la Plateforme après notification vaut
						acceptation pleine et entière des nouvelles conditions.
					</p>

					<p>
						En cas de désaccord avec les modifications, l'utilisateur peut
						résilier son compte dans le délai de préavis. Aucun remboursement ne
						sera effectué pour les abonnements déjà payés, sauf en cas d'erreur
						technique imputable à Pattyly ou d'obligation légale contraire.
					</p>

					<p>
						Les modifications mineures (corrections typographiques,
						clarifications) peuvent être effectuées sans préavis et sont
						immédiatement applicables.
					</p>
				</div>
			</section>

			<!-- Article 15 -->
			<section id="15">
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					15. Droit applicable et juridiction
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>Les présentes CGU sont régies par le droit français.</p>

					<p>
						En cas de litige, les parties s'efforceront de trouver une solution
						amiable.
					</p>

					<p>
						À défaut d'accord amiable, les tribunaux français seront seuls
						compétents.
					</p>
				</div>
			</section>
		</div>
	</div>
</div>
