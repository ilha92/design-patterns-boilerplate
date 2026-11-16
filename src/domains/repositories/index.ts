import type {
	Adherent,
	DateCalendrier,
	Emprunt,
	Exemplaire,
	IdentifiantAdherent,
	IdentifiantEmprunt,
	IdentifiantExemplaire,
} from "../entities";

export interface DepotAdherents {
	/** Renvoie l'adhérent associé à cet identifiant, ou null s'il n'existe pas. */
	rechercherParIdentifiant(identifiant: IdentifiantAdherent): Promise<Adherent | null>;
	/**
	 * Crée l'adhérent de façon atomique si aucun adhérent n'a exactement le même
	 * courriel. La comparaison respecte la casse et ne supprime ni n'uniformise
	 * aucun caractère. Renvoie false sans écrire si le courriel existe déjà.
	 */
	creerSiCourrielDisponible(adherent: Adherent): Promise<boolean>;
}

export interface DepotExemplaires {
	/** Renvoie l'exemplaire associé à cet identifiant, ou null s'il n'existe pas. */
	rechercherParIdentifiant(identifiant: IdentifiantExemplaire): Promise<Exemplaire | null>;
	/** Enregistre l'exemplaire fourni, y compris son statut de disponibilité. */
	enregistrer(exemplaire: Exemplaire): Promise<void>;
}

export interface DepotEmprunts {
	/** Compte les emprunts de cet adhérent dont retourneLe vaut null. */
	compterActifsPourAdherent(identifiantAdherent: IdentifiantAdherent): Promise<number>;
	/** Renvoie l'emprunt actif de cet exemplaire (retourneLe vaut null), ou null s'il n'y en a pas. */
	rechercherEmpruntActifParExemplaire(identifiantExemplaire: IdentifiantExemplaire): Promise<Emprunt | null>;
	creer(emprunt: Emprunt): Promise<void>;
	mettreAJour(emprunt: Emprunt): Promise<void>;
}

export interface UniteDeTravailBibliotheque {
	readonly adherents: DepotAdherents;
	readonly exemplaires: DepotExemplaires;
	readonly emprunts: DepotEmprunts;
}

export interface DepotBibliotheque {
	/**
	 * Exécute l'opération avec une isolation sérialisable : plusieurs opérations
	 * concurrentes doivent produire le même résultat que si elles s'exécutaient
	 * l'une après l'autre. Les écritures sont validées ensemble si l'opération
	 * réussit, et annulées ensemble si elle lève une erreur. Un refus métier renvoyé
	 * comme résultat est une réussite technique ; le chemin de refus ne doit rien écrire.
	 */
	transaction<T>(operation: (uniteDeTravail: UniteDeTravailBibliotheque) => Promise<T>): Promise<T>;
}

export interface Horloge {
	/** Renvoie la date du jour au format AAAA-MM-JJ dans le fuseau local de la bibliothèque. */
	dateDuJour(): DateCalendrier;
}

export interface GenerateurIdentifiants {
	/** Renvoie un identifiant qui n'est utilisé par aucun autre adhérent. */
	nouvelIdentifiantAdherent(): IdentifiantAdherent;
	/** Renvoie un identifiant qui n'est utilisé par aucun autre emprunt. */
	nouvelIdentifiantEmprunt(): IdentifiantEmprunt;
}
