export type IdentifiantAdherent = string;
export type IdentifiantExemplaire = string;
export type IdentifiantEmprunt = string;

/** Date calendaire au format AAAA-MM-JJ, sans heure ni fuseau horaire. */
export type DateCalendrier = string;

export interface Adherent {
	readonly identifiant: IdentifiantAdherent;
	readonly prenom: string;
	readonly nom: string;
	readonly courriel: string;
}

export type StatutExemplaire = "disponible" | "emprunte";

export interface Exemplaire {
	readonly identifiant: IdentifiantExemplaire;
	readonly statut: StatutExemplaire;
}

export interface Emprunt {
	readonly identifiant: IdentifiantEmprunt;
	readonly identifiantAdherent: IdentifiantAdherent;
	readonly identifiantExemplaire: IdentifiantExemplaire;
	readonly emprunteLe: DateCalendrier;
	readonly retourPrevuLe: DateCalendrier;
	readonly retourneLe: DateCalendrier | null;
	readonly joursDeRetard: number | null;
}

function analyserDateCalendrier(date: DateCalendrier): Date {
	const dateAnalysee = new Date(`${date}T00:00:00.000Z`);

	if (Number.isNaN(dateAnalysee.getTime()) || dateAnalysee.toISOString().slice(0, 10) !== date) {
		throw new Error(`Date calendaire invalide : ${date}`);
	}

	return dateAnalysee;
}

export function ajouterJoursCalendaires(date: DateCalendrier, nombreDeJours: number): DateCalendrier {
	return new Date(analyserDateCalendrier(date).getTime() + nombreDeJours * 86_400_000)
		.toISOString()
		.slice(0, 10);
}

export function joursCalendairesEntre(debut: DateCalendrier, fin: DateCalendrier): number {
	return Math.floor(
		(analyserDateCalendrier(fin).getTime() - analyserDateCalendrier(debut).getTime()) / 86_400_000,
	);
}
