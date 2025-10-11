<script lang="ts">
	import { page } from '$app/stores';

	// SEO
	$: page.meta = {
		title: 'Mentions Légales - Pattyly',
		description:
			"Mentions légales de la plateforme Pattyly - Informations sur l'éditeur, l'hébergeur et les conditions d'utilisation.",
		keywords: 'mentions légales, éditeur, hébergeur, SIRET, entreprise',
	};
</script>

<svelte:head>
	<title>Mentions Légales - Pattyly</title>
	<meta
		name="description"
		content="Mentions légales de la plateforme Pattyly - Informations sur l'éditeur, l'hébergeur et les conditions d'utilisation."
	/>
</svelte:head>

<div class="min-h-screen bg-white">
	<div class="container mx-auto max-w-4xl px-4 pb-12 pt-24">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold text-gray-900">Mentions Légales</h1>
			<p class="text-lg text-gray-600">
				Plateforme Pattyly - Dernière mise à jour : {new Date().toLocaleDateString(
					'fr-FR',
				)}
			</p>
		</div>

		<!-- Contenu -->
		<div class="space-y-8">
			<!-- Éditeur -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					1. Éditeur du site
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						<strong>Raison sociale :</strong> Boubacar Maiga - Micro-entreprise
					</p>
					<p>
						<strong>Forme juridique :</strong> Micro-entreprise (auto-entrepreneur)
					</p>
					<p>
						<strong>Capital social :</strong> Non applicable
					</p>
					<p>
						<strong>Code APE/NAF :</strong> 62.01Z - Conseil en systèmes et logiciels
						informatiques
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						Siège social :
					</h3>
					<address class="not-italic">
						45 Résidence du Parc Le Nôtre<br />
						95310 Saint-Ouen-l'Aumône<br />
						France
					</address>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						Contact :
					</h3>
					<p>
						<strong>Email :</strong>
						<a
							href="mailto:contact@pattyly.com"
							class="text-blue-600 hover:text-blue-800">contact@pattyly.com</a
						>
					</p>
					<p>
						<strong>Téléphone :</strong> 07 67 76 21 72
					</p>
					<p>
						<strong>Support :</strong>
						<a
							href="mailto:support@pattyly.com"
							class="text-blue-600 hover:text-blue-800">support@pattyly.com</a
						>
					</p>
					<p>
						<strong>Légal :</strong>
						<a
							href="mailto:legal@pattyly.com"
							class="text-blue-600 hover:text-blue-800">legal@pattyly.com</a
						>
					</p>
				</div>
			</section>

			<!-- Directeur de publication -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					2. Directeur de publication
				</h2>
				<div class="prose prose-gray max-w-none">
					<p><strong>Nom :</strong> Boubacar Maiga</p>
					<p>
						<strong>Qualité :</strong> Auto-entrepreneur
					</p>
				</div>
			</section>

			<!-- Hébergeur -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">3. Hébergeur</h2>
				<div class="prose prose-gray max-w-none">
					<p><strong>Nom :</strong> Cloudflare, Inc.</p>
					<p>
						<strong>Adresse :</strong> 101 Townsend St, San Francisco, CA 94107,
						États-Unis
					</p>
					<p>
						<strong>Site web :</strong>
						<a
							href="https://www.cloudflare.com"
							target="_blank"
							class="text-blue-600 hover:text-blue-800">www.cloudflare.com</a
						>
					</p>
					<p><strong>Téléphone :</strong> +1 (650) 319-8930</p>
				</div>
			</section>

			<!-- Base de données -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					4. Base de données et stockage
				</h2>
				<div class="prose prose-gray max-w-none">
					<p><strong>Base de données :</strong> Supabase (PostgreSQL)</p>
					<p><strong>Fournisseur :</strong> Supabase, Inc.</p>
					<p>
						<strong>Adresse :</strong> 970 Toa Payoh North #07-04, Singapore 318992
					</p>
					<p>
						<strong>Site web :</strong>
						<a
							href="https://supabase.com"
							target="_blank"
							class="text-blue-600 hover:text-blue-800">supabase.com</a
						>
					</p>

					<h3 class="mb-2 mt-6 text-lg font-semibold text-gray-900">
						Stockage des fichiers :
					</h3>
					<p><strong>Service :</strong> Supabase Storage</p>
					<p><strong>Localisation :</strong> Europe (conformité RGPD)</p>
				</div>
			</section>

			<!-- Paiements -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					5. Services de paiement
				</h2>
				<div class="prose prose-gray max-w-none">
					<p><strong>Processeur de paiement :</strong> Stripe, Inc.</p>
					<p>
						<strong>Adresse :</strong> 510 Townsend Street, San Francisco, CA 94103,
						États-Unis
					</p>
					<p>
						<strong>Site web :</strong>
						<a
							href="https://stripe.com"
							target="_blank"
							class="text-blue-600 hover:text-blue-800">stripe.com</a
						>
					</p>
					<p><strong>Conformité :</strong> PCI DSS Level 1</p>
					<p>
						<strong>Licence :</strong> Prestataire de services de paiement agréé
					</p>
				</div>
			</section>

			<!-- Emails -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					6. Service d'envoi d'emails
				</h2>
				<div class="prose prose-gray max-w-none">
					<p><strong>Service :</strong> Resend</p>
					<p><strong>Fournisseur :</strong> Resend, Inc.</p>
					<p>
						<strong>Site web :</strong>
						<a
							href="https://resend.com"
							target="_blank"
							class="text-blue-600 hover:text-blue-800">resend.com</a
						>
					</p>
					<p><strong>Type :</strong> Emails transactionnels uniquement</p>
				</div>
			</section>

			<!-- Propriété intellectuelle -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					7. Propriété intellectuelle
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						L'ensemble de ce site relève de la législation française et
						internationale sur le droit d'auteur et la propriété intellectuelle.
						Tous les droits de reproduction sont réservés, y compris pour les
						documents téléchargeables et les représentations iconographiques et
						photographiques.
					</p>
					<p>
						La reproduction de tout ou partie de ce site sur un support
						électronique quel qu'il soit est formellement interdite sauf
						autorisation expresse du directeur de la publication.
					</p>
					<p>
						La marque "Pattyly" et le logo associé sont des marques déposées.
						Toute reproduction non autorisée de ces marques constitue une
						contrefaçon passible de sanctions pénales.
					</p>
				</div>
			</section>

			<!-- Responsabilité -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					8. Limitation de responsabilité
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Les informations contenues sur ce site sont aussi précises que
						possible et le site remis à jour à différentes périodes de l'année,
						mais peut néanmoins contenir des inexactitudes ou des omissions.
					</p>
					<p>
						Si vous constatez une lacune, erreur ou ce qui parait être un
						mauvais fonctionnement, merci de bien vouloir le signaler par email,
						à l'adresse contact@pattyly.com, en décrivant le problème de la
						manière la plus précise possible.
					</p>
					<p>
						Tout contenu téléchargé se fait aux risques et périls de
						l'utilisateur et sous sa seule responsabilité. En conséquence, ne
						saurait être tenu responsable d'un quelconque dommage subi par
						l'ordinateur de l'utilisateur ou d'une quelconque perte de données
						consécutives au téléchargement.
					</p>
				</div>
			</section>

			<!-- Liens hypertextes -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					9. Liens hypertextes
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Des liens hypertextes peuvent être présents sur le site.
						L'utilisateur est informé qu'en cliquant sur ces liens, il sortira
						du site pattyly.com. Ce dernier n'a pas de contrôle sur les pages
						web sur lesquelles aboutissent ces liens et ne saurait en aucun cas
						être responsable de leur contenu.
					</p>
				</div>
			</section>

			<!-- Cookies -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">10. Cookies</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Le site pattyly.com peut être amené à vous demander l'acceptation
						des cookies pour des besoins de statistiques et d'affichage. Un
						cookie est une information déposée sur votre disque dur par le
						serveur du site que vous visitez.
					</p>
					<p>
						Il contient plusieurs données qui sont stockées sur votre ordinateur
						dans un simple fichier texte auquel un serveur accède pour lire et
						enregistrer des informations. Certaines parties de ce site ne
						peuvent être fonctionnelles sans l'acceptation de cookies.
					</p>
					<p>
						Pour plus d'informations, consultez notre
						<a href="/privacy" class="text-blue-600 hover:text-blue-800"
							>Politique de confidentialité</a
						>.
					</p>
				</div>
			</section>

			<!-- Droit applicable -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">
					11. Droit applicable et juridiction
				</h2>
				<div class="prose prose-gray max-w-none">
					<p>
						Tout litige en relation avec l'utilisation du site pattyly.com est
						soumis au droit français. Il est fait attribution exclusive de
						juridiction aux tribunaux compétents de [À compléter - Ville du
						tribunal].
					</p>
				</div>
			</section>
		</div>
	</div>
</div>
