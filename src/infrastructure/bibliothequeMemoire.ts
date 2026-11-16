import { randomUUID } from "node:crypto";
import type { Adherent, Emprunt, Exemplaire } from "../domains/entities";
import type {
	DepotBibliotheque,
	GenerateurIdentifiants,
	Horloge,
	UniteDeTravailBibliotheque,
} from "../domains/repositories";

export interface DonneesInitialesBibliotheque {
	readonly adherents?: readonly Adherent[];
	readonly exemplaires?: readonly Exemplaire[];
	readonly emprunts?: readonly Emprunt[];
}

export interface DependancesBibliotheque {
	readonly depotBibliotheque: DepotBibliotheque;
	readonly generateurIdentifiants: GenerateurIdentifiants;
	readonly horloge: Horloge;
}

interface EtatBibliotheque {
	adherents: Map<string, Adherent>;
	exemplaires: Map<string, Exemplaire>;
	emprunts: Map<string, Emprunt>;
}

function copierEtat(etat: EtatBibliotheque): EtatBibliotheque {
	return {
		adherents: new Map(etat.adherents),
		exemplaires: new Map(etat.exemplaires),
		emprunts: new Map(etat.emprunts),
	};
}

function creerUniteDeTravail(etat: EtatBibliotheque): UniteDeTravailBibliotheque {
	return {
		adherents: {
			rechercherParIdentifiant: async (identifiant) => etat.adherents.get(identifiant) ?? null,
			creerSiCourrielDisponible: async (adherent) => {
				const courrielDejaUtilise = [...etat.adherents.values()].some(
					(adherentEnregistre) => adherentEnregistre.courriel === adherent.courriel,
				);
				if (courrielDejaUtilise) {
					return false;
				}

				etat.adherents.set(adherent.identifiant, adherent);
				return true;
			},
		},
		exemplaires: {
			rechercherParIdentifiant: async (identifiant) => etat.exemplaires.get(identifiant) ?? null,
			enregistrer: async (exemplaire) => {
				etat.exemplaires.set(exemplaire.identifiant, exemplaire);
			},
		},
		emprunts: {
			compterActifsPourAdherent: async (identifiantAdherent) =>
				[...etat.emprunts.values()].filter(
					(emprunt) => emprunt.identifiantAdherent === identifiantAdherent && emprunt.retourneLe === null,
				).length,
			rechercherEmpruntActifParExemplaire: async (identifiantExemplaire) =>
				[...etat.emprunts.values()].find(
					(emprunt) => emprunt.identifiantExemplaire === identifiantExemplaire && emprunt.retourneLe === null,
				) ?? null,
			creer: async (emprunt) => {
				etat.emprunts.set(emprunt.identifiant, emprunt);
			},
			mettreAJour: async (emprunt) => {
				etat.emprunts.set(emprunt.identifiant, emprunt);
			},
		},
	};
}

function dateLocaleDuJour(): string {
	const date = new Date();
	const annee = date.getFullYear();
	const mois = String(date.getMonth() + 1).padStart(2, "0");
	const jour = String(date.getDate()).padStart(2, "0");

	return `${annee}-${mois}-${jour}`;
}

/** Crée des dépendances en mémoire ; les données sont perdues à l'arrêt du processus. */
export function creerDependancesMemoire(
	donneesInitiales: DonneesInitialesBibliotheque = {},
): DependancesBibliotheque {
	let etat: EtatBibliotheque = {
		adherents: new Map((donneesInitiales.adherents ?? []).map((adherent) => [adherent.identifiant, adherent])),
		exemplaires: new Map(
			(donneesInitiales.exemplaires ?? []).map((exemplaire) => [exemplaire.identifiant, exemplaire]),
		),
		emprunts: new Map((donneesInitiales.emprunts ?? []).map((emprunt) => [emprunt.identifiant, emprunt])),
	};
	let finDeTransactionPrecedente: Promise<void> = Promise.resolve();

	const depotBibliotheque: DepotBibliotheque = {
		transaction: async (operation) => {
			const transactionPrecedente = finDeTransactionPrecedente;
			let terminerTransaction!: () => void;
			finDeTransactionPrecedente = new Promise<void>((resolve) => {
				terminerTransaction = resolve;
			});
			await transactionPrecedente;

			const prochainEtat = copierEtat(etat);
			try {
				const resultat = await operation(creerUniteDeTravail(prochainEtat));
				etat = prochainEtat;
				return resultat;
			} finally {
				terminerTransaction();
			}
		},
	};

	const generateurIdentifiants: GenerateurIdentifiants = {
		nouvelIdentifiantAdherent: () => randomUUID(),
		nouvelIdentifiantEmprunt: () => randomUUID(),
	};
	const horloge: Horloge = { dateDuJour: dateLocaleDuJour };

	return { depotBibliotheque, generateurIdentifiants, horloge };
}