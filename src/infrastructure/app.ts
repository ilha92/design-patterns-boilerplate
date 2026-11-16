import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { emprunterExemplaire } from "../domains/useCase/borrowBookCopy";
import { inscrireAdherent } from "../domains/useCase/registerMember";
import { retournerExemplaire } from "../domains/useCase/returnBookCopy";
import { creerDependancesMemoire, type DependancesBibliotheque } from "./bibliothequeMemoire";

function estObjetJSON(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

export function creerApplication(
    dependances: DependancesBibliotheque = creerDependancesMemoire({
        exemplaires: [{ identifiant: "exemplaire-1", statut: "disponible" }],
    }),
): Express {
    const application = express();

    application.disable("x-powered-by");
    application.use(express.json());

    application.get("/health", (_requete, reponse) => {
        reponse.status(200).json({ status: "ok" });
    });

    application.post("/api/adherents", async (requete, reponse) => {
        const corps: unknown = requete.body;
        if (
            !estObjetJSON(corps) ||
            typeof corps.prenom !== "string" ||
            typeof corps.nom !== "string" ||
            typeof corps.courriel !== "string"
        ) {
            return reponse.status(400).json({ erreur: "prenom, nom et courriel sont requis sous forme de chaînes." });
        }

        const resultat = await inscrireAdherent(
            { prenom: corps.prenom, nom: corps.nom, courriel: corps.courriel },
            dependances,
        );

        if (resultat.type === "courriel-deja-enregistre") {
            return reponse.status(409).json({ erreur: resultat.type });
        }

        return reponse.status(201).json(resultat);
    });

    application.post("/api/emprunts", async (requete, reponse) => {
        const corps: unknown = requete.body;
        if (
            !estObjetJSON(corps) ||
            typeof corps.identifiantAdherent !== "string" ||
            typeof corps.identifiantExemplaire !== "string"
        ) {
            return reponse.status(400).json({ erreur: "identifiantAdherent et identifiantExemplaire sont requis." });
        }

        const resultat = await emprunterExemplaire(
            {
                identifiantAdherent: corps.identifiantAdherent,
                identifiantExemplaire: corps.identifiantExemplaire,
            },
            dependances,
        );

        switch (resultat.type) {
            case "emprunte":
                return reponse.status(201).json(resultat);
            case "adherent-introuvable":
            case "exemplaire-introuvable":
                return reponse.status(404).json({ erreur: resultat.type });
            case "limite-emprunts-atteinte":
            case "exemplaire-indisponible":
                return reponse.status(409).json({ erreur: resultat.type });
        }
    });

    application.post("/api/retours", async (requete, reponse) => {
        const corps: unknown = requete.body;
        if (!estObjetJSON(corps) || typeof corps.identifiantExemplaire !== "string") {
            return reponse.status(400).json({ erreur: "identifiantExemplaire est requis." });
        }

        const resultat = await retournerExemplaire(
            { identifiantExemplaire: corps.identifiantExemplaire },
            dependances,
        );

        if (resultat.type === "retourne") {
            return reponse.status(200).json(resultat);
        }

        return reponse.status(404).json({ erreur: resultat.type });
    });

    application.use(
        (erreur: unknown, _requete: Request, reponse: Response, _suite: NextFunction) => {
            console.error("Erreur pendant le traitement de la requête", erreur);
            return reponse.status(500).json({ erreur: "erreur-interne" });
        },
    );

    return application;
}

fetch("http://localhost:3000/api/adherents", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prenom: "Ada",
    nom: "Lovelace",
    courriel: "ada@example.com"
  })
}).then(r => r.json()).then(console.log);
