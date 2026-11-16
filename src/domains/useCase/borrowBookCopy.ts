import { ajouterJoursCalendaires, type Emprunt, type IdentifiantAdherent, type IdentifiantExemplaire } from "../entities";
import type { DepotBibliotheque, GenerateurIdentifiants, Horloge } from "../repositories";

export interface EmprunterExemplaireEntree {
    readonly identifiantAdherent: IdentifiantAdherent;
    readonly identifiantExemplaire: IdentifiantExemplaire;
}

/** Les refus métier sont renvoyés comme résultats ; une erreur technique rejette executer(). */
export type EmprunterExemplaireResultat =
    | { readonly type: "emprunte"; readonly emprunt: Emprunt }
    | { readonly type: "adherent-introuvable" }
    | { readonly type: "limite-emprunts-atteinte"; readonly maximum: 3 }
    | { readonly type: "exemplaire-introuvable" }
    | { readonly type: "exemplaire-indisponible" };

export interface DependancesEmpruntExemplaire {
    readonly depotBibliotheque: DepotBibliotheque;
    readonly horloge: Horloge;
    readonly generateurIdentifiants: GenerateurIdentifiants;
}

export function emprunterExemplaire(
    entree: EmprunterExemplaireEntree,
    dependances: DependancesEmpruntExemplaire,
): Promise<EmprunterExemplaireResultat> {
    return dependances.depotBibliotheque.transaction(async ({ adherents, exemplaires, emprunts }) => {
        if (!(await adherents.rechercherParIdentifiant(entree.identifiantAdherent))) {
            return { type: "adherent-introuvable" };
        }

        if ((await emprunts.compterActifsPourAdherent(entree.identifiantAdherent)) >= 3) {
            return { type: "limite-emprunts-atteinte", maximum: 3 };
        }

        const exemplaire = await exemplaires.rechercherParIdentifiant(entree.identifiantExemplaire);
        if (!exemplaire) {
            return { type: "exemplaire-introuvable" };
        }

        if (exemplaire.statut !== "disponible") {
            return { type: "exemplaire-indisponible" };
        }

        const emprunteLe = dependances.horloge.dateDuJour();
        const emprunt: Emprunt = {
            identifiant: dependances.generateurIdentifiants.nouvelIdentifiantEmprunt(),
            identifiantAdherent: entree.identifiantAdherent,
            identifiantExemplaire: exemplaire.identifiant,
            emprunteLe,
            retourPrevuLe: ajouterJoursCalendaires(emprunteLe, 14),
            retourneLe: null,
            joursDeRetard: null,
        };

        await exemplaires.enregistrer({ ...exemplaire, statut: "emprunte" });
        await emprunts.creer(emprunt);

        return { type: "emprunte", emprunt };
    });
}