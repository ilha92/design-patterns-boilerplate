import { joursCalendairesEntre, type Emprunt, type IdentifiantExemplaire } from "../entities";
import type { DepotBibliotheque, Horloge } from "../repositories";

export interface RetournerExemplaireEntree {
    /** Identifiant de l'exemplaire physique rendu. */
    readonly identifiantExemplaire: IdentifiantExemplaire;
}

/** L'absence d'emprunt actif et d'exemplaire sont des refus métier ; les erreurs techniques sont propagées. */
export type RetournerExemplaireResultat =
    | { readonly type: "retourne"; readonly emprunt: Emprunt }
    | { readonly type: "aucun-emprunt-actif" }
    | { readonly type: "exemplaire-introuvable" };

export interface DependancesRetourExemplaire {
    readonly depotBibliotheque: DepotBibliotheque;
    readonly horloge: Horloge;
}

/**
 * Recherche l'emprunt actif. S'il n'y en a pas, renvoie aucun-emprunt-actif sans
 * modifier les données. Sinon, enregistre le retour, le retard et la disponibilité
 * de l'exemplaire dans la même transaction. Un retour tardif est toujours accepté.
 */
export function retournerExemplaire(
    entree: RetournerExemplaireEntree,
    dependances: DependancesRetourExemplaire,
): Promise<RetournerExemplaireResultat> {
    return dependances.depotBibliotheque.transaction(async ({ exemplaires, emprunts }) => {
        const empruntActif = await emprunts.rechercherEmpruntActifParExemplaire(entree.identifiantExemplaire);
        if (!empruntActif) {
            return { type: "aucun-emprunt-actif" };
        }

        const exemplaire = await exemplaires.rechercherParIdentifiant(entree.identifiantExemplaire);
        if (!exemplaire) {
            return { type: "exemplaire-introuvable" };
        }

        const retourneLe = dependances.horloge.dateDuJour();
        const emprunt: Emprunt = {
            ...empruntActif,
            retourneLe,
            joursDeRetard: Math.max(0, joursCalendairesEntre(empruntActif.retourPrevuLe, retourneLe)),
        };

        await emprunts.mettreAJour(emprunt);
        await exemplaires.enregistrer({ ...exemplaire, statut: "disponible" });

        return { type: "retourne", emprunt };
    });
}