import type { Adherent } from "../entities";
import type { DepotBibliotheque, GenerateurIdentifiants } from "../repositories";

export interface InscrireAdherentEntree {
    readonly prenom: string;
    readonly nom: string;
    readonly courriel: string;
}

export type InscrireAdherentResultat =
    | { readonly type: "inscrit"; readonly adherent: Adherent }
    | { readonly type: "courriel-deja-enregistre" };

export interface DependancesInscriptionAdherent {
    readonly depotBibliotheque: DepotBibliotheque;
    readonly generateurIdentifiants: GenerateurIdentifiants;
}

/** Crée l'adhérent, sauf si son courriel exact est déjà utilisé. */
export function inscrireAdherent(
    entree: InscrireAdherentEntree,
    dependances: DependancesInscriptionAdherent,
): Promise<InscrireAdherentResultat> {
    return dependances.depotBibliotheque.transaction(async ({ adherents }) => {
        const adherent: Adherent = {
            identifiant: dependances.generateurIdentifiants.nouvelIdentifiantAdherent(),
            prenom: entree.prenom,
            nom: entree.nom,
            courriel: entree.courriel,
        };

        if (!(await adherents.creerSiCourrielDisponible(adherent))) {
            return { type: "courriel-deja-enregistre" };
        }

        return { type: "inscrit", adherent };
    });
}